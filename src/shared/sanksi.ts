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
