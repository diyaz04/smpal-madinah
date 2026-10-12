/**
 * Default teks raport prestasi — bisa diedit user setelah dibuat (lihat
 * `prestasi.judul_raport`/`keterangan_raport`). Fungsi murni supaya format
 * default konsisten & dites tanpa DB, pola yang sama dengan `sanksi.ts`.
 */
export function buildJudulRaportDefault(capaian: string, namaKegiatan: string, tingkatLabel: string): string {
  return `${capaian} ${namaKegiatan} Tingkat ${tingkatLabel}`;
}

export function buildKeteranganRaportDefault(
  penyelenggara: string | null,
  semesterLabel: string,
  tahunAjaran: string,
): string {
  const prefix = penyelenggara ? `${penyelenggara} ` : "";
  return `${prefix}Semester ${semesterLabel} TP ${tahunAjaran}`;
}
