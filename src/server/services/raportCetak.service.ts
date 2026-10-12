import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { siswa, rombel, guru, mapel, nilaiAkhir, academicPeriods } from "../db/schema";
import { getRaportKelasKonteks } from "./raportKelas.service";
import { getSchoolProfile, getBranding } from "./settings.service";
import { getOrCreateRaportPengaturan } from "./raportPengaturan.service";
import { isRombelTerkunci } from "./raportKunciRombel.service";
import { SEMESTER_LABELS } from "../../shared/constants";
import type { MapelStrukturNode } from "../../shared/raportCetak";
import type { RaportCetakKonteks, RaportCetakSiswa } from "../../shared/types";

async function getMapelStruktur(db: Database): Promise<MapelStrukturNode[]> {
  const rows = await db.query.mapel.findMany({
    where: and(isNull(mapel.deleted_at), eq(mapel.is_active, true), eq(mapel.tampil_raport, true)),
    orderBy: [asc(mapel.urutan_raport)],
  });

  const anakByInduk = new Map<string, { id: string; nama: string; urutan: number }[]>();
  for (const m of rows) {
    if (!m.induk_mapel_id) continue;
    const arr = anakByInduk.get(m.induk_mapel_id) ?? [];
    arr.push({ id: m.id, nama: m.nama, urutan: m.urutan_raport });
    anakByInduk.set(m.induk_mapel_id, arr);
  }

  return rows
    .filter((m) => !m.induk_mapel_id)
    .map((m) => ({ id: m.id, nama: m.nama, urutan: m.urutan_raport, anak: anakByInduk.get(m.id) ?? [] }));
}

export async function getRaportCetakKonteks(db: Database, periodId: string, rombelId: string): Promise<RaportCetakKonteks> {
  const [rombelRow, periode] = await Promise.all([
    db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) }),
    db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) }),
  ]);
  if (!rombelRow) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });
  if (!periode) throw new HTTPException(400, { message: "Periode tidak ditemukan." });

  const [konteksKelas, sekolah, branding, pengaturan, terkunci, mapelStruktur, waliRow] = await Promise.all([
    getRaportKelasKonteks(db, periodId, rombelId),
    getSchoolProfile(db),
    getBranding(db),
    getOrCreateRaportPengaturan(db, periodId),
    isRombelTerkunci(db, periodId, rombelId),
    getMapelStruktur(db),
    rombelRow.wali_guru_id ? db.query.guru.findFirst({ where: eq(guru.id, rombelRow.wali_guru_id) }) : Promise.resolve(null),
  ]);

  const siswaIds = konteksKelas.rows.map((r) => r.siswaId);
  const [siswaIdentitasRows, nilaiRows] = await Promise.all([
    siswaIds.length
      ? db.select({ id: siswa.id, nis: siswa.nis, nisn: siswa.nisn }).from(siswa).where(sql`${siswa.id} IN ${siswaIds}`)
      : Promise.resolve([]),
    siswaIds.length
      ? db
          .select({ siswaId: nilaiAkhir.siswa_id, mapelId: nilaiAkhir.mapel_id, nilai: nilaiAkhir.nilai_akhir, deskripsi: nilaiAkhir.deskripsi })
          .from(nilaiAkhir)
          .where(and(eq(nilaiAkhir.period_id, periodId), eq(nilaiAkhir.rombel_id, rombelId), sql`${nilaiAkhir.siswa_id} IN ${siswaIds}`))
      : Promise.resolve([]),
  ]);

  const identitasBySiswa = new Map(siswaIdentitasRows.map((s) => [s.id, s]));
  const nilaiBySiswa = new Map<string, Record<string, { nilai: number | null; deskripsi: string | null }>>();
  for (const r of nilaiRows) {
    const m = nilaiBySiswa.get(r.siswaId) ?? {};
    m[r.mapelId] = { nilai: r.nilai, deskripsi: r.deskripsi };
    nilaiBySiswa.set(r.siswaId, m);
  }

  const siswaCetak: RaportCetakSiswa[] = konteksKelas.rows.map((row) => {
    const identitas = identitasBySiswa.get(row.siswaId);
    const nilaiMapel = nilaiBySiswa.get(row.siswaId) ?? {};
    return {
      ...row,
      nis: identitas?.nis ?? "",
      nisn: identitas?.nisn ?? "",
      nilaiPerMapel: Object.fromEntries(Object.entries(nilaiMapel).map(([k, v]) => [k, v.nilai])),
      deskripsiPerMapel: Object.fromEntries(Object.entries(nilaiMapel).map(([k, v]) => [k, v.deskripsi])),
    };
  });

  return {
    sekolah: {
      nama: sekolah.nama,
      alamat: sekolah.alamat,
      logoFileId: branding.logo_file_id,
      kopFileId: branding.kop_file_id,
      kepalaSekolahNama: sekolah.kepala_sekolah_nama,
      kepalaSekolahNip: sekolah.kepala_sekolah_nip,
    },
    rombel: {
      id: rombelRow.id,
      nama: rombelRow.nama,
      tingkat: rombelRow.tingkat,
      fase: pengaturan.fasePerTingkat[rombelRow.tingkat],
      waliNama: waliRow?.nama_lengkap ?? null,
      waliNip: waliRow?.nip ?? null,
    },
    periode: {
      yearLabel: periode.year_label,
      semesterLabel: SEMESTER_LABELS[periode.semester],
      semesterGenap: periode.semester === "GENAP",
    },
    pengaturan: {
      tempatRaport: pengaturan.tempatRaport,
      tanggalRaport: pengaturan.tanggalRaport,
      tampilkanPeringkat: pengaturan.tampilkanPeringkat,
    },
    mapelStruktur,
    terkunci,
    siswa: siswaCetak,
  };
}
