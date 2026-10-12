import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  siswa,
  siswaKelas,
  rombel,
  academicPeriods,
  pembagianTugas,
  nilaiAkhir,
  ekskul,
  ekskulNilai,
  raportSiswa,
  legerPeringkat,
} from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { getRekapSemesterRombel } from "./rekapAbsensi.service";
import { getPrestasiRaportBatch } from "./prestasi.service";
import { getOrCreateRaportPengaturan } from "./raportPengaturan.service";
import { isRombelTerkunci, kunciRombel, bukaKunciRombel } from "./raportKunciRombel.service";
import { buildKeteranganEkskulDefault } from "../../shared/raportSiswa";
import type {
  SaveEkskulNilaiInput,
  SaveKehadiranOverrideInput,
  SaveCatatanPendidikInput,
  SaveKenaikanKelasInput,
} from "../../shared/schemas/raportKelas.schema";
import type { AuthUser, RaportKelasKonteks, KekuranganFinalisasi } from "../../shared/types";
import type { PermissionScope, EkskulPredikat } from "../../shared/constants";
import { getWaliRombelIds } from "./scope.service";

async function isPembinaEkskulAktif(db: Database, guruId: string | null): Promise<boolean> {
  if (!guruId) return false;
  const row = await db.query.ekskul.findFirst({ where: and(eq(ekskul.pembina_guru_id, guruId), eq(ekskul.aktif, true)) });
  return !!row;
}

/** Baca: wali rombel itu, ATAU pembina ekskul apa pun (perlu lihat seluruh rombel untuk cari siswa binaannya), ATAU scope semua. */
export async function assertBisaLihatRombel(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
  rombelId: string,
): Promise<void> {
  if (scope === "semua") return;
  const waliRombelIds = user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : [];
  if (waliRombelIds.includes(rombelId)) return;
  if (await isPembinaEkskulAktif(db, user.guruId)) return;
  throw new HTTPException(403, { message: "Anda tidak punya akses ke rombel ini." });
}

/** Tulis (kehadiran/catatan/kenaikan/finalisasi): wajib wali rombel itu, kecuali scope semua. */
export async function assertWaliRombel(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
  rombelId: string,
): Promise<void> {
  if (scope === "semua") return;
  const waliRombelIds = user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : [];
  if (!waliRombelIds.includes(rombelId)) {
    throw new HTTPException(403, { message: "Hanya wali kelas rombel ini yang bisa mengisi bagian ini." });
  }
}

/** Tulis nilai ekskul: wali rombel ITU, ATAU pembina ekskul yang bersangkutan, kecuali scope semua. */
export async function assertBisaIsiEkskul(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
  rombelId: string,
  ekskulId: string,
): Promise<void> {
  if (scope === "semua") return;
  const waliRombelIds = user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : [];
  if (waliRombelIds.includes(rombelId)) return;

  const ekskulRow = await db.query.ekskul.findFirst({ where: eq(ekskul.id, ekskulId) });
  if (ekskulRow && user.guruId && ekskulRow.pembina_guru_id === user.guruId) return;

  throw new HTTPException(403, { message: "Anda bukan wali rombel ini maupun pembina ekskul tersebut." });
}

async function hitungJumlahMapelBelumNilai(db: Database, periodId: string, rombelId: string, siswaIds: string[]) {
  const mapelRows = await db
    .select({ mapelId: pembagianTugas.mapel_id })
    .from(pembagianTugas)
    .where(and(eq(pembagianTugas.period_id, periodId), eq(pembagianTugas.rombel_id, rombelId)))
    .groupBy(pembagianTugas.mapel_id);
  const totalMapel = mapelRows.length;
  if (totalMapel === 0 || siswaIds.length === 0) return { totalMapel, terisiBySiswa: new Map<string, number>() };

  const nilaiRows = await db
    .select({ siswaId: nilaiAkhir.siswa_id })
    .from(nilaiAkhir)
    .where(
      and(
        eq(nilaiAkhir.period_id, periodId),
        eq(nilaiAkhir.rombel_id, rombelId),
        sql`${nilaiAkhir.siswa_id} IN ${siswaIds}`,
        sql`${nilaiAkhir.nilai_akhir} IS NOT NULL`,
      ),
    );
  const terisiBySiswa = new Map<string, number>();
  for (const r of nilaiRows) terisiBySiswa.set(r.siswaId, (terisiBySiswa.get(r.siswaId) ?? 0) + 1);
  return { totalMapel, terisiBySiswa };
}

export async function getRaportKelasKonteks(db: Database, periodId: string, rombelId: string): Promise<RaportKelasKonteks> {
  const [rombelRow, periode] = await Promise.all([
    db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) }),
    db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) }),
  ]);
  if (!rombelRow) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });
  if (!periode) throw new HTTPException(400, { message: "Periode tidak ditemukan." });

  const [siswaRows, pengaturan, terkunci, ekskulAktifRows, bankKalimatRows] = await Promise.all([
    db
      .select({ id: siswa.id, nama: siswa.nama_lengkap, namaPanggilan: siswa.nama_panggilan, nomorAbsen: siswaKelas.nomor_absen })
      .from(siswaKelas)
      .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
      .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)))
      .orderBy(siswaKelas.nomor_absen),
    getOrCreateRaportPengaturan(db, periodId),
    isRombelTerkunci(db, periodId, rombelId),
    db.query.ekskul.findMany({ where: eq(ekskul.aktif, true) }),
    db.query.catatanTemplate.findMany(),
  ]);

  const siswaIds = siswaRows.map((s) => s.id);
  const { totalMapel, terisiBySiswa } = await hitungJumlahMapelBelumNilai(db, periodId, rombelId, siswaIds);

  const [ekskulNilaiRows, prestasiBySiswa, kehadiranRows, peringkatRows, raportSiswaRows] = await Promise.all([
    siswaIds.length
      ? db
          .select({
            siswaId: ekskulNilai.siswa_id,
            ekskulId: ekskulNilai.ekskul_id,
            ekskulNama: ekskul.nama,
            predikat: ekskulNilai.predikat,
            keterangan: ekskulNilai.keterangan,
          })
          .from(ekskulNilai)
          .innerJoin(ekskul, eq(ekskul.id, ekskulNilai.ekskul_id))
          .where(and(eq(ekskulNilai.period_id, periodId), sql`${ekskulNilai.siswa_id} IN ${siswaIds}`))
      : Promise.resolve([]),
    getPrestasiRaportBatch(db, siswaIds, periodId),
    getRekapSemesterRombel(db, rombelId, periodId),
    siswaIds.length
      ? db
          .select({ siswaId: legerPeringkat.siswa_id, peringkat: legerPeringkat.peringkat })
          .from(legerPeringkat)
          .where(and(eq(legerPeringkat.period_id, periodId), eq(legerPeringkat.rombel_id, rombelId)))
      : Promise.resolve([]),
    siswaIds.length
      ? db
          .select()
          .from(raportSiswa)
          .where(and(eq(raportSiswa.period_id, periodId), sql`${raportSiswa.siswa_id} IN ${siswaIds}`))
      : Promise.resolve([]),
  ]);

  const ekskulBySiswa = new Map<string, { ekskulId: string; ekskulNama: string; predikat: EkskulPredikat; keterangan: string | null }[]>();
  for (const r of ekskulNilaiRows) {
    const arr = ekskulBySiswa.get(r.siswaId) ?? [];
    arr.push(r);
    ekskulBySiswa.set(r.siswaId, arr);
  }
  const kehadiranBySiswa = new Map(kehadiranRows.map((r) => [r.siswaId, r]));
  const peringkatBySiswa = new Map(peringkatRows.map((r) => [r.siswaId, r.peringkat]));
  const raportSiswaBySiswa = new Map(raportSiswaRows.map((r) => [r.siswa_id, r]));
  const totalSiswa = siswaRows.length;

  return {
    rombelId: rombelRow.id,
    rombelNama: rombelRow.nama,
    tingkat: rombelRow.tingkat,
    semesterGenap: periode.semester === "GENAP",
    tampilkanPeringkat: pengaturan.tampilkanPeringkat,
    terkunci,
    ekskulAktif: ekskulAktifRows.map((e) => ({ id: e.id, nama: e.nama })),
    bankKalimat: bankKalimatRows.map((b) => ({ id: b.id, teks: b.teks })),
    rows: siswaRows.map((s) => {
      const kehadiran = kehadiranBySiswa.get(s.id);
      const rs = raportSiswaBySiswa.get(s.id);
      const peringkat = peringkatBySiswa.get(s.id);
      const jumlahTerisi = terisiBySiswa.get(s.id) ?? 0;
      return {
        siswaId: s.id,
        namaLengkap: s.nama,
        namaPanggilan: s.namaPanggilan,
        nomorAbsen: s.nomorAbsen,
        nilaiLengkap: totalMapel > 0 && jumlahTerisi >= totalMapel,
        jumlahMapelBelumNilai: Math.max(0, totalMapel - jumlahTerisi),
        ekskul: (ekskulBySiswa.get(s.id) ?? []).map((e) => ({
          ekskulId: e.ekskulId,
          ekskulNama: e.ekskulNama,
          predikat: e.predikat,
          keterangan: e.keterangan,
        })),
        prestasiRaport: prestasiBySiswa.get(s.id) ?? [],
        peringkat: peringkat !== undefined ? { peringkat, totalSiswa } : null,
        kehadiranOtomatis: { sakit: kehadiran?.totalS ?? 0, izin: kehadiran?.totalI ?? 0, alpa: kehadiran?.totalA ?? 0 },
        overrideSakit: rs?.override_sakit ?? null,
        overrideIzin: rs?.override_izin ?? null,
        overrideAlpa: rs?.override_alpa ?? null,
        alasanOverrideKehadiran: rs?.alasan_override_kehadiran ?? null,
        catatanPendidik: rs?.catatan_pendidik ?? null,
        keteranganKenaikan: rs?.keterangan_kenaikan ?? null,
        kenaikanKeKelas: rs?.kenaikan_ke_kelas ?? null,
        status: rs?.status ?? "draf",
        kodeVerifikasi: rs?.kode_verifikasi ?? null,
      };
    }),
  };
}

async function upsertRaportSiswa(
  db: Database,
  periodId: string,
  siswaId: string,
  rombelId: string,
  patch: Partial<{
    catatan_pendidik: string | null;
    keterangan_kenaikan: "naik" | "tidak_naik" | "lulus" | null;
    kenaikan_ke_kelas: string | null;
    override_sakit: number | null;
    override_izin: number | null;
    override_alpa: number | null;
    alasan_override_kehadiran: string | null;
  }>,
): Promise<void> {
  const existing = await db.query.raportSiswa.findFirst({
    where: and(eq(raportSiswa.period_id, periodId), eq(raportSiswa.siswa_id, siswaId)),
  });
  const now = new Date().toISOString();
  if (existing) {
    await db.update(raportSiswa).set({ ...patch, updated_at: now }).where(eq(raportSiswa.id, existing.id));
  } else {
    await db.insert(raportSiswa).values({
      id: generateId(),
      period_id: periodId,
      siswa_id: siswaId,
      rombel_id: rombelId,
      status: "draf",
      created_at: now,
      updated_at: now,
      ...patch,
    });
  }
}

export async function saveEkskulNilai(db: Database, periodId: string, input: SaveEkskulNilaiInput): Promise<void> {
  const ekskulRow = await db.query.ekskul.findFirst({ where: eq(ekskul.id, input.ekskulId) });
  if (!ekskulRow) throw new HTTPException(404, { message: "Ekskul tidak ditemukan." });

  const existing = await db.query.ekskulNilai.findFirst({
    where: and(eq(ekskulNilai.period_id, periodId), eq(ekskulNilai.siswa_id, input.siswaId), eq(ekskulNilai.ekskul_id, input.ekskulId)),
  });
  const keterangan = nullIfEmpty(input.keterangan) ?? buildKeteranganEkskulDefault(ekskulRow.nama);
  const now = new Date().toISOString();

  if (existing) {
    await db.update(ekskulNilai).set({ predikat: input.predikat, keterangan, updated_at: now }).where(eq(ekskulNilai.id, existing.id));
  } else {
    await db.insert(ekskulNilai).values({
      id: generateId(),
      period_id: periodId,
      siswa_id: input.siswaId,
      ekskul_id: input.ekskulId,
      predikat: input.predikat,
      keterangan,
      created_at: now,
      updated_at: now,
    });
  }
}

export async function saveKehadiranOverride(db: Database, periodId: string, rombelId: string, input: SaveKehadiranOverrideInput): Promise<void> {
  await upsertRaportSiswa(db, periodId, input.siswaId, rombelId, {
    override_sakit: input.overrideSakit,
    override_izin: input.overrideIzin,
    override_alpa: input.overrideAlpa,
    alasan_override_kehadiran: nullIfEmpty(input.alasanOverrideKehadiran),
  });
}

export async function saveCatatanPendidik(db: Database, periodId: string, rombelId: string, input: SaveCatatanPendidikInput): Promise<void> {
  await upsertRaportSiswa(db, periodId, input.siswaId, rombelId, { catatan_pendidik: nullIfEmpty(input.catatanPendidik) });
}

export async function saveKenaikanKelas(db: Database, periodId: string, rombelId: string, input: SaveKenaikanKelasInput): Promise<void> {
  const periode = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) });
  if (periode?.semester !== "GENAP") {
    throw new HTTPException(400, { message: "Keterangan kenaikan kelas hanya bisa diisi di semester genap." });
  }
  await upsertRaportSiswa(db, periodId, input.siswaId, rombelId, {
    keterangan_kenaikan: input.keteranganKenaikan,
    kenaikan_ke_kelas: nullIfEmpty(input.kenaikanKeKelas),
  });
}

/** Ringan — cuma cek kelengkapan nilai, bukan ambil seluruh konteks (ekskul/prestasi/kehadiran/dll) seperti getRaportKelasKonteks(). */
export async function getKekuranganFinalisasi(db: Database, periodId: string, rombelId: string): Promise<KekuranganFinalisasi[]> {
  const siswaRows = await db
    .select({ id: siswa.id, nama: siswa.nama_lengkap })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
    .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)));

  const siswaIds = siswaRows.map((s) => s.id);
  const { totalMapel, terisiBySiswa } = await hitungJumlahMapelBelumNilai(db, periodId, rombelId, siswaIds);
  if (totalMapel === 0) return [];

  return siswaRows
    .map((s) => ({ siswaId: s.id, namaLengkap: s.nama, jumlahMapelBelumNilai: Math.max(0, totalMapel - (terisiBySiswa.get(s.id) ?? 0)) }))
    .filter((r) => r.jumlahMapelBelumNilai > 0);
}

export async function finalisasiRombel(db: Database, periodId: string, rombelId: string, actorUserId: string): Promise<void> {
  const kekurangan = await getKekuranganFinalisasi(db, periodId, rombelId);
  if (kekurangan.length > 0) {
    throw new HTTPException(400, {
      message: `Nilai belum lengkap untuk ${kekurangan.length} siswa — lengkapi dulu sebelum finalisasi.`,
    });
  }

  const siswaRows = await db
    .select({ id: siswa.id })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
    .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)));

  const existingRows = await db
    .select({ siswaId: raportSiswa.siswa_id, id: raportSiswa.id, kodeVerifikasi: raportSiswa.kode_verifikasi })
    .from(raportSiswa)
    .where(and(eq(raportSiswa.period_id, periodId), sql`${raportSiswa.siswa_id} IN ${siswaRows.map((s) => s.id)}`));
  const existingBySiswa = new Map(existingRows.map((r) => [r.siswaId, r]));

  const now = new Date().toISOString();
  const statements = siswaRows.map((s) => {
    const existing = existingBySiswa.get(s.id);
    const kodeVerifikasi = existing?.kodeVerifikasi ?? generateId();
    if (existing) {
      return db
        .update(raportSiswa)
        .set({ status: "final" as const, kode_verifikasi: kodeVerifikasi, dikunci_pada: now, updated_at: now })
        .where(eq(raportSiswa.id, existing.id));
    }
    return db.insert(raportSiswa).values({
      id: generateId(),
      period_id: periodId,
      siswa_id: s.id,
      rombel_id: rombelId,
      status: "final" as const,
      kode_verifikasi: kodeVerifikasi,
      dikunci_pada: now,
      created_at: now,
      updated_at: now,
    });
  });

  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  await kunciRombel(db, periodId, rombelId, actorUserId);
}

export async function bukaKunciRombelDenganAlasan(db: Database, periodId: string, rombelId: string): Promise<void> {
  const siswaRows = await db
    .select({ id: siswa.id })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
    .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)));
  const siswaIds = siswaRows.map((s) => s.id);

  if (siswaIds.length > 0) {
    await db
      .update(raportSiswa)
      .set({ status: "draf", updated_at: new Date().toISOString() })
      .where(and(eq(raportSiswa.period_id, periodId), sql`${raportSiswa.siswa_id} IN ${siswaIds}`));
  }
  await bukaKunciRombel(db, periodId, rombelId);
}
