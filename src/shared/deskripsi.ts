export interface NilaiTpRef {
  tpId: string;
  nilai: number | null;
}

/**
 * TP acuan default: nilai tertinggi siswa itu di mapel tersebut. Kalau
 * semua TP masih kosong, jatuh balik ke TP pertama (urutan daftar yang
 * dikirim, bukan diurutkan ulang di sini). `null` kalau tidak ada TP sama
 * sekali.
 */
export function pilihTpCapaianDefault(nilaiTpList: NilaiTpRef[]): string | null {
  if (nilaiTpList.length === 0) return null;

  let terbaik: NilaiTpRef | null = null;
  for (const item of nilaiTpList) {
    if (item.nilai === null) continue;
    if (!terbaik || item.nilai > (terbaik.nilai as number)) terbaik = item;
  }
  return terbaik ? terbaik.tpId : nilaiTpList[0]!.tpId;
}

/** Pola kalimat tetap raport — teks TP disisipkan apa adanya (termasuk Unicode/huruf Arab). */
export function buildDeskripsiCapaian(predikat: string, deskripsiTp: string): string {
  return `Menunjukkan penguasaan yang ${predikat} dalam ${deskripsiTp}.`;
}
