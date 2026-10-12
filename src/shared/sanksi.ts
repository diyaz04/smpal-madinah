export interface AmbangRef {
  id: string;
  poinMinimal: number;
}

/**
 * Ambang sanksi yang baru terlampaui setelah total poin siswa bertambah,
 * diurutkan dari poin_minimal terkecil. Ambang yang poin_minimal-nya sudah
 * pernah tercatat di sanksi_siswa (lihat `ambangSudahTercapaiIds`) tidak
 * diulang walau total poin tetap/di atasnya — satu ambang hanya tercatat
 * sekali per siswa per tahun ajaran.
 */
export function tentukanAmbangBaruTercapai(
  totalPoinBaru: number,
  daftarAmbang: AmbangRef[],
  ambangSudahTercapaiIds: ReadonlySet<string>,
): AmbangRef[] {
  return daftarAmbang
    .filter((a) => a.poinMinimal <= totalPoinBaru && !ambangSudahTercapaiIds.has(a.id))
    .sort((a, b) => a.poinMinimal - b.poinMinimal);
}

/**
 * Ambang terdekat yang BELUM terlampaui dan sisa poinnya, dipakai badge
 * peringatan "mendekati ambang" di Rekap Kesiswaan/daftar siswa. `null`
 * kalau tidak ada ambang di atas total poin saat ini (sudah melewati semua).
 */
export function ambangTerdekat(
  totalPoin: number,
  daftarAmbang: AmbangRef[],
): { ambang: AmbangRef; sisaPoin: number } | null {
  const belumTerlampaui = daftarAmbang
    .filter((a) => a.poinMinimal > totalPoin)
    .sort((a, b) => a.poinMinimal - b.poinMinimal);
  const terdekat = belumTerlampaui[0];
  if (!terdekat) return null;
  return { ambang: terdekat, sisaPoin: terdekat.poinMinimal - totalPoin };
}
