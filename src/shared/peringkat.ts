export interface SkorPeserta {
  siswaId: string;
  jumlah: number;
}

export interface HasilPeringkat {
  siswaId: string;
  peringkat: number;
}

/**
 * Peringkat kompetisi standar (gaya "1,2,2,4"): nilai sama dapat peringkat
 * sama, dan peringkat berikutnya melompat sebanyak jumlah yang seri —
 * bukan peringkat berurutan rapat ("1,2,2,3"). Urutan input tidak harus
 * terurut; fungsi ini yang mengurutkan.
 */
export function hitungPeringkat(peserta: SkorPeserta[]): HasilPeringkat[] {
  const terurut = [...peserta].sort((a, b) => b.jumlah - a.jumlah);

  const hasil: HasilPeringkat[] = [];
  let peringkatSaatIni = 0;
  let jumlahSebelumnya: number | null = null;

  terurut.forEach((p, i) => {
    if (jumlahSebelumnya === null || p.jumlah < jumlahSebelumnya) {
      peringkatSaatIni = i + 1;
      jumlahSebelumnya = p.jumlah;
    }
    hasil.push({ siswaId: p.siswaId, peringkat: peringkatSaatIni });
  });

  return hasil;
}
