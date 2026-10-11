/**
 * Waktu "sekarang" dalam WIB (UTC+7, tanpa DST) — Workers berjalan di UTC,
 * jadi semua perbandingan jam/tanggal "hari ini" di fitur agenda memakai
 * helper ini supaya konsisten dengan jam dinding Indonesia, bukan UTC.
 */
export function nowWib(): { tanggal: string; jam: string } {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return { tanggal: wib.toISOString().slice(0, 10), jam: wib.toISOString().slice(11, 16) };
}
