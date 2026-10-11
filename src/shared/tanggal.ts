import { HARI_LIST, type Hari } from "./constants";

// getUTCDay (bukan getDay) supaya hasil tidak tergantung timezone runtime —
// tanggal selalu diperlakukan sebagai UTC midnight, konsisten di Workers
// maupun saat dites lokal di mesin manapun.
const DAY_INDEX_TO_HARI: (Hari | null)[] = [
  null, // 0 = Minggu, bukan hari sekolah
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
];

/** Tanggal format "YYYY-MM-DD" -> Hari (SENIN-SABTU), atau null kalau Minggu/tidak valid. */
export function getHariFromTanggal(tanggal: string): Hari | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  const date = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return DAY_INDEX_TO_HARI[date.getUTCDay()] ?? null;
}

export function isValidHari(value: string): value is Hari {
  return (HARI_LIST as readonly string[]).includes(value);
}

export function addDays(tanggal: string, days: number): string {
  const date = new Date(`${tanggal}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
