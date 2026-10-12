import { describe, it, expect } from "vitest";

import { hitungRataTp, bulatkan, hitungNilaiAkhir, tentukanPredikat } from "./nilai";

describe("hitungRataTp", () => {
  it("rata-rata dari TP yang terisi", () => {
    expect(hitungRataTp([80, 90, 100])).toBe(90);
  });

  it("mengabaikan TP kosong, bukan menganggap 0", () => {
    expect(hitungRataTp([80, null, 100])).toBe(90);
  });

  it("null kalau semua TP kosong", () => {
    expect(hitungRataTp([null, null])).toBeNull();
  });

  it("null kalau tidak ada TP sama sekali", () => {
    expect(hitungRataTp([])).toBeNull();
  });
});

describe("bulatkan", () => {
  it("membulatkan ke integer kalau desimal 0", () => {
    expect(bulatkan(87.6, 0)).toBe(88);
    expect(bulatkan(87.4, 0)).toBe(87);
  });

  it("membulatkan ke 1 desimal", () => {
    expect(bulatkan(87.46, 1)).toBe(87.5);
  });
});

describe("hitungNilaiAkhir", () => {
  const bobotDefault = { bobotTp: 50, bobotSts: 25, bobotSas: 25 };

  it("menghitung sesuai bobot default 50/25/25", () => {
    // rataTp=90, sts=80, sas=70 -> 90*0.5 + 80*0.25 + 70*0.25 = 45+20+17.5 = 82.5 -> bulat 83 (round half away from zero di JS: 82.5 -> 83)
    expect(hitungNilaiAkhir([90, 90], 80, 70, bobotDefault, 0)).toBe(83);
  });

  it("mengabaikan TP kosong saat menghitung rata-rata TP", () => {
    expect(hitungNilaiAkhir([90, null], 80, 70, bobotDefault, 0)).toBe(83);
  });

  it("null kalau belum ada TP terisi sama sekali", () => {
    expect(hitungNilaiAkhir([null, null], 80, 70, bobotDefault, 0)).toBeNull();
  });

  it("null kalau STS belum diisi", () => {
    expect(hitungNilaiAkhir([90], null, 70, bobotDefault, 0)).toBeNull();
  });

  it("null kalau SAS belum diisi", () => {
    expect(hitungNilaiAkhir([90], 80, null, bobotDefault, 0)).toBeNull();
  });

  it("mendukung bobot custom (bukan 50/25/25)", () => {
    // rataTp=100, sts=100, sas=0, bobot 20/20/60 -> 20+20+0 = 40
    expect(hitungNilaiAkhir([100], 100, 0, { bobotTp: 20, bobotSts: 20, bobotSas: 60 }, 0)).toBe(40);
  });
});

describe("tentukanPredikat", () => {
  const config = [
    { batasBawah: 0, label: "cukup baik" },
    { batasBawah: 75, label: "baik" },
    { batasBawah: 90, label: "sangat baik" },
  ];

  it("memilih rentang tertinggi yang terlampaui", () => {
    expect(tentukanPredikat(95, config)).toBe("sangat baik");
    expect(tentukanPredikat(80, config)).toBe("baik");
    expect(tentukanPredikat(50, config)).toBe("cukup baik");
  });

  it("tepat di batas bawah tetap masuk rentang itu", () => {
    expect(tentukanPredikat(90, config)).toBe("sangat baik");
  });

  it("null kalau nilai null", () => {
    expect(tentukanPredikat(null, config)).toBeNull();
  });

  it("null kalau rentang kosong", () => {
    expect(tentukanPredikat(80, [])).toBeNull();
  });
});
