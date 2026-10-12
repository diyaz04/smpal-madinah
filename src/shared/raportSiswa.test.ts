import { describe, it, expect } from "vitest";

import { buildKeteranganEkskulDefault, buildKenaikanDefault } from "./raportSiswa";

describe("buildKeteranganEkskulDefault", () => {
  it("menyusun teks default dari nama ekskul", () => {
    expect(buildKeteranganEkskulDefault("Pramuka")).toBe("Aktif dalam kegiatan Pramuka");
  });
});

describe("buildKenaikanDefault", () => {
  it("VII naik ke VIII", () => {
    expect(buildKenaikanDefault("VII")).toEqual({ keteranganKenaikan: "naik", kenaikanKeKelas: "VIII" });
  });

  it("VIII naik ke IX", () => {
    expect(buildKenaikanDefault("VIII")).toEqual({ keteranganKenaikan: "naik", kenaikanKeKelas: "IX" });
  });

  it("IX lulus, bukan naik", () => {
    expect(buildKenaikanDefault("IX")).toEqual({ keteranganKenaikan: "lulus", kenaikanKeKelas: null });
  });
});
