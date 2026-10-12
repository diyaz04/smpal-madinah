import { describe, it, expect } from "vitest";

import { pilihTpCapaianDefault, buildDeskripsiCapaian } from "./deskripsi";

describe("pilihTpCapaianDefault", () => {
  it("memilih TP dengan nilai tertinggi", () => {
    expect(
      pilihTpCapaianDefault([
        { tpId: "tp1", nilai: 80 },
        { tpId: "tp2", nilai: 95 },
        { tpId: "tp3", nilai: 70 },
      ]),
    ).toBe("tp2");
  });

  it("mengabaikan TP yang nilainya null", () => {
    expect(
      pilihTpCapaianDefault([
        { tpId: "tp1", nilai: null },
        { tpId: "tp2", nilai: 60 },
      ]),
    ).toBe("tp2");
  });

  it("jatuh balik ke TP pertama kalau semua kosong", () => {
    expect(
      pilihTpCapaianDefault([
        { tpId: "tp1", nilai: null },
        { tpId: "tp2", nilai: null },
      ]),
    ).toBe("tp1");
  });

  it("null kalau tidak ada TP sama sekali", () => {
    expect(pilihTpCapaianDefault([])).toBeNull();
  });

  it("nilai sama persis tetap memilih salah satu secara stabil (yang pertama ditemui)", () => {
    expect(
      pilihTpCapaianDefault([
        { tpId: "tp1", nilai: 90 },
        { tpId: "tp2", nilai: 90 },
      ]),
    ).toBe("tp1");
  });
});

describe("buildDeskripsiCapaian", () => {
  it("menyusun kalimat sesuai pola tetap", () => {
    expect(buildDeskripsiCapaian("sangat baik", "Memahami Teks Berita")).toBe(
      "Menunjukkan penguasaan yang sangat baik dalam Memahami Teks Berita.",
    );
  });

  it("mendukung teks TP berhuruf Arab (Unicode) tanpa rusak", () => {
    expect(buildDeskripsiCapaian("baik", "البيت")).toBe("Menunjukkan penguasaan yang baik dalam البيت.");
  });
});
