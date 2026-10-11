import { z } from "zod";

import { MAPEL_JENIS_LIST, TINGKAT_LIST } from "../constants";

const predikatRangeSchema = z.object({
  batasBawah: z.number().int().min(0).max(100),
  label: z.string().trim().min(1, "Label wajib diisi").max(30, "Maksimal 30 karakter"),
});

const predikatConfigSchema = z
  .array(predikatRangeSchema)
  .min(1, "Minimal 1 rentang predikat")
  .refine((ranges) => ranges[0]!.batasBawah === 0, {
    message: "Rentang pertama harus dimulai dari batas bawah 0",
  })
  .refine(
    (ranges) => ranges.every((r, i) => i === 0 || r.batasBawah > ranges[i - 1]!.batasBawah),
    { message: "Batas bawah tiap rentang harus naik secara berurutan" },
  );

export const createMapelSchema = z.object({
  nama: z.string().trim().min(1, "Nama mapel wajib diisi").max(100, "Maksimal 100 karakter"),
  kodeJadwal: z.string().trim().min(1, "Kode jadwal wajib diisi").max(20, "Maksimal 20 karakter"),
  aliasKode: z.array(z.string().trim().min(1)).max(10, "Maksimal 10 alias"),
  jenis: z.enum(MAPEL_JENIS_LIST),
  indukMapelId: z.string().nullable(),
  tampilRaport: z.boolean(),
  tingkatBerlaku: z.array(z.enum(TINGKAT_LIST)).min(1, "Pilih minimal 1 tingkat"),
  predikatConfig: predikatConfigSchema,
  isActive: z.boolean(),
});
export type CreateMapelInput = z.infer<typeof createMapelSchema>;

export const updateMapelSchema = createMapelSchema;
export type UpdateMapelInput = z.infer<typeof updateMapelSchema>;

export const updateUrutanMapelSchema = z.object({
  items: z.array(z.object({ id: z.string(), urutanRaport: z.number().int().min(0) })),
});
export type UpdateUrutanMapelInput = z.infer<typeof updateUrutanMapelSchema>;
