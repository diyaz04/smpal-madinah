import { z } from "zod";

import { ABSENSI_HARIAN_STATUS_LIST } from "../constants";

export const koreksiAbsensiHarianSchema = z.object({
  siswaId: z.string().min(1),
  tanggal: z.string().trim().min(1),
  status: z.enum([...ABSENSI_HARIAN_STATUS_LIST, "H"]),
  keterangan: z.string().trim().max(300),
});
export type KoreksiAbsensiHarianInput = z.infer<typeof koreksiAbsensiHarianSchema>;
