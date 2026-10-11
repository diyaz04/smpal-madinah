import { z } from "zod";

export const assignPembagianTugasSchema = z.object({
  rombelIds: z.array(z.string()).min(1, "Pilih minimal satu rombel"),
  mapelId: z.string().min(1, "Pilih mata pelajaran"),
  guruId: z.string().min(1, "Pilih guru"),
  isTeamTeaching: z.boolean(),
});
export type AssignPembagianTugasInput = z.infer<typeof assignPembagianTugasSchema>;

export const copyPembagianTugasFromPeriodSchema = z.object({
  sourcePeriodId: z.string().min(1),
});
export type CopyPembagianTugasFromPeriodInput = z.infer<typeof copyPembagianTugasFromPeriodSchema>;
