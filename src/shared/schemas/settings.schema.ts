import { z } from "zod";

// Sengaja tidak pakai .default()/.transform() — tipe input/output zod yang
// berbeda bikin react-hook-form + zodResolver konflik tipe (lihat juga
// shared/schemas/user.schema.ts). Field opsional cukup string biasa (boleh "").
export const schoolProfileSchema = z.object({
  nama: z.string().trim().min(1, "Nama sekolah wajib diisi"),
  npsn: z.string().trim(),
  alamat: z.string().trim(),
  kecamatan: z.string().trim(),
  kabupaten_kota: z.string().trim(),
  provinsi: z.string().trim(),
  telepon: z.string().trim(),
  email: z.string().trim(),
  website: z.string().trim(),
  kepala_sekolah_nama: z.string().trim(),
  kepala_sekolah_nip: z.string().trim(),
});
export type SchoolProfile = z.infer<typeof schoolProfileSchema>;

export const brandingSchema = z.object({
  logo_file_id: z.string().nullable(),
  kop_file_id: z.string().nullable(),
  default_primary_color: z.string(),
});
export type Branding = z.infer<typeof brandingSchema>;

export interface PublicBranding {
  schoolName: string;
  logoUrl: string | null;
  defaultPrimaryColor: string;
}

export const updateSettingsSchema = z.object({
  schoolProfile: schoolProfileSchema,
  defaultPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format warna tidak valid"),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
