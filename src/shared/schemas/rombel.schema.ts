import { z } from "zod";

import { TINGKAT_LIST } from "../constants";

export const createRombelSchema = z.object({
  tingkat: z.enum(TINGKAT_LIST),
  nama: z.string().trim().min(1, "Nama rombel wajib diisi").max(20, "Maksimal 20 karakter"),
  waliGuruId: z.string().nullable(),
  urutan: z.number().int(),
});
export type CreateRombelInput = z.infer<typeof createRombelSchema>;

export const updateRombelSchema = createRombelSchema;
export type UpdateRombelInput = z.infer<typeof updateRombelSchema>;

export const copyRombelFromPeriodSchema = z.object({
  sourcePeriodId: z.string().min(1),
  keepWaliKelas: z.boolean(),
});
export type CopyRombelFromPeriodInput = z.infer<typeof copyRombelFromPeriodSchema>;

export const updateNomorAbsenSchema = z.object({
  items: z.array(z.object({ siswaId: z.string(), nomorAbsen: z.number().int().min(1) })),
});
export type UpdateNomorAbsenInput = z.infer<typeof updateNomorAbsenSchema>;
