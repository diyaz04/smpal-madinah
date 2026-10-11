/**
 * Perhitungan status presensi guru dari jam kerja — fungsi murni (tanpa DB),
 * di shared/ supaya testable & konsisten dengan pola computeStatusHarian
 * Tahap 3. Semua waktu dalam format "HH:MM" (24 jam).
 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function subtractMinutes(hhmm: string, minutes: number): string {
  const total = Math.max(0, toMinutes(hhmm) - minutes);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface StatusDatangResult {
  status: "tepat_waktu" | "terlambat";
  menitTerlambat: number;
}

export function computeStatusDatang(waktu: string, jamMasuk: string, toleransiMenit: number): StatusDatangResult {
  const waktuMenit = toMinutes(waktu);
  const batasMenit = toMinutes(jamMasuk) + toleransiMenit;
  if (waktuMenit <= batasMenit) return { status: "tepat_waktu", menitTerlambat: 0 };
  return { status: "terlambat", menitTerlambat: waktuMenit - toMinutes(jamMasuk) };
}

export interface StatusPulangResult {
  status: "tepat_waktu" | "pulang_cepat";
  menitPulangCepat: number;
}

export function computeStatusPulang(waktu: string, jamPulang: string): StatusPulangResult {
  const waktuMenit = toMinutes(waktu);
  const jamPulangMenit = toMinutes(jamPulang);
  if (waktuMenit >= jamPulangMenit) return { status: "tepat_waktu", menitPulangCepat: 0 };
  return { status: "pulang_cepat", menitPulangCepat: jamPulangMenit - waktuMenit };
}

/**
 * Gabungkan hasil datang+pulang jadi satu status harian ringkas (prioritas:
 * terlambat lebih "buruk" dari pulang_cepat kalau keduanya terjadi — status
 * terlambat yang ditampilkan, menit_pulang_cepat tetap tersimpan terpisah).
 */
export function computeStatusHarianPresensi(
  datang: StatusDatangResult | null,
  pulang: StatusPulangResult | null,
): "tepat_waktu" | "terlambat" | "pulang_cepat" | "tidak_presensi_pulang" {
  if (datang?.status === "terlambat") return "terlambat";
  if (datang && !pulang) return "tidak_presensi_pulang";
  if (pulang?.status === "pulang_cepat") return "pulang_cepat";
  return "tepat_waktu";
}
