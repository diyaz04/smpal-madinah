import { z } from "zod";

import { PRESTASI_BIDANG_LIST, PRESTASI_TINGKAT_LIST, PRESTASI_JENIS_LIST } from "../constants";

export const createPrestasiSchema = z.object({
  siswaIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 siswa").max(100, "Maksimal 100 siswa sekaligus"),
  namaKegiatan: z.string().trim().min(1, "Nama kegiatan/lomba wajib diisi").max(200, "Maksimal 200 karakter"),
  bidang: z.enum(PRESTASI_BIDANG_LIST),
  tingkat: z.enum(PRESTASI_TINGKAT_LIST),
  capaian: z.string().trim().min(1, "Capaian wajib diisi").max(100, "Maksimal 100 karakter"),
  jenis: z.enum(PRESTASI_JENIS_LIST),
  penyelenggara: z.string().trim().max(150, "Maksimal 150 karakter"),
  tanggal: z.string().trim().min(1),
  keterangan: z.string().trim().max(500, "Maksimal 500 karakter"),
  sertifikatFileId: z.string().nullable(),
  tampilDiRaport: z.boolean(),
  judulRaport: z.string().trim().max(200, "Maksimal 200 karakter"),
  keteranganRaport: z.string().trim().max(200, "Maksimal 200 karakter"),
});
export type CreatePrestasiInput = z.infer<typeof createPrestasiSchema>;

export const updatePrestasiSchema = z.object({
  namaKegiatan: z.string().trim().min(1, "Nama kegiatan/lomba wajib diisi").max(200, "Maksimal 200 karakter"),
  bidang: z.enum(PRESTASI_BIDANG_LIST),
  tingkat: z.enum(PRESTASI_TINGKAT_LIST),
  capaian: z.string().trim().min(1, "Capaian wajib diisi").max(100, "Maksimal 100 karakter"),
  jenis: z.enum(PRESTASI_JENIS_LIST),
  penyelenggara: z.string().trim().max(150, "Maksimal 150 karakter"),
  tanggal: z.string().trim().min(1),
  keterangan: z.string().trim().max(500, "Maksimal 500 karakter"),
  sertifikatFileId: z.string().nullable(),
  tampilDiRaport: z.boolean(),
  judulRaport: z.string().trim().min(1, "Judul raport wajib diisi").max(200, "Maksimal 200 karakter"),
  keteranganRaport: z.string().trim().min(1, "Keterangan raport wajib diisi").max(200, "Maksimal 200 karakter"),
});
export type UpdatePrestasiInput = z.infer<typeof updatePrestasiSchema>;
