import type * as XLSXType from "xlsx";

import type { SheetGrid, MergeRange } from "@shared/jadwal-parser";

/** Bungkus satu worksheet SheetJS jadi SheetGrid supaya bisa dipakai parseJadwalSheet() yang sama dengan Vitest. */
export function sheetToGrid(XLSX: typeof XLSXType, ws: XLSXType.WorkSheet): SheetGrid {
  const ref = ws["!ref"];
  const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const merges: MergeRange[] = (ws["!merges"] ?? []).map((m) => ({
    startRow: m.s.r,
    endRow: m.e.r,
    startCol: m.s.c,
    endCol: m.e.c,
  }));

  return {
    rowCount: range.e.r + 1,
    colCount: range.e.c + 1,
    cell(row, col) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      const cellObj = ws[addr];
      if (!cellObj) return null;
      const value = cellObj.w ?? cellObj.v;
      return value === undefined || value === null ? null : String(value);
    },
    merges,
  };
}
