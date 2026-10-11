import { z } from "zod";

export const assignPenggantiSchema = z.object({
  rombelId: z.string().min(1),
  tanggal: z.string().trim().min(1),
  slotMulai: z.string().trim().min(1),
  guruPenggantiId: z.string().nullable(),
  alasan: z.string().trim().max(200),
});
export type AssignPenggantiInput = z.infer<typeof assignPenggantiSchema>;

export const hapusPenggantiSchema = z.object({
  rombelId: z.string().min(1),
  tanggal: z.string().trim().min(1),
  slotMulai: z.string().trim().min(1),
});
export type HapusPenggantiInput = z.infer<typeof hapusPenggantiSchema>;
