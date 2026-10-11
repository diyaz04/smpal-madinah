import { z } from "zod";

import { HARI_LIST, JENIS_SLOT_LIST } from "../constants";

export const createJadwalVersiSchema = z.object({
  nama: z.string().trim().min(1, "Nama versi wajib diisi").max(50, "Maksimal 50 karakter"),
});
export type CreateJadwalVersiInput = z.infer<typeof createJadwalVersiSchema>;

export const createJadwalSlotSchema = z.object({
  hari: z.enum(HARI_LIST),
  urutan: z.number().int().min(0),
  jamMulai: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Format jam HH:MM"),
  jamSelesai: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Format jam HH:MM"),
  jamKe: z.number().int().min(1).nullable(),
  jenisSlot: z.enum(JENIS_SLOT_LIST),
});
export type CreateJadwalSlotInput = z.infer<typeof createJadwalSlotSchema>;
export const updateJadwalSlotSchema = createJadwalSlotSchema;
export type UpdateJadwalSlotInput = z.infer<typeof updateJadwalSlotSchema>;

export const updateJadwalIsiSchema = z.object({
  mapelId: z.string().nullable(),
  keterangan: z.string().trim(),
  guruIds: z.array(z.string()),
});
export type UpdateJadwalIsiInput = z.infer<typeof updateJadwalIsiSchema>;

export const setPiketSchema = z.object({
  hari: z.enum(HARI_LIST),
  guruIds: z.array(z.string()),
});
export type SetPiketInput = z.infer<typeof setPiketSchema>;
