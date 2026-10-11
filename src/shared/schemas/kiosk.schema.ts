import { z } from "zod";

export const generatePairingCodeSchema = z.object({
  nama: z.string().trim().min(1).max(100),
  lokasi: z.string().trim().max(100),
});
export type GeneratePairingCodeInput = z.infer<typeof generatePairingCodeSchema>;

export const pairDeviceSchema = z.object({
  code: z.string().trim().length(6),
});
export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;
