import { z } from "zod";

export const createPelanggaranKategoriSchema = z.object({
  nama: z.string().trim().min(1, "Nama kategori wajib diisi").max(50, "Maksimal 50 karakter"),
  warna: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Format warna tidak valid"),
});
export type CreatePelanggaranKategoriInput = z.infer<typeof createPelanggaranKategoriSchema>;

export const updatePelanggaranKategoriSchema = createPelanggaranKategoriSchema;
export type UpdatePelanggaranKategoriInput = z.infer<typeof updatePelanggaranKategoriSchema>;

export const updateUrutanPelanggaranKategoriSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), urutan: z.number().int().min(0) })),
});
export type UpdateUrutanPelanggaranKategoriInput = z.infer<typeof updateUrutanPelanggaranKategoriSchema>;
