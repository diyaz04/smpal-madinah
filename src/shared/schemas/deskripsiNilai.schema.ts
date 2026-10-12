import { z } from "zod";

export const updateDeskripsiSchema = z.discriminatedUnion("mode", [
  z.object({
    rombelId: z.string().min(1),
    mapelId: z.string().min(1),
    siswaId: z.string().min(1),
    mode: z.literal("tp"),
    tpCapaianId: z.string().min(1),
  }),
  z.object({
    rombelId: z.string().min(1),
    mapelId: z.string().min(1),
    siswaId: z.string().min(1),
    mode: z.literal("manual"),
    deskripsiManual: z.string().trim().min(1, "Deskripsi wajib diisi").max(300, "Maksimal 300 karakter"),
  }),
]);
export type UpdateDeskripsiInput = z.infer<typeof updateDeskripsiSchema>;

export const kirimPengingatSchema = z.object({
  rombelId: z.string().min(1),
  mapelId: z.string().min(1),
});
export type KirimPengingatInput = z.infer<typeof kirimPengingatSchema>;
