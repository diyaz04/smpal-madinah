import { z } from "zod";

import { TINGKAT_LIST } from "../constants";

export const createTujuanPembelajaranSchema = z.object({
  mapelId: z.string().min(1),
  tingkat: z.enum(TINGKAT_LIST),
  kode: z.string().trim().min(1, "Kode wajib diisi").max(20, "Maksimal 20 karakter"),
  deskripsi: z.string().trim().min(1, "Deskripsi wajib diisi").max(200, "Maksimal 200 karakter"),
});
export type CreateTujuanPembelajaranInput = z.infer<typeof createTujuanPembelajaranSchema>;

export const updateTujuanPembelajaranSchema = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi").max(20, "Maksimal 20 karakter"),
  deskripsi: z.string().trim().min(1, "Deskripsi wajib diisi").max(200, "Maksimal 200 karakter"),
});
export type UpdateTujuanPembelajaranInput = z.infer<typeof updateTujuanPembelajaranSchema>;

export const updateUrutanTujuanPembelajaranSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), urutan: z.number().int().min(0) })),
});
export type UpdateUrutanTujuanPembelajaranInput = z.infer<typeof updateUrutanTujuanPembelajaranSchema>;

export const salinTujuanPembelajaranSchema = z.object({
  dariPeriodId: z.string().min(1),
  mapelId: z.string().min(1),
  tingkat: z.enum(TINGKAT_LIST),
});
export type SalinTujuanPembelajaranInput = z.infer<typeof salinTujuanPembelajaranSchema>;
