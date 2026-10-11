import { z } from "zod";

import { SEMESTERS } from "../constants";

export const createAcademicPeriodSchema = z.object({
  yearLabel: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Format tahun ajaran: 2026/2027"),
  semester: z.enum(SEMESTERS),
  startDate: z.string().trim().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().trim().min(1, "Tanggal selesai wajib diisi"),
});
export type CreateAcademicPeriodInput = z.infer<typeof createAcademicPeriodSchema>;

export const updateAcademicPeriodSchema = createAcademicPeriodSchema;
export type UpdateAcademicPeriodInput = z.infer<typeof updateAcademicPeriodSchema>;
