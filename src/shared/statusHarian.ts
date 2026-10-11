import type { AbsensiPertemuanStatus, AbsensiHarianStatus } from "./constants";

export interface StatusHarianEntry {
  jumlahJp: number;
  status: AbsensiPertemuanStatus | null; // null = Hadir di pertemuan itu
}

/**
 * Status terbanyak dari seluruh JP KBM hari itu. T (Terlambat) dan D
 * (Dispensasi) tidak mengurangi JP Hadir. Seri diputus dengan prioritas
 * S > I > A > H. Fungsi murni (tanpa DB), diletakkan di shared/ supaya bisa
 * dipakai juga oleh script Node (scripts/seed-dummy-tahap3.ts) tanpa menarik
 * tipe khusus Workers (D1Database) lewat import berantai.
 */
export function computeStatusHarian(entries: StatusHarianEntry[]): AbsensiHarianStatus | "H" {
  let totalJp = 0;
  let jpS = 0;
  let jpI = 0;
  let jpA = 0;
  for (const e of entries) {
    totalJp += e.jumlahJp;
    if (e.status === "S") jpS += e.jumlahJp;
    else if (e.status === "I") jpI += e.jumlahJp;
    else if (e.status === "A") jpA += e.jumlahJp;
  }
  if (totalJp === 0) return "H";

  const jpHadir = totalJp - jpS - jpI - jpA;

  const candidates: { status: AbsensiHarianStatus | "H"; jp: number; priority: number }[] = [
    { status: "S", jp: jpS, priority: 3 },
    { status: "I", jp: jpI, priority: 2 },
    { status: "A", jp: jpA, priority: 1 },
    { status: "H", jp: jpHadir, priority: 0 },
  ];
  candidates.sort((a, b) => b.jp - a.jp || b.priority - a.priority);
  return candidates[0]!.status;
}
