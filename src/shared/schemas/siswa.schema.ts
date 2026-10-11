import { z } from "zod";

import { JENIS_KELAMIN_LIST, SISWA_STATUSES } from "../constants";

// Sengaja tidak pakai .transform()/.default() — konflik tipe dengan
// zodResolver + useForm (lihat DECISIONS.md).
export const createSiswaSchema = z.object({
  nis: z.string().trim().min(1, "NIS wajib diisi").max(30, "Maksimal 30 karakter"),
  nisn: z.string().trim().min(1, "NISN wajib diisi").max(30, "Maksimal 30 karakter"),
  namaLengkap: z.string().trim().min(1, "Nama lengkap wajib diisi").max(100, "Maksimal 100 karakter"),
  namaPanggilan: z.string().trim(),
  jenisKelamin: z.enum(JENIS_KELAMIN_LIST),
  tempatLahir: z.string().trim(),
  tanggalLahir: z.string().trim(),
  agama: z.string().trim(),
  alamat: z.string().trim(),
  namaAyah: z.string().trim(),
  namaIbu: z.string().trim(),
  namaWali: z.string().trim(),
  noHpOrtu: z.string().trim(),
  pekerjaanOrtu: z.string().trim(),
  status: z.enum(SISWA_STATUSES),
  statusKeterangan: z.string().trim(),
  rombelId: z.string().nullable(),
});
export type CreateSiswaInput = z.infer<typeof createSiswaSchema>;

export const updateSiswaSchema = createSiswaSchema;
export type UpdateSiswaInput = z.infer<typeof updateSiswaSchema>;

export const siswaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  status: z.enum(SISWA_STATUSES).optional(),
  rombelId: z.string().optional(),
  periodId: z.string().optional(),
});
export type SiswaListQuery = z.infer<typeof siswaListQuerySchema>;

export const bulkPindahRombelSchema = z.object({
  siswaIds: z.array(z.string()).min(1, "Pilih minimal satu siswa"),
  rombelId: z.string().min(1, "Pilih rombel tujuan"),
});
export type BulkPindahRombelInput = z.infer<typeof bulkPindahRombelSchema>;

export const bulkUbahStatusSchema = z.object({
  siswaIds: z.array(z.string()).min(1, "Pilih minimal satu siswa"),
  status: z.enum(SISWA_STATUSES),
  statusKeterangan: z.string().trim(),
});
export type BulkUbahStatusInput = z.infer<typeof bulkUbahStatusSchema>;

export const importSiswaCommitSchema = z.object({
  rows: z.array(createSiswaSchema).max(500, "Maksimal 500 baris per impor"),
});
export type ImportSiswaCommitInput = z.infer<typeof importSiswaCommitSchema>;
