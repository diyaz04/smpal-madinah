import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { raportSiswa, siswa, rombel, academicPeriods } from "../db/schema";
import { getOrCreateRaportPengaturan } from "./raportPengaturan.service";
import { samarkanNisn } from "../../shared/raportCetak";
import { SEMESTER_LABELS } from "../../shared/constants";
import type { VerifikasiRaportResult } from "../../shared/types";

/** Kode permanen begitu dibuat (lihat finalisasiRombel()) — raport tetap "terdaftar" walau rombelnya sedang dibuka kuncinya lagi. */
export async function verifikasiKodeRaport(db: Database, kode: string): Promise<VerifikasiRaportResult | null> {
  if (!kode.trim()) return null;

  const rows = await db
    .select({
      periodId: raportSiswa.period_id,
      namaSiswa: siswa.nama_lengkap,
      nisn: siswa.nisn,
      rombelNama: rombel.nama,
      tingkat: rombel.tingkat,
      yearLabel: academicPeriods.year_label,
      semester: academicPeriods.semester,
    })
    .from(raportSiswa)
    .innerJoin(siswa, eq(siswa.id, raportSiswa.siswa_id))
    .innerJoin(rombel, eq(rombel.id, raportSiswa.rombel_id))
    .innerJoin(academicPeriods, eq(academicPeriods.id, raportSiswa.period_id))
    .where(eq(raportSiswa.kode_verifikasi, kode))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const pengaturan = await getOrCreateRaportPengaturan(db, row.periodId);

  return {
    namaSiswa: row.namaSiswa,
    nisnSamar: samarkanNisn(row.nisn),
    rombelNama: row.rombelNama,
    tingkat: row.tingkat,
    semesterLabel: SEMESTER_LABELS[row.semester],
    tahunAjaran: row.yearLabel,
    tanggalRaport: pengaturan.tanggalRaport,
  };
}
