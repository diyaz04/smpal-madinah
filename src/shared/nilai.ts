export interface BobotNilai {
  bobotTp: number;
  bobotSts: number;
  bobotSas: number;
}

export interface PredikatRangeRef {
  batasBawah: number;
  label: string;
}

/** Rata-rata nilai TP yang SUDAH diisi — TP kosong (null) diabaikan, bukan dianggap 0. */
export function hitungRataTp(nilaiTpList: (number | null)[]): number | null {
  const terisi = nilaiTpList.filter((n): n is number => n !== null);
  if (terisi.length === 0) return null;
  return terisi.reduce((sum, n) => sum + n, 0) / terisi.length;
}

export function bulatkan(nilai: number, desimal: number): number {
  const faktor = 10 ** desimal;
  return Math.round(nilai * faktor) / faktor;
}

/**
 * Nilai akhir = rataTp×bobotTp% + STS×bobotSts% + SAS×bobotSas%, dibulatkan
 * sesuai pengaturan. `null` kalau rata-rata TP, STS, atau SAS belum lengkap
 * — nilai akhir sengaja TIDAK dihitung dari bobot sebagian supaya tidak
 * menyesatkan (lihat DECISIONS.md Tahap 6).
 */
export function hitungNilaiAkhir(
  nilaiTpList: (number | null)[],
  nilaiSts: number | null,
  nilaiSas: number | null,
  bobot: BobotNilai,
  pembulatanDesimal: number,
): number | null {
  const rataTp = hitungRataTp(nilaiTpList);
  if (rataTp === null || nilaiSts === null || nilaiSas === null) return null;

  const nilai =
    (rataTp * bobot.bobotTp + nilaiSts * bobot.bobotSts + nilaiSas * bobot.bobotSas) / 100;
  return bulatkan(nilai, pembulatanDesimal);
}

/** Predikat dari rentang tertinggi yang batasBawah-nya <= nilai. `null` kalau nilai null atau rentang kosong. */
export function tentukanPredikat(nilai: number | null, predikatConfig: PredikatRangeRef[]): string | null {
  if (nilai === null || predikatConfig.length === 0) return null;
  const terurut = [...predikatConfig].sort((a, b) => a.batasBawah - b.batasBawah);
  let hasil: string | null = null;
  for (const rentang of terurut) {
    if (rentang.batasBawah <= nilai) hasil = rentang.label;
  }
  return hasil;
}
