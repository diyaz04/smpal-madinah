import { z } from "zod";

export const createSanksiAmbangSchema = z.object({
  poinMinimal: z.number().int().min(1, "Poin minimal 1").max(10000, "Terlalu besar"),
  nama: z.string().trim().min(1, "Nama sanksi wajib diisi").max(100, "Maksimal 100 karakter"),
  deskripsi: z.string().trim().max(300, "Maksimal 300 karakter"),
});
export type CreateSanksiAmbangInput = z.infer<typeof createSanksiAmbangSchema>;

export const updateSanksiAmbangSchema = createSanksiAmbangSchema;
export type UpdateSanksiAmbangInput = z.infer<typeof updateSanksiAmbangSchema>;
