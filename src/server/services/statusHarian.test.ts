import { describe, it, expect } from "vitest";

import { computeStatusHarian, type StatusHarianEntry } from "./statusHarian.service";

describe("computeStatusHarian", () => {
  it("returns H when every pertemuan is marked hadir (status null)", () => {
    const entries: StatusHarianEntry[] = [
      { jumlahJp: 2, status: null },
      { jumlahJp: 1, status: null },
    ];
    expect(computeStatusHarian(entries)).toBe("H");
  });

  it("returns the status with the most JP", () => {
    const entries: StatusHarianEntry[] = [
      { jumlahJp: 1, status: "S" },
      { jumlahJp: 1, status: "S" },
      { jumlahJp: 1, status: null }, // hadir
    ];
    expect(computeStatusHarian(entries)).toBe("S");
  });

  it("treats Terlambat (T) and Dispensasi (D) as not reducing Hadir", () => {
    const entries: StatusHarianEntry[] = [
      { jumlahJp: 3, status: "T" },
      { jumlahJp: 3, status: "D" },
      { jumlahJp: 1, status: "A" },
    ];
    // 6 JP efektif Hadir (T/D tidak mengurangi) vs 1 JP Alpa -> Hadir menang
    expect(computeStatusHarian(entries)).toBe("H");
  });

  it("breaks a tie with priority S > I > A > H", () => {
    const tieSI: StatusHarianEntry[] = [
      { jumlahJp: 2, status: "S" },
      { jumlahJp: 2, status: "I" },
    ];
    expect(computeStatusHarian(tieSI)).toBe("S");

    const tieIA: StatusHarianEntry[] = [
      { jumlahJp: 2, status: "I" },
      { jumlahJp: 2, status: "A" },
    ];
    expect(computeStatusHarian(tieIA)).toBe("I");

    const tieAH: StatusHarianEntry[] = [
      { jumlahJp: 2, status: "A" },
      { jumlahJp: 2, status: null },
    ];
    expect(computeStatusHarian(tieAH)).toBe("A");

    const tieAll: StatusHarianEntry[] = [
      { jumlahJp: 1, status: "S" },
      { jumlahJp: 1, status: "I" },
      { jumlahJp: 1, status: "A" },
      { jumlahJp: 1, status: null },
    ];
    expect(computeStatusHarian(tieAll)).toBe("S");
  });

  it("returns H for an empty list of entries (no pertemuan that day)", () => {
    expect(computeStatusHarian([])).toBe("H");
  });

  it("picks Alpa over Hadir when Alpa has strictly more JP", () => {
    const entries: StatusHarianEntry[] = [
      { jumlahJp: 4, status: "A" },
      { jumlahJp: 2, status: null },
    ];
    expect(computeStatusHarian(entries)).toBe("A");
  });
});
