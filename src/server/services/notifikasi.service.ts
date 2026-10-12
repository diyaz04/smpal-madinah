import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { notifikasi } from "../db/schema";
import { generateId } from "../lib/id";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import type { NotifikasiItem, CursorPaginatedResult } from "../../shared/types";

export interface KirimNotifikasiInput {
  userIds: string[];
  judul: string;
  isi: string;
  tautan?: string | null;
  modul?: string | null;
}

/** Helper lintas modul — dipanggil modul lain (mis. pelanggaran) untuk mengirim notifikasi ke beberapa user sekaligus dalam satu db.batch(). */
export async function kirimNotifikasi(db: Database, input: KirimNotifikasiInput): Promise<void> {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;

  const now = new Date().toISOString();
  const statements = userIds.map((userId) =>
    db.insert(notifikasi).values({
      id: generateId(),
      user_id: userId,
      judul: input.judul,
      isi: input.isi,
      tautan: input.tautan ?? null,
      modul: input.modul ?? null,
      created_at: now,
    }),
  );
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

export async function countUnreadNotifikasi(db: Database, userId: string): Promise<number> {
  const row = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifikasi)
    .where(and(eq(notifikasi.user_id, userId), isNull(notifikasi.dibaca_pada)));
  return row[0]?.count ?? 0;
}

function toItem(row: typeof notifikasi.$inferSelect): NotifikasiItem {
  return {
    id: row.id,
    judul: row.judul,
    isi: row.isi,
    tautan: row.tautan,
    modul: row.modul,
    dibacaPada: row.dibaca_pada,
    createdAt: row.created_at,
  };
}

export async function listNotifikasi(
  db: Database,
  userId: string,
  cursor: string | null,
  limit?: number,
): Promise<CursorPaginatedResult<NotifikasiItem>> {
  const take = normalizeCursorLimit(limit);
  const conditions = [eq(notifikasi.user_id, userId)];

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(notifikasi.created_at, decoded.createdAt),
          and(eq(notifikasi.created_at, decoded.createdAt), lt(notifikasi.id, decoded.id)),
        )!,
      );
    }
  }

  const rows = await db
    .select()
    .from(notifikasi)
    .where(and(...conditions))
    .orderBy(desc(notifikasi.created_at), desc(notifikasi.id))
    .limit(take + 1);

  const { items, nextCursor } = buildCursorResult(rows, take);
  return { items: items.map(toItem), nextCursor };
}

export async function markNotifikasiDibaca(db: Database, userId: string, id: string): Promise<void> {
  await db
    .update(notifikasi)
    .set({ dibaca_pada: new Date().toISOString() })
    .where(and(eq(notifikasi.id, id), eq(notifikasi.user_id, userId)));
}

export async function markSemuaNotifikasiDibaca(db: Database, userId: string): Promise<void> {
  await db
    .update(notifikasi)
    .set({ dibaca_pada: new Date().toISOString() })
    .where(and(eq(notifikasi.user_id, userId), isNull(notifikasi.dibaca_pada)));
}
