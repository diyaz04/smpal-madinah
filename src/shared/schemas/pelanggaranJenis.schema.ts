import { z } from "zod";

export const createPelanggaranJenisSchema = z.object({
  kategoriId: z.string().min(1, "Pilih kategori"),
  nama: z.string().trim().min(1, "Nama jenis wajib diisi").max(150, "Maksimal 150 karakter"),
  poin: z.number().int().min(1, "Poin minimal 1").max(1000, "Poin maksimal 1000"),
  deskripsi: z.string().trim().max(300, "Maksimal 300 karakter"),
  aktif: z.boolean(),
});
export type CreatePelanggaranJenisInput = z.infer<typeof createPelanggaranJenisSchema>;

export const updatePelanggaranJenisSchema = createPelanggaranJenisSchema;
export type UpdatePelanggaranJenisInput = z.infer<typeof updatePelanggaranJenisSchema>;
