import { z } from "zod";

import { TINDAK_LANJUT_JENIS_LIST } from "../constants";

export const createTindakLanjutSchema = z.object({
  sanksiSiswaId: z.string().min(1),
  tanggal: z.string().trim().min(1),
  jenis: z.enum(TINDAK_LANJUT_JENIS_LIST),
  hasil: z.string().trim().max(500, "Maksimal 500 karakter"),
  lampiranFileId: z.string().nullable(),
  statusBaru: z.enum(["proses", "selesai"]),
});
export type CreateTindakLanjutInput = z.infer<typeof createTindakLanjutSchema>;
