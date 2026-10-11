import { z } from "zod";

export const setujuiBiometrikSchema = z.object({
  versi: z.number().int().positive(),
});
export type SetujuiBiometrikInput = z.infer<typeof setujuiBiometrikSchema>;

export const tambahDescriptorSchema = z.object({
  descriptor: z.string().min(1),
  fotoFileId: z.string().nullable(),
});
export type TambahDescriptorInput = z.infer<typeof tambahDescriptorSchema>;
