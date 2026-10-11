import { describe, it, expect } from "vitest";

import { computeStatusDatang, computeStatusPulang, computeStatusHarianPresensi } from "./presensiGuru";

describe("computeStatusDatang", () => {
  it("tepat waktu kalau sebelum jam masuk", () => {
    expect(computeStatusDatang("06:55", "07:00", 15)).toEqual({ status: "tepat_waktu", menitTerlambat: 0 });
  });
  it("tepat waktu kalau masih dalam toleransi", () => {
    expect(computeStatusDatang("07:10", "07:00", 15)).toEqual({ status: "tepat_waktu", menitTerlambat: 0 });
  });
  it("terlambat kalau melewati toleransi", () => {
    expect(computeStatusDatang("07:20", "07:00", 15)).toEqual({ status: "terlambat", menitTerlambat: 20 });
  });
});

describe("computeStatusPulang", () => {
  it("tepat waktu kalau setelah/sama jam pulang", () => {
    expect(computeStatusPulang("15:00", "15:00")).toEqual({ status: "tepat_waktu", menitPulangCepat: 0 });
  });
  it("pulang cepat kalau sebelum jam pulang", () => {
    expect(computeStatusPulang("14:30", "15:00")).toEqual({ status: "pulang_cepat", menitPulangCepat: 30 });
  });
});

describe("computeStatusHarianPresensi", () => {
  it("terlambat menang atas pulang cepat", () => {
    expect(
      computeStatusHarianPresensi({ status: "terlambat", menitTerlambat: 10 }, { status: "pulang_cepat", menitPulangCepat: 5 }),
    ).toBe("terlambat");
  });
  it("tidak presensi pulang kalau datang tapi belum pulang", () => {
    expect(computeStatusHarianPresensi({ status: "tepat_waktu", menitTerlambat: 0 }, null)).toBe("tidak_presensi_pulang");
  });
  it("tepat waktu kalau keduanya tepat waktu", () => {
    expect(
      computeStatusHarianPresensi({ status: "tepat_waktu", menitTerlambat: 0 }, { status: "tepat_waktu", menitPulangCepat: 0 }),
    ).toBe("tepat_waktu");
  });
});
