import { TINGKAT_BERIKUTNYA } from "./constants";
import type { Tingkat, KeteranganKenaikan } from "./constants";

/** Default keterangan ekskul — dipakai kalau wali/pembina tidak mengetik keterangan sendiri. */
export function buildKeteranganEkskulDefault(namaEkskul: string): string {
  return `Aktif dalam kegiatan ${namaEkskul}`;
}

/**
 * Default kenaikan kelas dari tingkat saat ini: naik ke tingkat berikutnya,
 * atau "lulus" kalau sudah di tingkat tertinggi (IX). Dipakai sebagai nilai
 * awal yang bisa diubah wali kelas per siswa.
 */
export function buildKenaikanDefault(tingkatSekarang: Tingkat): { keteranganKenaikan: KeteranganKenaikan; kenaikanKeKelas: string | null } {
  const berikutnya = TINGKAT_BERIKUTNYA[tingkatSekarang];
  if (!berikutnya) return { keteranganKenaikan: "lulus", kenaikanKeKelas: null };
  return { keteranganKenaikan: "naik", kenaikanKeKelas: berikutnya };
}
