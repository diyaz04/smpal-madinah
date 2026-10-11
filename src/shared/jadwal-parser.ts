/**
 * Parser jadwal pelajaran dari sheet Excel sekolah — modul murni TypeScript
 * (tanpa React/DOM/SheetJS) supaya testable dengan fixture buatan (Vitest)
 * dan dipakai langsung di browser lewat adapter yang membungkus workbook
 * SheetJS menjadi `SheetGrid`.
 *
 * Format sheet yang didukung (lihat DECISIONS.md untuk detail & contoh):
 * - Bisa berisi beberapa blok header berulang (mis. terpisah per tingkat).
 * - Baris header memuat kolom HARI / WAKTU / JAM KE- lalu kolom-kolom kelas
 *   (ditutup kolom "Piket" di kanan), dan baris tepat di bawah header berisi
 *   nama kelas per kolom.
 * - HARI & isi kelas bisa merge vertikal (sel pertama saja berisi teks, baris
 *   di bawahnya mewarisi dari sel anchor merge).
 *   dan "(Nama Guru)" — bisa team teaching dipisah "&" / "dan".
 * - Sel bisa merge horizontal menutupi SELURUH kolom kelas (jam istirahat,
 *   upacara, pembiasaan — dicocokkan lewat kata kunci) atau SEBAGIAN kolom
 *   kelas (kegiatan gabungan beberapa kelas — isinya diduplikasi ke tiap
 *   kelas yang tercakup).
 * - Kolom Piket (hanya terisi di baris pertama tiap blok hari) berisi nama
 *   guru piket hari itu, dipisah "&".
 * - Kolom-kolom di kanan Piket diabaikan (rentang baca kolom dibatasi
 *   eksplisit, bukan baca-semua-lalu-filter).
 */

import { HARI_LIST, type Hari, type JenisSlot, DEFAULT_JADWAL_KATA_KUNCI } from "./constants";

export interface MergeRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export interface SheetGrid {
  rowCount: number;
  colCount: number;
  cell(row: number, col: number): string | null;
  merges: MergeRange[];
}

export interface ParsedJadwalEntry {
  hari: Hari;
  jamMulai: string;
  jamSelesai: string;
  jamKe: number | null;
  rombelNama: string;
  kodeMapel: string | null;
  namaGuru: string[];
  jenisSlot: JenisSlot;
  keterangan: string | null;
  row: number;
}

export interface ParsedPiketEntry {
  hari: Hari;
  namaGuru: string[];
  row: number;
}

export interface JadwalParseWarning {
  level: "error" | "warning";
  message: string;
  row?: number;
  col?: number;
}

export interface JadwalParseResult {
  entries: ParsedJadwalEntry[];
  piket: ParsedPiketEntry[];
  rombelNames: string[];
  warnings: JadwalParseWarning[];
}

type KataKunci = typeof DEFAULT_JADWAL_KATA_KUNCI;

const HEADER_KEYWORDS = ["HARI", "WAKTU", "JAM KE"];
const WAKTU_REGEX = /(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/;
const GURU_SPLIT_REGEX = /\s*(?:&|\bdan\b)\s*/i;
const MAPEL_GURU_REGEX = /^(.*?)\(([^)]*)\)\s*$/;

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isHeaderRow(grid: SheetGrid, row: number): boolean {
  for (let col = 0; col < Math.min(grid.colCount, 4); col++) {
    const value = normalize(grid.cell(row, col)).toUpperCase();
    if (HEADER_KEYWORDS.some((kw) => value.includes(kw))) return true;
  }
  return false;
}

function findMergeAnchor(merges: MergeRange[], row: number, col: number): MergeRange | null {
  return merges.find((m) => row >= m.startRow && row <= m.endRow && col >= m.startCol && col <= m.endCol) ?? null;
}

/** Nilai sel dengan pewarisan merge vertikal: baris bukan-pertama dari merge mengambil nilai dari baris anchor (startRow). */
function cellWithVerticalInherit(grid: SheetGrid, row: number, col: number): string {
  const anchor = findMergeAnchor(grid.merges, row, col);
  if (anchor && anchor.startRow !== anchor.endRow) {
    return normalize(grid.cell(anchor.startRow, col));
  }
  return normalize(grid.cell(row, col));
}

function matchKataKunci(text: string, kataKunci: KataKunci): JenisSlot | null {
  const lower = text.toLowerCase();
  if (kataKunci.istirahat.some((k) => lower.includes(k))) return "istirahat";
  if (kataKunci.upacara.some((k) => lower.includes(k))) return "upacara";
  if (kataKunci.pembiasaan.some((k) => lower.includes(k))) return "pembiasaan";
  return null;
}

function parseMapelGuru(raw: string): { kodeMapel: string | null; namaGuru: string[] } {
  const text = normalize(raw);
  if (!text) return { kodeMapel: null, namaGuru: [] };
  const match = text.match(MAPEL_GURU_REGEX);
  if (!match) return { kodeMapel: text, namaGuru: [] };
  const kode = normalize(match[1]);
  const guruRaw = normalize(match[2]);
  const namaGuru = guruRaw ? guruRaw.split(GURU_SPLIT_REGEX).map(normalize).filter(Boolean) : [];
  return { kodeMapel: kode || null, namaGuru };
}

/**
 * Tentukan rentang kolom kelas: dari kolom setelah JAM KE- (kolom ke-3,
 * index dari 0) sampai sebelum kolom "Piket". Kalau "Piket" tidak ketemu,
 * pakai lebar merge "KELAS" di baris header kalau ada, atau fallback ke
 * seluruh sisa kolom sampai colCount.
 */
function findRombelColumnRange(grid: SheetGrid, headerRow: number): { start: number; end: number } {
  const start = 3; // HARI, WAKTU, JAM KE- → kolom kelas mulai index 3
  let piketCol = -1;
  for (let col = start; col < grid.colCount; col++) {
    const value = normalize(grid.cell(headerRow, col)).toUpperCase();
    if (value.includes("PIKET")) {
      piketCol = col;
      break;
    }
  }
  if (piketCol >= 0) return { start, end: piketCol - 1 };

  const kelasMerge = grid.merges.find(
    (m) => m.startRow === headerRow && m.startCol >= start && normalize(grid.cell(headerRow, m.startCol)).toUpperCase().includes("KELAS"),
  );
  if (kelasMerge) return { start: kelasMerge.startCol, end: kelasMerge.endCol };

  return { start, end: grid.colCount - 1 };
}

export function parseJadwalSheet(grid: SheetGrid, kataKunci: KataKunci = DEFAULT_JADWAL_KATA_KUNCI): JadwalParseResult {
  const entries: ParsedJadwalEntry[] = [];
  const piket: ParsedPiketEntry[] = [];
  const warnings: JadwalParseWarning[] = [];
  const rombelNamesSet: string[] = [];

  let row = 0;
  while (row < grid.rowCount) {
    if (!isHeaderRow(grid, row)) {
      row++;
      continue;
    }

    const headerRow = row;
    const { start: colStart, end: colEnd } = findRombelColumnRange(grid, headerRow);
    const piketCol = colEnd + 1;
    const classRow = headerRow + 1;

    const rombelCols: { col: number; nama: string }[] = [];
    for (let col = colStart; col <= colEnd; col++) {
      const nama = normalize(grid.cell(classRow, col));
      if (nama) {
        rombelCols.push({ col, nama });
        if (!rombelNamesSet.includes(nama)) rombelNamesSet.push(nama);
      }
    }
    if (rombelCols.length === 0) {
      warnings.push({
        level: "warning",
        message: `Blok header di baris ${headerRow + 1} tidak punya nama kelas yang terbaca di baris ${classRow + 1}.`,
        row: classRow,
      });
    }

    let currentHari: Hari | null = null;
    let lastJamSelesaiMinutes: number | null = null;
    let dataRow = classRow + 1;

    while (dataRow < grid.rowCount && !isHeaderRow(grid, dataRow)) {
      const hariRaw = cellWithVerticalInherit(grid, dataRow, 0).toUpperCase();
      const matchedHari = HARI_LIST.find((h) => hariRaw.includes(h));
      const isFirstRowOfHariBlock = !!grid.cell(dataRow, 0) && !!matchedHari;
      if (matchedHari) {
        currentHari = matchedHari;
        lastJamSelesaiMinutes = null;
      }

      const waktuRaw = cellWithVerticalInherit(grid, dataRow, 1);
      const waktuMatch = waktuRaw.match(WAKTU_REGEX);

      if (!currentHari) {
        // Belum pernah ketemu HARI di blok ini — baris ini tidak bisa diproses.
        if (waktuRaw) {
          warnings.push({
            level: "warning",
            message: `Baris ${dataRow + 1}: ada data jam tapi kolom HARI belum pernah terisi di blok ini.`,
            row: dataRow,
          });
        }
        dataRow++;
        continue;
      }

      if (!waktuMatch) {
        if (waktuRaw) {
          warnings.push({
            level: "warning",
            message: `Baris ${dataRow + 1}: format waktu "${waktuRaw}" tidak dikenali, baris dilewati.`,
            row: dataRow,
          });
        }
        dataRow++;
        continue;
      }

      const jamMulai = `${pad2(Number(waktuMatch[1]))}:${waktuMatch[2]}`;
      const jamSelesai = `${pad2(Number(waktuMatch[3]))}:${waktuMatch[4]}`;
      const mulaiMinutes = Number(waktuMatch[1]) * 60 + Number(waktuMatch[2]);
      const selesaiMinutes = Number(waktuMatch[3]) * 60 + Number(waktuMatch[4]);
      if (lastJamSelesaiMinutes !== null && mulaiMinutes < lastJamSelesaiMinutes) {
        warnings.push({
          level: "warning",
          message: `Baris ${dataRow + 1}: jam ${jamMulai}–${jamSelesai} tumpang tindih dengan slot sebelumnya di hari ${currentHari}.`,
          row: dataRow,
        });
      }
      lastJamSelesaiMinutes = selesaiMinutes;

      const jamKeRaw = cellWithVerticalInherit(grid, dataRow, 2);
      const jamKeNum = jamKeRaw ? Number(jamKeRaw.replace(/\D/g, "")) : NaN;
      const jamKe = Number.isFinite(jamKeNum) && jamKeNum > 0 ? jamKeNum : null;

      // Piket: hanya dibaca di baris pertama blok hari ini.
      if (isFirstRowOfHariBlock && piketCol < grid.colCount) {
        const piketRaw = normalize(grid.cell(dataRow, piketCol));
        if (piketRaw) {
          const namaGuru = piketRaw.split(GURU_SPLIT_REGEX).map(normalize).filter(Boolean);
          piket.push({ hari: currentHari, namaGuru, row: dataRow });
        }
      }

      // Cek merge horizontal yang menutupi seluruh rentang kolom kelas di baris ini.
      const fullRowMerge = grid.merges.find(
        (m) =>
          dataRow >= m.startRow &&
          dataRow <= m.endRow &&
          m.startCol <= colStart &&
          m.endCol >= colEnd,
      );
      if (fullRowMerge && rombelCols.length > 0) {
        const text = normalize(grid.cell(fullRowMerge.startRow, fullRowMerge.startCol));
        const jenis = matchKataKunci(text, kataKunci) ?? "kegiatan";
        for (const { nama } of rombelCols) {
          entries.push({
            hari: currentHari,
            jamMulai,
            jamSelesai,
            jamKe,
            rombelNama: nama,
            kodeMapel: null,
            namaGuru: [],
            jenisSlot: jenis,
            keterangan: text || null,
            row: dataRow,
          });
        }
        dataRow++;
        continue;
      }

      // Per-kolom kelas, dengan dukungan merge horizontal parsial (kegiatan gabungan beberapa kelas).
      const processedCols = new Set<number>();
      for (const { col, nama } of rombelCols) {
        if (processedCols.has(col)) continue;
        const partialMerge = grid.merges.find(
          (m) => dataRow >= m.startRow && dataRow <= m.endRow && m.startCol === col && m.endCol > m.startCol,
        );
        const spanCols = partialMerge
          ? rombelCols.filter((rc) => rc.col >= partialMerge.startCol && rc.col <= partialMerge.endCol)
          : [{ col, nama }];

        const raw = cellWithVerticalInherit(grid, dataRow, col);
        if (!raw) {
          spanCols.forEach((sc) => processedCols.add(sc.col));
          continue;
        }

        const kataKunciJenis = matchKataKunci(raw, kataKunci);
        const { kodeMapel, namaGuru } = kataKunciJenis ? { kodeMapel: null, namaGuru: [] } : parseMapelGuru(raw);

        for (const sc of spanCols) {
          entries.push({
            hari: currentHari,
            jamMulai,
            jamSelesai,
            jamKe,
            rombelNama: sc.nama,
            kodeMapel,
            namaGuru,
            jenisSlot: kataKunciJenis ?? "kbm",
            keterangan: kataKunciJenis ? raw : null,
            row: dataRow,
          });
          processedCols.add(sc.col);
        }
      }

      dataRow++;
    }

    row = dataRow;
  }

  return { entries, piket, rombelNames: rombelNamesSet, warnings };
}
