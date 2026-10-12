export interface MapelStrukturNode {
  id: string;
  nama: string;
  urutan: number;
  anak: { id: string; nama: string; urutan: number }[];
}

export interface NilaiMapelRef {
  nilai: number | null;
  deskripsi: string | null;
}

export interface BarisCapaian {
  nomor: string;
  mapelNama: string;
  nilaiAkhir: number | null;
  capaianKompetensi: string | null;
  isHeader: boolean;
}

const HURUF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Susun baris tabel "Capaian Hasil Belajar": mapel induk jadi baris judul
 * bernomor tanpa nilai, sub-mapel huruf (A., B., …) di bawahnya tanpa
 * nomor, mapel berdiri sendiri bernomor seperti biasa. "Jumlah" = total
 * nilai akhir dari baris yang PUNYA nilai saja (bukan baris judul induk).
 */
export function buildBarisCapaian(
  struktur: MapelStrukturNode[],
  nilaiPerMapel: Record<string, NilaiMapelRef | undefined>,
): { rows: BarisCapaian[]; jumlah: number } {
  const rows: BarisCapaian[] = [];
  let jumlah = 0;
  let nomor = 0;

  for (const node of struktur) {
    nomor += 1;
    if (node.anak.length === 0) {
      const ref = nilaiPerMapel[node.id];
      rows.push({ nomor: `${nomor}.`, mapelNama: node.nama, nilaiAkhir: ref?.nilai ?? null, capaianKompetensi: ref?.deskripsi ?? null, isHeader: false });
      if (ref?.nilai !== null && ref?.nilai !== undefined) jumlah += ref.nilai;
    } else {
      rows.push({ nomor: `${nomor}.`, mapelNama: node.nama, nilaiAkhir: null, capaianKompetensi: null, isHeader: true });
      node.anak.forEach((anak, i) => {
        const ref = nilaiPerMapel[anak.id];
        rows.push({ nomor: HURUF[i] ? `${HURUF[i]}.` : "", mapelNama: anak.nama, nilaiAkhir: ref?.nilai ?? null, capaianKompetensi: ref?.deskripsi ?? null, isHeader: false });
        if (ref?.nilai !== null && ref?.nilai !== undefined) jumlah += ref.nilai;
      });
    }
  }

  return { rows, jumlah };
}

/** Nilai kehadiran final: pakai override kalau diisi (non-null), else otomatis dari absensi. */
export function resolveKehadiran(
  override: number | null,
  otomatis: number,
): number {
  return override ?? otomatis;
}

/** NISN disamarkan: 2 digit awal + 2 digit akhir tampil, sisanya diganti "*". */
export function samarkanNisn(nisn: string): string {
  if (nisn.length <= 4) return "*".repeat(nisn.length);
  const awal = nisn.slice(0, 2);
  const akhir = nisn.slice(-2);
  return `${awal}${"*".repeat(nisn.length - 4)}${akhir}`;
}
