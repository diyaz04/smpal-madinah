import { describe, it, expect } from "vitest";

import { buildJudulRaportDefault, buildKeteranganRaportDefault } from "./prestasi";

describe("buildJudulRaportDefault", () => {
  it("menyusun judul dari capaian, nama kegiatan, dan tingkat", () => {
    expect(buildJudulRaportDefault("Juara 1", "Lomba Pidato", "Kabupaten/Kota")).toBe(
      "Juara 1 Lomba Pidato Tingkat Kabupaten/Kota",
    );
  });
});

describe("buildKeteranganRaportDefault", () => {
  it("menyertakan penyelenggara kalau ada", () => {
    expect(buildKeteranganRaportDefault("Dinas Pendidikan", "Ganjil", "2025/2026")).toBe(
      "Dinas Pendidikan Semester Ganjil TP 2025/2026",
    );
  });

  it("tanpa penyelenggara kalau null", () => {
    expect(buildKeteranganRaportDefault(null, "Genap", "2025/2026")).toBe("Semester Genap TP 2025/2026");
  });
});
