import { z } from "zod";

import { HARI_LIST, JENIS_SLOT_LIST } from "../constants";

export const matchImportRequestSchema = z.object({
  mapelCodes: z.array(z.string()),
  rombelNames: z.array(z.string()),
  guruNames: z.array(z.string()),
});
export type MatchImportRequest = z.infer<typeof matchImportRequestSchema>;

export const saveGuruAliasBulkSchema = z.object({
  items: z.array(z.object({ guruId: z.string(), aliasNama: z.string().trim().min(1) })),
});
export type SaveGuruAliasBulkInput = z.infer<typeof saveGuruAliasBulkSchema>;

const commitEntrySchema = z.object({
  hari: z.enum(HARI_LIST),
  jamMulai: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/),
  jamSelesai: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/),
  jamKe: z.number().int().min(1).nullable(),
  jenisSlot: z.enum(JENIS_SLOT_LIST),
  rombelId: z.string().nullable(),
  mapelId: z.string().nullable(),
  guruIds: z.array(z.string()),
  keterangan: z.string().trim(),
});

const commitPiketSchema = z.object({
  hari: z.enum(HARI_LIST),
  guruIds: z.array(z.string()),
});

export const commitImportSchema = z.object({
  versiName: z.string().trim().min(1, "Nama versi wajib diisi").max(50),
  entries: z.array(commitEntrySchema).max(2000, "Maksimal 2000 baris per impor"),
  piket: z.array(commitPiketSchema).max(50),
});
export type CommitImportInput = z.infer<typeof commitImportSchema>;
