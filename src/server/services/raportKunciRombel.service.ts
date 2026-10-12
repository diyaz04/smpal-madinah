import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { raportKunciRombel } from "../db/schema";

/**
 * Hanya pengecekan terkunci dipakai sesi ini (gerbang simpan nilai). UI untuk
 * mengunci/membuka — biasanya dilakukan Wali Kelas lewat halaman Raport
 * Kelas — menyusul sesi 6-3 (lihat PROGRESS.md/DECISIONS.md).
 */
export async function isRombelTerkunci(db: Database, periodId: string, rombelId: string): Promise<boolean> {
  const row = await db.query.raportKunciRombel.findFirst({
    where: and(eq(raportKunciRombel.period_id, periodId), eq(raportKunciRombel.rombel_id, rombelId)),
  });
  return row?.terkunci ?? false;
}
