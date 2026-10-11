import { z } from "zod";

import { IZIN_STATUS_LIST } from "../constants";

export const createIzinSiswaSchema = z
  .object({
    siswaId: z.string().min(1),
    tanggalMulai: z.string().trim().min(1),
    tanggalSelesai: z.string().trim().min(1),
    status: z.enum(IZIN_STATUS_LIST),
    keterangan: z.string().trim().max(300),
    lampiranFileId: z.string().nullable(),
  })
  .refine((v) => v.tanggalSelesai >= v.tanggalMulai, {
    message: "Tanggal selesai harus sama atau setelah tanggal mulai",
    path: ["tanggalSelesai"],
  });

export const updateIzinSiswaSchema = z
  .object({
    tanggalMulai: z.string().trim().min(1),
    tanggalSelesai: z.string().trim().min(1),
    status: z.enum(IZIN_STATUS_LIST),
    keterangan: z.string().trim().max(300),
    lampiranFileId: z.string().nullable(),
  })
  .refine((v) => v.tanggalSelesai >= v.tanggalMulai, {
    message: "Tanggal selesai harus sama atau setelah tanggal mulai",
    path: ["tanggalSelesai"],
  });

export type CreateIzinSiswaInput = z.infer<typeof createIzinSiswaSchema>;
export type UpdateIzinSiswaInput = z.infer<typeof updateIzinSiswaSchema>;
