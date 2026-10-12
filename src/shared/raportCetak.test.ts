import { describe, it, expect } from "vitest";

import { buildBarisCapaian, resolveKehadiran, samarkanNisn } from "./raportCetak";
import type { MapelStrukturNode, NilaiMapelRef } from "./raportCetak";

describe("buildBarisCapaian", () => {
  it("mapel berdiri sendiri bernomor biasa", () => {
    const struktur: MapelStrukturNode[] = [
      { id: "m1", nama: "Matematika", urutan: 1, anak: [] },
      { id: "m2", nama: "IPA", urutan: 2, anak: [] },
    ];
    const nilai: Record<string, NilaiMapelRef> = {
      m1: { nilai: 90, deskripsi: "Baik" },
      m2: { nilai: 80, deskripsi: "Cukup" },
    };
    const { rows, jumlah } = buildBarisCapaian(struktur, nilai);
    expect(rows).toEqual([
      { nomor: "1.", mapelNama: "Matematika", nilaiAkhir: 90, capaianKompetensi: "Baik", isHeader: false },
      { nomor: "2.", mapelNama: "IPA", nilaiAkhir: 80, capaianKompetensi: "Cukup", isHeader: false },
    ]);
    expect(jumlah).toBe(170);
  });

  it("mapel induk jadi baris judul bernomor tanpa nilai, sub-mapel huruf tanpa nomor", () => {
    const struktur: MapelStrukturNode[] = [
      {
        id: "pai",
        nama: "PAI",
        urutan: 1,
        anak: [
          { id: "pai-a", nama: "Al-Quran Hadis", urutan: 1 },
          { id: "pai-b", nama: "Akidah Akhlak", urutan: 2 },
        ],
      },
      { id: "mtk", nama: "Matematika", urutan: 2, anak: [] },
    ];
    const nilai: Record<string, NilaiMapelRef> = {
      "pai-a": { nilai: 85, deskripsi: null },
      "pai-b": { nilai: 90, deskripsi: null },
      mtk: { nilai: 75, deskripsi: null },
    };
    const { rows, jumlah } = buildBarisCapaian(struktur, nilai);
    expect(rows).toEqual([
      { nomor: "1.", mapelNama: "PAI", nilaiAkhir: null, capaianKompetensi: null, isHeader: true },
      { nomor: "A.", mapelNama: "Al-Quran Hadis", nilaiAkhir: 85, capaianKompetensi: null, isHeader: false },
      { nomor: "B.", mapelNama: "Akidah Akhlak", nilaiAkhir: 90, capaianKompetensi: null, isHeader: false },
      { nomor: "2.", mapelNama: "Matematika", nilaiAkhir: 75, capaianKompetensi: null, isHeader: false },
    ]);
    // Jumlah tidak menghitung baris judul induk (tidak punya nilai sendiri)
    expect(jumlah).toBe(250);
  });

  it("nilai kosong (belum lengkap) tidak ikut dijumlahkan", () => {
    const struktur: MapelStrukturNode[] = [{ id: "m1", nama: "Matematika", urutan: 1, anak: [] }];
    const { jumlah } = buildBarisCapaian(struktur, { m1: { nilai: null, deskripsi: null } });
    expect(jumlah).toBe(0);
  });
});

describe("resolveKehadiran", () => {
  it("pakai override kalau ada", () => {
    expect(resolveKehadiran(5, 10)).toBe(5);
  });
  it("pakai otomatis kalau override null", () => {
    expect(resolveKehadiran(null, 10)).toBe(10);
  });
  it("override 0 tetap dipakai (bukan dianggap kosong)", () => {
    expect(resolveKehadiran(0, 10)).toBe(0);
  });
});

describe("samarkanNisn", () => {
  it("menyisakan 2 digit awal & akhir untuk NISN standar 10 digit", () => {
    expect(samarkanNisn("1234567890")).toBe("12******90");
  });

  it("NISN pendek (<=4 digit) disamarkan total", () => {
    expect(samarkanNisn("1234")).toBe("****");
  });
});
