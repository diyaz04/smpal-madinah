import { z } from "zod";

const nilaiField = z.number().int().min(0, "Nilai 0-100").max(100, "Nilai 0-100").nullable();

export const simpanNilaiRowSchema = z.object({
  siswaId: z.string().min(1),
  nilaiTp: z.record(z.string(), nilaiField),
  nilaiSts: nilaiField,
  nilaiSas: nilaiField,
});

export const simpanNilaiSchema = z.object({
  rombelId: z.string().min(1),
  mapelId: z.string().min(1),
  rows: z.array(simpanNilaiRowSchema).min(1).max(100, "Maksimal 100 siswa per simpan"),
});
export type SimpanNilaiInput = z.infer<typeof simpanNilaiSchema>;
export type SimpanNilaiRowInput = z.infer<typeof simpanNilaiRowSchema>;
