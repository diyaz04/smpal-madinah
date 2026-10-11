import { z } from "zod";

import { TAMU_JENIS_LIST, TAMU_STATUS_KUNJUNGAN_LIST } from "../constants";

export const catatKunjunganSchema = z.object({
  jenis: z.enum(TAMU_JENIS_LIST),
  namaInstansi: z.string().trim().max(150).nullable(),
  nama: z.string().trim().min(3).max(150),
  maksudTujuan: z.string().trim().min(1).max(300),
  noHp: z.string().trim().max(30).nullable(),
  inginBertemuGuruId: z.string().nullable(),
  fotoFileId: z.string().min(1),
});
export type CatatKunjunganInput = z.infer<typeof catatKunjunganSchema>;

export const updateStatusKunjunganSchema = z.object({
  statusKunjungan: z.enum(TAMU_STATUS_KUNJUNGAN_LIST),
});
export type UpdateStatusKunjunganInput = z.infer<typeof updateStatusKunjunganSchema>;
