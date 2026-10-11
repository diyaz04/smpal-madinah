import { z } from "zod";

import { KALENDER_JENIS_LIST, KALENDER_CAKUPAN_LIST, TINGKAT_LIST } from "../constants";

export const createKalenderEntriSchema = z
  .object({
    nama: z.string().trim().min(1, "Nama wajib diisi").max(100, "Maksimal 100 karakter"),
    tanggalMulai: z.string().trim().min(1, "Tanggal mulai wajib diisi"),
    tanggalSelesai: z.string().trim().min(1, "Tanggal selesai wajib diisi"),
    jenis: z.enum(KALENDER_JENIS_LIST),
    kbmDitiadakan: z.boolean(),
    cakupan: z.enum(KALENDER_CAKUPAN_LIST),
    tingkatBerlaku: z.array(z.enum(TINGKAT_LIST)),
    keterangan: z.string().trim(),
  })
  .refine((v) => v.tanggalSelesai >= v.tanggalMulai, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["tanggalSelesai"],
  });
export type CreateKalenderEntriInput = z.infer<typeof createKalenderEntriSchema>;
export const updateKalenderEntriSchema = createKalenderEntriSchema;
export type UpdateKalenderEntriInput = z.infer<typeof updateKalenderEntriSchema>;

export const updatePengaturanAkademikSchema = z.object({
  agendaBatasEditHariSetelah: z.number().int().min(0).max(30),
  agendaBatasEditJam: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Format jam HH:MM"),
  siswaAlpaAmbang: z.number().int().min(1).max(31),
});
export type UpdatePengaturanAkademikInput = z.infer<typeof updatePengaturanAkademikSchema>;
