import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { raportKunciRombel } from "../db/schema";
import { generateId } from "../lib/id";

/** Gerbang simpan nilai (Tahap 6-1/6-2) + gerbang edit data Raport Kelas (Tahap 6-3). */
export async function isRombelTerkunci(db: Database, periodId: string, rombelId: string): Promise<boolean> {
  const row = await db.query.raportKunciRombel.findFirst({
    where: and(eq(raportKunciRombel.period_id, periodId), eq(raportKunciRombel.rombel_id, rombelId)),
  });
  return row?.terkunci ?? false;
}

/** Dipanggil saat Wali Kelas menekan "Finalkan Raport" — mengunci nilai & data raport rombel itu. */
export async function kunciRombel(db: Database, periodId: string, rombelId: string, actorUserId: string): Promise<void> {
  const existing = await db.query.raportKunciRombel.findFirst({
    where: and(eq(raportKunciRombel.period_id, periodId), eq(raportKunciRombel.rombel_id, rombelId)),
  });
  const now = new Date().toISOString();
  if (existing) {
    await db
      .update(raportKunciRombel)
      .set({ terkunci: true, dikunci_oleh: actorUserId, dikunci_pada: now, updated_at: now })
      .where(eq(raportKunciRombel.id, existing.id));
  } else {
    await db.insert(raportKunciRombel).values({
      id: generateId(),
      period_id: periodId,
      rombel_id: rombelId,
      terkunci: true,
      dikunci_oleh: actorUserId,
      dikunci_pada: now,
      created_at: now,
      updated_at: now,
    });
  }
}

/** Hanya Admin — dicek di route, bukan di sini. Alasan dicatat lewat logActivity di route. */
export async function bukaKunciRombel(db: Database, periodId: string, rombelId: string): Promise<void> {
  const existing = await db.query.raportKunciRombel.findFirst({
    where: and(eq(raportKunciRombel.period_id, periodId), eq(raportKunciRombel.rombel_id, rombelId)),
  });
  if (!existing) return;
  await db
    .update(raportKunciRombel)
    .set({ terkunci: false, updated_at: new Date().toISOString() })
    .where(eq(raportKunciRombel.id, existing.id));
}
