import { describe, it, expect } from "vitest";

import { tentukanAmbangBaruTercapai } from "./sanksi";

const AMBANG = [
  { id: "a25", poinMinimal: 25 },
  { id: "a50", poinMinimal: 50 },
  { id: "a75", poinMinimal: 75 },
  { id: "a100", poinMinimal: 100 },
];

describe("tentukanAmbangBaruTercapai", () => {
  it("kosong kalau belum ada ambang terlampaui", () => {
    expect(tentukanAmbangBaruTercapai(10, AMBANG, new Set())).toEqual([]);
  });

  it("satu ambang terlampaui", () => {
    expect(tentukanAmbangBaruTercapai(30, AMBANG, new Set())).toEqual([{ id: "a25", poinMinimal: 25 }]);
  });

  it("beberapa ambang terlampaui sekaligus (razia poin langsung besar), urut dari terkecil", () => {
    expect(tentukanAmbangBaruTercapai(80, AMBANG, new Set())).toEqual([
      { id: "a25", poinMinimal: 25 },
      { id: "a50", poinMinimal: 50 },
      { id: "a75", poinMinimal: 75 },
    ]);
  });

  it("ambang yang sudah pernah tercatat tidak diulang", () => {
    expect(tentukanAmbangBaruTercapai(80, AMBANG, new Set(["a25", "a50"]))).toEqual([
      { id: "a75", poinMinimal: 75 },
    ]);
  });

  it("poin pas di batas minimal tetap terhitung", () => {
    expect(tentukanAmbangBaruTercapai(25, AMBANG, new Set())).toEqual([{ id: "a25", poinMinimal: 25 }]);
  });
});
