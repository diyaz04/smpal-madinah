import { z } from "zod";

export const createCatatanTemplateSchema = z.object({
  teks: z.string().trim().min(1, "Teks wajib diisi").max(300, "Maksimal 300 karakter"),
});
export type CreateCatatanTemplateInput = z.infer<typeof createCatatanTemplateSchema>;

export const updateCatatanTemplateSchema = createCatatanTemplateSchema;
export type UpdateCatatanTemplateInput = z.infer<typeof updateCatatanTemplateSchema>;
