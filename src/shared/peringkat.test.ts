import { describe, it, expect } from "vitest";

import { hitungPeringkat } from "./peringkat";

describe("hitungPeringkat", () => {
  it("peringkat berurutan kalau tidak ada seri", () => {
    expect(
      hitungPeringkat([
        { siswaId: "a", jumlah: 90 },
        { siswaId: "b", jumlah: 80 },
        { siswaId: "c", jumlah: 70 },
      ]),
    ).toEqual([
      { siswaId: "a", peringkat: 1 },
      { siswaId: "b", peringkat: 2 },
      { siswaId: "c", peringkat: 3 },
    ]);
  });

  it("nilai sama dapat peringkat sama, lompat gaya 1-2-2-4", () => {
    const hasil = hitungPeringkat([
      { siswaId: "a", jumlah: 90 },
      { siswaId: "b", jumlah: 85 },
      { siswaId: "c", jumlah: 85 },
      { siswaId: "d", jumlah: 70 },
    ]);
    const byId = new Map(hasil.map((h) => [h.siswaId, h.peringkat]));
    expect(byId.get("a")).toBe(1);
    expect(byId.get("b")).toBe(2);
    expect(byId.get("c")).toBe(2);
    expect(byId.get("d")).toBe(4);
  });

  it("tidak peduli urutan input, tetap mengurutkan sendiri", () => {
    const hasil = hitungPeringkat([
      { siswaId: "x", jumlah: 70 },
      { siswaId: "y", jumlah: 90 },
    ]);
    expect(hasil.find((h) => h.siswaId === "y")?.peringkat).toBe(1);
    expect(hasil.find((h) => h.siswaId === "x")?.peringkat).toBe(2);
  });

  it("semua nilai sama -> semua peringkat 1", () => {
    const hasil = hitungPeringkat([
      { siswaId: "a", jumlah: 50 },
      { siswaId: "b", jumlah: 50 },
      { siswaId: "c", jumlah: 50 },
    ]);
    expect(hasil.every((h) => h.peringkat === 1)).toBe(true);
  });

  it("array kosong menghasilkan array kosong", () => {
    expect(hitungPeringkat([])).toEqual([]);
  });
});
