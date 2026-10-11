import { describe, it, expect } from "vitest";

import { parseJadwalSheet, type SheetGrid, type MergeRange } from "./jadwal-parser";

function buildGrid(rows: (string | null)[][], merges: MergeRange[] = []): SheetGrid {
  const colCount = Math.max(...rows.map((r) => r.length));
  return {
    rowCount: rows.length,
    colCount,
    cell(row, col) {
      return rows[row]?.[col] ?? null;
    },
    merges,
  };
}

describe("parseJadwalSheet", () => {
  it("parses a basic single-day single-class KBM slot with mapel code and guru name", () => {
    const grid = buildGrid([
      ["HARI", "WAKTU", "JAM KE-", "KELAS", "", "PIKET"],
      ["", "", "", "7A", "7B", ""],
      ["SENIN", "07.00 - 07.40", "1", "Mate (Ahmad Fauzi)", "IPA (Dewi Lestari)", ""],
    ]);

    const result = parseJadwalSheet(grid);

    expect(result.warnings).toEqual([]);
    expect(result.rombelNames).toEqual(["7A", "7B"]);
    expect(result.entries).toHaveLength(2);

    const entry7A = result.entries.find((e) => e.rombelNama === "7A")!;
    expect(entry7A.hari).toBe("SENIN");
    expect(entry7A.jamMulai).toBe("07:00");
    expect(entry7A.jamSelesai).toBe("07:40");
    expect(entry7A.jamKe).toBe(1);
    expect(entry7A.kodeMapel).toBe("Mate");
    expect(entry7A.namaGuru).toEqual(["Ahmad Fauzi"]);
    expect(entry7A.jenisSlot).toBe("kbm");

    const entry7B = result.entries.find((e) => e.rombelNama === "7B")!;
    expect(entry7B.kodeMapel).toBe("IPA");
    expect(entry7B.namaGuru).toEqual(["Dewi Lestari"]);
  });

  it("splits team-teaching guru names separated by & and 'dan'", () => {
    const grid = buildGrid([
      ["HARI", "WAKTU", "JAM KE-", "KELAS", "", "PIKET"],
      ["", "", "", "7A", "7B", ""],
      ["SENIN", "07.00-07.40", "1", "PKN (Ahmad Fauzi & Dewi Lestari)", "Mate (Budi dan Citra)", ""],
    ]);

    const result = parseJadwalSheet(grid);

    const entry7A = result.entries.find((e) => e.rombelNama === "7A")!;
    expect(entry7A.namaGuru).toEqual(["Ahmad Fauzi", "Dewi Lestari"]);

    const entry7B = result.entries.find((e) => e.rombelNama === "7B")!;
    expect(entry7B.namaGuru).toEqual(["Budi", "Citra"]);
  });

  it("inherits HARI and WAKTU/JAM KE- down a vertical merge", () => {
    // Baris 2-4 (SENIN jam ke-1..3) merge vertikal di kolom HARI; hanya baris
    // anchor (row 2) yang berisi teks, baris berikutnya kosong tapi mewarisi.
    const grid = buildGrid(
      [
        ["HARI", "WAKTU", "JAM KE-", "KELAS"],
        ["", "", "", "7A"],
        ["SENIN", "07.00-07.40", "1", "Mate (Ahmad)"],
        [null, "07.40-08.20", "2", "IPA (Budi)"],
        [null, "08.20-09.00", "3", "B.Indo (Citra)"],
      ],
      [{ startRow: 2, endRow: 4, startCol: 0, endCol: 0 }],
    );

    const result = parseJadwalSheet(grid);

    expect(result.entries).toHaveLength(3);
    expect(result.entries.every((e) => e.hari === "SENIN")).toBe(true);
    expect(result.entries.map((e) => e.jamKe)).toEqual([1, 2, 3]);
  });

  it("treats a full-width horizontal merge as a single kegiatan entry per kata kunci", () => {
    const grid = buildGrid(
      [
        ["HARI", "WAKTU", "JAM KE-", "KELAS", ""],
        ["", "", "", "7A", "7B"],
        ["SENIN", "09.00-09.20", "", "Istirahat", "Istirahat"],
      ],
      [{ startRow: 2, endRow: 2, startCol: 3, endCol: 4 }],
    );

    const result = parseJadwalSheet(grid);

    expect(result.entries).toHaveLength(2);
    expect(result.entries.every((e) => e.jenisSlot === "istirahat")).toBe(true);
    expect(result.entries.every((e) => e.kodeMapel === null)).toBe(true);
  });

  it("duplicates content to every rombel covered by a partial horizontal merge", () => {
    // Kegiatan gabungan 2 dari 3 kelas (mis. kelas 7A+7B gabung Pramuka),
    // kelas 7C tetap punya jadwal sendiri.
    const grid = buildGrid(
      [
        ["HARI", "WAKTU", "JAM KE-", "KELAS", "", ""],
        ["", "", "", "7A", "7B", "7C"],
        ["SENIN", "14.00-15.00", "", "Pramuka (Ahmad)", "", "Mate (Budi)"],
      ],
      [{ startRow: 2, endRow: 2, startCol: 3, endCol: 4 }],
    );

    const result = parseJadwalSheet(grid);

    expect(result.entries).toHaveLength(3);
    const a = result.entries.find((e) => e.rombelNama === "7A")!;
    const b = result.entries.find((e) => e.rombelNama === "7B")!;
    const c = result.entries.find((e) => e.rombelNama === "7C")!;
    expect(a.kodeMapel).toBe("Pramuka");
    expect(b.kodeMapel).toBe("Pramuka");
    expect(b.namaGuru).toEqual(["Ahmad"]);
    expect(c.kodeMapel).toBe("Mate");
  });

  it("reads the piket column only on the first row of each hari block", () => {
    const grid = buildGrid(
      [
        ["HARI", "WAKTU", "JAM KE-", "KELAS", "PIKET"],
        ["", "", "", "7A", ""],
        ["SENIN", "07.00-07.40", "1", "Mate (Ahmad)", "Ahmad Fauzi & Dewi Lestari"],
        [null, "07.40-08.20", "2", "IPA (Budi)", "Harusnya diabaikan"],
      ],
      [{ startRow: 2, endRow: 3, startCol: 0, endCol: 0 }],
    );

    const result = parseJadwalSheet(grid);

    expect(result.piket).toHaveLength(1);
    expect(result.piket[0]!.hari).toBe("SENIN");
    expect(result.piket[0]!.namaGuru).toEqual(["Ahmad Fauzi", "Dewi Lestari"]);
  });

  it("ignores helper columns to the right of the Piket column", () => {
    const grid = buildGrid([
      ["HARI", "WAKTU", "JAM KE-", "KELAS", "PIKET", "Catatan Internal"],
      ["", "", "", "7A", "", ""],
      ["SENIN", "07.00-07.40", "1", "Mate (Ahmad)", "Ahmad Fauzi", "JANGAN DIBACA"],
    ]);

    const result = parseJadwalSheet(grid);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.kodeMapel).toBe("Mate");
    // Kolom "Catatan Internal" tidak pernah muncul sebagai rombel atau warning.
    expect(result.rombelNames).toEqual(["7A"]);
  });

  it("flags overlapping time slots within the same hari as a warning, not an error that stops parsing", () => {
    const grid = buildGrid([
      ["HARI", "WAKTU", "JAM KE-", "KELAS"],
      ["", "", "", "7A"],
      ["SENIN", "07.00-07.40", "1", "Mate (Ahmad)"],
      ["", "07.30-08.10", "2", "IPA (Budi)"],
    ]);

    const result = parseJadwalSheet(grid);

    expect(result.entries).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.level).toBe("warning");
    expect(result.warnings[0]!.message).toMatch(/tumpang tindih/);
  });

  it("flags an unreadable WAKTU cell as a warning and skips that row without throwing", () => {
    const grid = buildGrid([
      ["HARI", "WAKTU", "JAM KE-", "KELAS"],
      ["", "", "", "7A"],
      ["SENIN", "jam pertama", "1", "Mate (Ahmad)"],
      ["", "07.40-08.20", "2", "IPA (Budi)"],
    ]);

    const result = parseJadwalSheet(grid);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.kodeMapel).toBe("IPA");
    expect(result.warnings.some((w) => w.message.includes("tidak dikenali"))).toBe(true);
  });

  it("handles multiple header blocks in the same sheet (e.g. one per tingkat)", () => {
    const grid = buildGrid([
      ["HARI", "WAKTU", "JAM KE-", "KELAS"],
      ["", "", "", "7A"],
      ["SENIN", "07.00-07.40", "1", "Mate (Ahmad)"],
      ["HARI", "WAKTU", "JAM KE-", "KELAS"],
      ["", "", "", "8A"],
      ["SENIN", "07.00-07.40", "1", "IPA (Budi)"],
    ]);

    const result = parseJadwalSheet(grid);

    expect(result.rombelNames).toEqual(["7A", "8A"]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries.find((e) => e.rombelNama === "7A")!.kodeMapel).toBe("Mate");
    expect(result.entries.find((e) => e.rombelNama === "8A")!.kodeMapel).toBe("IPA");
  });

  it("matches kata kunci case-insensitively for pembiasaan and upacara", () => {
    const grid = buildGrid(
      [
        ["HARI", "WAKTU", "JAM KE-", "KELAS", ""],
        ["", "", "", "7A", "7B"],
        ["SENIN", "06.30-07.00", "", "Tadarus Pagi", "Tadarus Pagi"],
        ["SENIN", "07.00-07.40", "", "Upacara Bendera", "Upacara Bendera"],
      ],
      [
        { startRow: 2, endRow: 2, startCol: 3, endCol: 4 },
        { startRow: 3, endRow: 3, startCol: 3, endCol: 4 },
      ],
    );

    const result = parseJadwalSheet(grid);

    expect(result.entries.filter((e) => e.jenisSlot === "pembiasaan")).toHaveLength(2);
    expect(result.entries.filter((e) => e.jenisSlot === "upacara")).toHaveLength(2);
  });

  it("returns an empty result without throwing for a sheet with no header row", () => {
    const grid = buildGrid([
      ["Catatan", "Ini bukan jadwal"],
      ["Baris", "lain"],
    ]);

    const result = parseJadwalSheet(grid);

    expect(result.entries).toEqual([]);
    expect(result.piket).toEqual([]);
    expect(result.rombelNames).toEqual([]);
  });
});
