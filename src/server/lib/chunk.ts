/**
 * D1 membatasi jumlah SQL bound variables per statement (jauh di bawah batas
 * SQLite biasa). Insert banyak baris sekaligus lewat satu statement bisa kena
 * error "too many SQL variables" kalau (jumlah_baris * jumlah_kolom) terlalu
 * besar. Helper ini memecah array jadi potongan kecil supaya tiap statement
 * insert aman, lalu dijalankan sekaligus lewat db.batch() (tetap satu
 * round-trip, bukan N query terpisah).
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
