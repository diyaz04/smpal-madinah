import { z } from "zod";

import { JENIS_KELAMIN_LIST, STATUS_KEPEGAWAIAN_LIST } from "../constants";

// Sengaja tidak pakai .transform()/.default() — konflik tipe dengan
// zodResolver + useForm (lihat DECISIONS.md).
export const createGuruSchema = z.object({
  nip: z.string().trim(),
  nuptk: z.string().trim(),
  namaLengkap: z.string().trim().min(1, "Nama lengkap wajib diisi").max(100, "Maksimal 100 karakter"),
  namaTanpaGelar: z.string().trim().min(1, "Nama tanpa gelar wajib diisi").max(100, "Maksimal 100 karakter"),
  jenisKelamin: z.enum(JENIS_KELAMIN_LIST),
  tempatLahir: z.string().trim(),
  tanggalLahir: z.string().trim().min(1, "Tanggal lahir wajib diisi"),
  noHp: z.string().trim(),
  email: z.union([z.string().trim().email("Format email tidak valid"), z.literal("")]),
  alamat: z.string().trim(),
  statusKepegawaian: z.enum(STATUS_KEPEGAWAIAN_LIST),
  tanggalMulaiTugas: z.string().trim(),
  isActive: z.boolean(),
});
export type CreateGuruInput = z.infer<typeof createGuruSchema>;

export const updateGuruSchema = createGuruSchema;
export type UpdateGuruInput = z.infer<typeof updateGuruSchema>;

export const guruListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type GuruListQuery = z.infer<typeof guruListQuerySchema>;

export const buatAkunGuruSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(32, "Username maksimal 32 karakter")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, strip"),
  roleIds: z.array(z.string()).min(1, "Pilih minimal satu role"),
});
export type BuatAkunGuruInput = z.infer<typeof buatAkunGuruSchema>;

export const addGuruAliasSchema = z.object({
  aliasNama: z.string().trim().min(1, "Alias wajib diisi").max(100, "Maksimal 100 karakter"),
});
export type AddGuruAliasInput = z.infer<typeof addGuruAliasSchema>;

export const addTugasTambahanSchema = z.object({
  namaTugas: z.string().trim().min(1, "Nama tugas wajib diisi").max(50, "Maksimal 50 karakter"),
  keterangan: z.string().trim(),
});
export type AddTugasTambahanInput = z.infer<typeof addTugasTambahanSchema>;

export const importGuruRowSchema = z.object({
  nip: z.string().trim(),
  nuptk: z.string().trim(),
  namaLengkap: z.string().trim(),
  namaTanpaGelar: z.string().trim(),
  jenisKelamin: z.string().trim(),
  tempatLahir: z.string().trim(),
  tanggalLahir: z.string().trim(),
  noHp: z.string().trim(),
  email: z.string().trim(),
  alamat: z.string().trim(),
  statusKepegawaian: z.string().trim(),
  tanggalMulaiTugas: z.string().trim(),
});
export type ImportGuruRow = z.infer<typeof importGuruRowSchema>;

export const importGuruCommitSchema = z.object({
  rows: z.array(createGuruSchema).max(500, "Maksimal 500 baris per impor"),
});
export type ImportGuruCommitInput = z.infer<typeof importGuruCommitSchema>;
