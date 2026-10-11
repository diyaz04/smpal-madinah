import { z } from "zod";

import { IZIN_GURU_JENIS_LIST } from "../constants";

export const createIzinGuruSchema = z
  .object({
    guruId: z.string().min(1),
    jenis: z.enum(IZIN_GURU_JENIS_LIST),
    tanggalMulai: z.string().trim().min(1),
    tanggalSelesai: z.string().trim().min(1),
    parsial: z.boolean(),
    jamDari: z.string().nullable(),
    jamSampai: z.string().nullable(),
    keterangan: z.string().trim().max(300),
    lampiranFileId: z.string().nullable(),
  })
  .refine((v) => v.tanggalSelesai >= v.tanggalMulai, {
    message: "Tanggal selesai harus sama atau setelah tanggal mulai",
    path: ["tanggalSelesai"],
  });
export type CreateIzinGuruInput = z.infer<typeof createIzinGuruSchema>;

export const updateIzinGuruSchema = z
  .object({
    jenis: z.enum(IZIN_GURU_JENIS_LIST),
    tanggalMulai: z.string().trim().min(1),
    tanggalSelesai: z.string().trim().min(1),
    parsial: z.boolean(),
    jamDari: z.string().nullable(),
    jamSampai: z.string().nullable(),
    keterangan: z.string().trim().max(300),
    lampiranFileId: z.string().nullable(),
  })
  .refine((v) => v.tanggalSelesai >= v.tanggalMulai, {
    message: "Tanggal selesai harus sama atau setelah tanggal mulai",
    path: ["tanggalSelesai"],
  });
export type UpdateIzinGuruInput = z.infer<typeof updateIzinGuruSchema>;
