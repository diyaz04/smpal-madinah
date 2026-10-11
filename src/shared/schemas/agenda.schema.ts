import { z } from "zod";

import { AGENDA_STATUS_LIST, ABSENSI_PERTEMUAN_STATUS_LIST } from "../constants";

const absensiEntrySchema = z.object({
  siswaId: z.string().min(1),
  status: z.enum(ABSENSI_PERTEMUAN_STATUS_LIST),
  keterangan: z.string().trim(),
});

export const submitAgendaSchema = z
  .object({
    rombelId: z.string().min(1),
    mapelId: z.string().nullable(),
    tanggal: z.string().trim().min(1),
    slotMulai: z.string().trim().min(1),
    materi: z.string().trim().max(300, "Maksimal 300 karakter"),
    kegiatan: z.string().trim().max(500, "Maksimal 500 karakter"),
    catatan: z.string().trim(),
    status: z.enum(AGENDA_STATUS_LIST),
    absensi: z.array(absensiEntrySchema).max(60),
  })
  .refine((v) => v.status === "jam_kosong" || v.materi.length > 0, {
    message: "Materi wajib diisi",
    path: ["materi"],
  });
export type SubmitAgendaInput = z.infer<typeof submitAgendaSchema>;
