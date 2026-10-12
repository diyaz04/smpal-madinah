import { z } from "zod";

import { TINGKAT_LIST } from "../constants";

export const updateRaportPengaturanSchema = z
  .object({
    bobotTp: z.number().int().min(0).max(100),
    bobotSts: z.number().int().min(0).max(100),
    bobotSas: z.number().int().min(0).max(100),
    pembulatanDesimal: z.number().int().min(0).max(2),
    tempatRaport: z.string().trim().max(100, "Maksimal 100 karakter"),
    tanggalRaport: z.string().trim().max(20),
    fasePerTingkat: z.record(z.enum(TINGKAT_LIST), z.string().trim().min(1).max(5)),
    tampilkanPeringkat: z.boolean(),
  })
  .refine((v) => v.bobotTp + v.bobotSts + v.bobotSas === 100, {
    message: "Total bobot TP + STS + SAS harus 100",
    path: ["bobotSas"],
  });
export type UpdateRaportPengaturanInput = z.infer<typeof updateRaportPengaturanSchema>;
