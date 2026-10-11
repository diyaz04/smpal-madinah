import { z } from "zod";

import { PRESENSI_JENIS_LIST, MODE_JAM_MASUK_LIST, HARI_LIST, RETENSI_FOTO_PILIHAN } from "../constants";

export const submitPresensiWajahSchema = z.object({
  guruId: z.string().min(1),
  jenis: z.enum(PRESENSI_JENIS_LIST),
  fotoFileId: z.string().min(1),
  skorKemiripan: z.number().min(0).max(1),
  livenessLolos: z.boolean(),
  embeddingUntukBelajar: z.string().nullable(),
  sumber: z.enum(["langsung", "antrean_offline"]),
  waktuPerangkat: z.string().nullable(),
});
export type SubmitPresensiWajahInput = z.infer<typeof submitPresensiWajahSchema>;

export const submitPresensiPinSchema = z.object({
  guruId: z.string().min(1),
  jenis: z.enum(PRESENSI_JENIS_LIST),
  pin: z.string().trim().min(4).max(6),
  fotoFileId: z.string().min(1),
  sumber: z.enum(["langsung", "antrean_offline"]),
  waktuPerangkat: z.string().nullable(),
});
export type SubmitPresensiPinInput = z.infer<typeof submitPresensiPinSchema>;

const jamKerjaHariSchema = z.object({ masuk: z.string(), pulang: z.string() }).nullable();

export const updatePengaturanPresensiSchema = z.object({
  modeJamMasuk: z.enum(MODE_JAM_MASUK_LIST),
  toleransiTerlambatMenit: z.number().int().min(0).max(120),
  offsetJadwalMengajarMenit: z.number().int().min(0).max(60),
  jamKerja: z.object(Object.fromEntries(HARI_LIST.map((h) => [h, jamKerjaHariSchema])) as Record<(typeof HARI_LIST)[number], typeof jamKerjaHariSchema>),
  retensiFotoHari: z.union([z.literal(RETENSI_FOTO_PILIHAN[0]), z.literal(RETENSI_FOTO_PILIHAN[1]), z.literal(RETENSI_FOTO_PILIHAN[2])]),
  ambangKemiripanWajah: z.number().min(0).max(1),
  descriptorOtomatisAktif: z.boolean(),
});
export type UpdatePengaturanPresensiInput = z.infer<typeof updatePengaturanPresensiSchema>;

export const gantiPinSchema = z
  .object({
    pinLama: z.string().trim().min(4).max(6),
    pinBaru: z.string().trim().min(4).max(6),
    konfirmasiPinBaru: z.string().trim().min(4).max(6),
  })
  .refine((v) => v.pinBaru === v.konfirmasiPinBaru, { message: "Konfirmasi PIN tidak cocok", path: ["konfirmasiPinBaru"] });
export type GantiPinInput = z.infer<typeof gantiPinSchema>;
