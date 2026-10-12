import { z } from "zod";

export const createEkskulSchema = z.object({
  nama: z.string().trim().min(1, "Nama ekskul wajib diisi").max(100, "Maksimal 100 karakter"),
  pembinaGuruId: z.string().nullable(),
  aktif: z.boolean(),
});
export type CreateEkskulInput = z.infer<typeof createEkskulSchema>;

export const updateEkskulSchema = createEkskulSchema;
export type UpdateEkskulInput = z.infer<typeof updateEkskulSchema>;
