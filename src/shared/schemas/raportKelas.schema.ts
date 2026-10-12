import { z } from "zod";

import { EKSKUL_PREDIKAT_LIST, KETERANGAN_KENAIKAN_LIST } from "../constants";

export const saveEkskulNilaiSchema = z.object({
  siswaId: z.string().min(1),
  ekskulId: z.string().min(1),
  predikat: z.enum(EKSKUL_PREDIKAT_LIST),
  keterangan: z.string().trim().max(200, "Maksimal 200 karakter"),
});
export type SaveEkskulNilaiInput = z.infer<typeof saveEkskulNilaiSchema>;

export const saveKehadiranOverrideSchema = z.object({
  siswaId: z.string().min(1),
  overrideSakit: z.number().int().min(0).max(366).nullable(),
  overrideIzin: z.number().int().min(0).max(366).nullable(),
  overrideAlpa: z.number().int().min(0).max(366).nullable(),
  alasanOverrideKehadiran: z.string().trim().max(300, "Maksimal 300 karakter"),
});
export type SaveKehadiranOverrideInput = z.infer<typeof saveKehadiranOverrideSchema>;

export const saveCatatanPendidikSchema = z.object({
  siswaId: z.string().min(1),
  catatanPendidik: z.string().trim().max(500, "Maksimal 500 karakter"),
});
export type SaveCatatanPendidikInput = z.infer<typeof saveCatatanPendidikSchema>;

export const saveKenaikanKelasSchema = z.object({
  siswaId: z.string().min(1),
  keteranganKenaikan: z.enum(KETERANGAN_KENAIKAN_LIST),
  kenaikanKeKelas: z.string().trim().max(20, "Maksimal 20 karakter"),
});
export type SaveKenaikanKelasInput = z.infer<typeof saveKenaikanKelasSchema>;

export const bukaKunciRombelSchema = z.object({
  alasan: z.string().trim().min(1, "Alasan wajib diisi").max(300, "Maksimal 300 karakter"),
});
export type BukaKunciRombelInput = z.infer<typeof bukaKunciRombelSchema>;
