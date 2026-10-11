import { and, eq, sql, asc, desc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { siswa, siswaKelas, absensiHarian, rekapHarianRombel } from "../db/schema";
import { getSetting } from "./settings.service";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { DEFAULT_SISWA_ALPA_AMBANG } from "../../shared/constants";
import type { KoreksiAbsensiHarianInput } from "../../shared/schemas/rekapAbsensi.schema";
import type { RekapBulananSiswaRow, RekapBulananSiswaCell, RekapSemesterSiswaItem } from "../../shared/types";

export interface RekapBulananResult {
  hariEfektif: string[];
  rows: RekapBulananSiswaRow[];
}

/** Rekap bulanan per rombel — dibaca dari absensi_harian + rekap_harian_rombel, bukan scan agenda. */
export async function getRekapBulananRombel(
  db: Database,
  rombelId: string,
  periodId: string,
  bulan: string,
): Promise<RekapBulananResult> {
  const tanggalAwal = `${bulan}-01`;
  const tanggalAkhir = `${bulan}-31`;

  const [siswaRows, rekapHarianRows, absensiHarianRows, ambang] = await Promise.all([
    db
      .select({ id: siswa.id, nama: siswa.nama_lengkap, nomorAbsen: siswaKelas.nomor_absen })
      .from(siswaKelas)
      .innerJoin(siswa, eq(siswaKelas.siswa_id, siswa.id))
      .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)))
      .orderBy(asc(siswaKelas.nomor_absen)),
    db
      .select({ tanggal: rekapHarianRombel.tanggal })
      .from(rekapHarianRombel)
      .where(
        and(
          eq(rekapHarianRombel.rombel_id, rombelId),
          sql`${rekapHarianRombel.tanggal} >= ${tanggalAwal}`,
          sql`${rekapHarianRombel.tanggal} <= ${tanggalAkhir}`,
        ),
      ),
    db
      .select({
        siswaId: absensiHarian.siswa_id,
        tanggal: absensiHarian.tanggal,
        status: absensiHarian.status,
        sumber: absensiHarian.sumber,
      })
      .from(absensiHarian)
      .where(
        and(
          eq(absensiHarian.rombel_id, rombelId),
          sql`${absensiHarian.tanggal} >= ${tanggalAwal}`,
          sql`${absensiHarian.tanggal} <= ${tanggalAkhir}`,
        ),
      ),
    getSetting<number>(db, "siswa_alpa_ambang"),
  ]);

  const hariEfektif = [...new Set(rekapHarianRows.map((r) => r.tanggal))].sort();
  const totalHari = hariEfektif.length;
  const ambangAlpa = ambang ?? DEFAULT_SISWA_ALPA_AMBANG;

  const bySiswa = new Map<string, RekapBulananSiswaCell[]>();
  for (const row of absensiHarianRows) {
    const arr = bySiswa.get(row.siswaId) ?? [];
    arr.push({ tanggal: row.tanggal, status: row.status, sumber: row.sumber });
    bySiswa.set(row.siswaId, arr);
  }

  const rows: RekapBulananSiswaRow[] = siswaRows.map((s) => {
    const cells = (bySiswa.get(s.id) ?? []).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const totalS = cells.filter((c) => c.status === "S").length;
    const totalI = cells.filter((c) => c.status === "I").length;
    const totalA = cells.filter((c) => c.status === "A").length;
    const hadir = totalHari - totalS - totalI - totalA;
    const persenHadir = totalHari > 0 ? Math.round((hadir / totalHari) * 1000) / 10 : 100;
    return {
      siswaId: s.id,
      namaLengkap: s.nama,
      nomorAbsen: s.nomorAbsen,
      cells,
      totalS,
      totalI,
      totalA,
      persenHadir,
      seringAlpa: totalA >= ambangAlpa,
    };
  });

  return { hariEfektif, rows };
}

export async function getRekapSemesterRombel(
  db: Database,
  rombelId: string,
  periodId: string,
): Promise<RekapSemesterSiswaItem[]> {
  const [siswaRows, rekapHarianRows, absensiHarianRows] = await Promise.all([
    db
      .select({ id: siswa.id, nama: siswa.nama_lengkap, noHpOrtu: siswa.no_hp_ortu })
      .from(siswaKelas)
      .innerJoin(siswa, eq(siswaKelas.siswa_id, siswa.id))
      .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId))),
    db
      .select({ tanggal: rekapHarianRombel.tanggal })
      .from(rekapHarianRombel)
      .where(and(eq(rekapHarianRombel.rombel_id, rombelId), eq(rekapHarianRombel.period_id, periodId))),
    db
      .select({ siswaId: absensiHarian.siswa_id, status: absensiHarian.status })
      .from(absensiHarian)
      .where(and(eq(absensiHarian.rombel_id, rombelId), eq(absensiHarian.period_id, periodId))),
  ]);

  const totalHari = new Set(rekapHarianRows.map((r) => r.tanggal)).size;
  const bySiswa = new Map<string, { S: number; I: number; A: number }>();
  for (const row of absensiHarianRows) {
    const c = bySiswa.get(row.siswaId) ?? { S: 0, I: 0, A: 0 };
    c[row.status] += 1;
    bySiswa.set(row.siswaId, c);
  }

  return siswaRows.map((s) => {
    const c = bySiswa.get(s.id) ?? { S: 0, I: 0, A: 0 };
    const hadir = totalHari - c.S - c.I - c.A;
    const persenHadir = totalHari > 0 ? Math.round((hadir / totalHari) * 1000) / 10 : 100;
    return { siswaId: s.id, namaLengkap: s.nama, noHpOrtu: s.noHpOrtu, totalS: c.S, totalI: c.I, totalA: c.A, persenHadir };
  });
}

export interface RekapSiswaDetailResult {
  totalS: number;
  totalI: number;
  totalA: number;
  persenHadir: number;
  totalHariEfektif: number;
  riwayat: { tanggal: string; status: string; sumber: string; keterangan: string | null }[];
}

/** Dipakai tab Semester (Per Siswa) & tab "Kehadiran" di halaman detail siswa. */
export async function getRekapSiswaDetail(db: Database, siswaId: string, periodId: string): Promise<RekapSiswaDetailResult> {
  const siswaKelasRow = await db.query.siswaKelas.findFirst({
    where: and(eq(siswaKelas.siswa_id, siswaId), eq(siswaKelas.period_id, periodId)),
  });
  if (!siswaKelasRow) {
    return { totalS: 0, totalI: 0, totalA: 0, persenHadir: 100, totalHariEfektif: 0, riwayat: [] };
  }

  const [rekapHarianRows, absensiHarianRows] = await Promise.all([
    db
      .select({ tanggal: rekapHarianRombel.tanggal })
      .from(rekapHarianRombel)
      .where(and(eq(rekapHarianRombel.rombel_id, siswaKelasRow.rombel_id), eq(rekapHarianRombel.period_id, periodId))),
    db
      .select({
        tanggal: absensiHarian.tanggal,
        status: absensiHarian.status,
        sumber: absensiHarian.sumber,
        keterangan: absensiHarian.keterangan,
      })
      .from(absensiHarian)
      .where(and(eq(absensiHarian.siswa_id, siswaId), eq(absensiHarian.period_id, periodId)))
      .orderBy(desc(absensiHarian.tanggal)),
  ]);

  const totalHariEfektif = new Set(rekapHarianRows.map((r) => r.tanggal)).size;
  const totalS = absensiHarianRows.filter((r) => r.status === "S").length;
  const totalI = absensiHarianRows.filter((r) => r.status === "I").length;
  const totalA = absensiHarianRows.filter((r) => r.status === "A").length;
  const hadir = totalHariEfektif - totalS - totalI - totalA;
  const persenHadir = totalHariEfektif > 0 ? Math.round((hadir / totalHariEfektif) * 1000) / 10 : 100;

  return {
    totalS,
    totalI,
    totalA,
    persenHadir,
    totalHariEfektif,
    riwayat: absensiHarianRows,
  };
}

/**
 * Koreksi wali kelas: menimpa status harian seorang siswa pada satu tanggal.
 * status="H" menghapus baris absensi_harian (siswa dianggap Hadir) — ini TIDAK
 * menyimpan penanda permanen, jadi kalau agenda terkait diedit ulang nanti,
 * status akan dihitung ulang otomatis dari data agenda terbaru (bukan terkunci
 * Hadir selamanya). Selain "H", baris disimpan dgn sumber="koreksi_wali" supaya
 * dilewati oleh recomputeStatusHarian saat agenda lain di hari sama diedit.
 */
export async function koreksiAbsensiHarian(
  db: Database,
  input: KoreksiAbsensiHarianInput,
  actorUserId: string,
): Promise<void> {
  const siswaKelasRow = await db.query.siswaKelas.findFirst({ where: eq(siswaKelas.siswa_id, input.siswaId) });
  if (!siswaKelasRow) throw new HTTPException(404, { message: "Siswa tidak ditemukan di kelas manapun." });

  const existing = await db.query.absensiHarian.findFirst({
    where: and(eq(absensiHarian.siswa_id, input.siswaId), eq(absensiHarian.tanggal, input.tanggal)),
  });

  if (input.status === "H") {
    if (existing) await db.delete(absensiHarian).where(eq(absensiHarian.id, existing.id));
    return;
  }

  const now = new Date().toISOString();
  if (existing) {
    await db
      .update(absensiHarian)
      .set({
        status: input.status,
        sumber: "koreksi_wali",
        keterangan: nullIfEmpty(input.keterangan),
        diubah_oleh: actorUserId,
        updated_at: now,
      })
      .where(eq(absensiHarian.id, existing.id));
  } else {
    await db.insert(absensiHarian).values({
      id: generateId(),
      siswa_id: input.siswaId,
      rombel_id: siswaKelasRow.rombel_id,
      period_id: siswaKelasRow.period_id,
      tanggal: input.tanggal,
      status: input.status,
      sumber: "koreksi_wali",
      keterangan: nullIfEmpty(input.keterangan),
      diubah_oleh: actorUserId,
      created_at: now,
      updated_at: now,
    });
  }
}
