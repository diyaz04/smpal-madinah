import { z } from "zod";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const themeSchema = z.object({
  primaryColor: z.string().regex(hexColorRegex, "Format warna tidak valid (contoh: #4f46e5)"),
});
export type ThemeInput = z.infer<typeof themeSchema>;

// Tidak pakai .transform()/.default() — lihat catatan di user.schema.ts.
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.union([z.string().trim().email("Format email tidak valid"), z.literal("")]),
  phone: z.string().trim(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
