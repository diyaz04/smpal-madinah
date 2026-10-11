import { z } from "zod";

export const promotionActions = ["naik", "lulus", "lewati"] as const;
export type PromotionAction = (typeof promotionActions)[number];

const promoteRombelMappingSchema = z
  .object({
    sourceRombelId: z.string().min(1),
    action: z.enum(promotionActions),
    targetRombelId: z.string().nullable(),
  })
  .refine((v) => v.action !== "naik" || !!v.targetRombelId, {
    message: "Rombel tujuan wajib dipilih untuk rombel yang naik kelas",
    path: ["targetRombelId"],
  });

export const promoteSchema = z.object({
  targetPeriodId: z.string().min(1, "Pilih periode tujuan"),
  mappings: z.array(promoteRombelMappingSchema).min(1),
});
export type PromoteInput = z.infer<typeof promoteSchema>;
