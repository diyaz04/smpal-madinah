import { z } from "zod";

export const createPelanggaranSchema = z.object({
  siswaIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 siswa").max(100, "Maksimal 100 siswa sekaligus"),
  jenisId: z.string().min(1, "Pilih jenis pelanggaran"),
  tanggal: z.string().trim().min(1),
  waktu: z.string().trim().min(1),
  lokasi: z.string().trim().max(150, "Maksimal 150 karakter"),
  keterangan: z.string().trim().max(500, "Maksimal 500 karakter"),
  fotoFileId: z.string().nullable(),
});
export type CreatePelanggaranInput = z.infer<typeof createPelanggaranSchema>;

export const batalkanPelanggaranSchema = z.object({
  alasanBatal: z.string().trim().min(1, "Alasan pembatalan wajib diisi").max(300, "Maksimal 300 karakter"),
});
export type BatalkanPelanggaranInput = z.infer<typeof batalkanPelanggaranSchema>;
