import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { sanksiAmbang } from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import type {
  CreateSanksiAmbangInput,
  UpdateSanksiAmbangInput,
} from "../../shared/schemas/sanksiAmbang.schema";
import type { SanksiAmbangItem } from "../../shared/types";

function toItem(row: typeof sanksiAmbang.$inferSelect): SanksiAmbangItem {
  return { id: row.id, poinMinimal: row.poin_minimal, nama: row.nama, deskripsi: row.deskripsi, urutan: row.urutan };
}

async function assertPoinMinimalAvailable(db: Database, poinMinimal: number, excludeId?: string): Promise<void> {
  const existing = await db.query.sanksiAmbang.findFirst({
    where: and(
      eq(sanksiAmbang.poin_minimal, poinMinimal),
      isNull(sanksiAmbang.deleted_at),
      excludeId ? ne(sanksiAmbang.id, excludeId) : undefined,
    ),
  });
  if (existing) {
    throw new HTTPException(409, { message: `Ambang poin ${poinMinimal} sudah dipakai sanksi lain.` });
  }
}

export async function listSanksiAmbang(db: Database): Promise<SanksiAmbangItem[]> {
  const rows = await db.query.sanksiAmbang.findMany({
    where: isNull(sanksiAmbang.deleted_at),
    orderBy: [asc(sanksiAmbang.poin_minimal)],
  });
  return rows.map(toItem);
}

export async function createSanksiAmbang(db: Database, input: CreateSanksiAmbangInput): Promise<SanksiAmbangItem> {
  await assertPoinMinimalAvailable(db, input.poinMinimal);

  const id = generateId();
  const now = new Date().toISOString();
  await db.insert(sanksiAmbang).values({
    id,
    poin_minimal: input.poinMinimal,
    nama: input.nama,
    deskripsi: nullIfEmpty(input.deskripsi),
    urutan: input.poinMinimal,
    created_at: now,
    updated_at: now,
  });
  const row = await db.query.sanksiAmbang.findFirst({ where: eq(sanksiAmbang.id, id) });
  return toItem(row!);
}

export async function updateSanksiAmbang(
  db: Database,
  id: string,
  input: UpdateSanksiAmbangInput,
): Promise<SanksiAmbangItem> {
  const existing = await db.query.sanksiAmbang.findFirst({
    where: and(eq(sanksiAmbang.id, id), isNull(sanksiAmbang.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Ambang sanksi tidak ditemukan." });

  await assertPoinMinimalAvailable(db, input.poinMinimal, id);

  await db
    .update(sanksiAmbang)
    .set({
      poin_minimal: input.poinMinimal,
      nama: input.nama,
      deskripsi: nullIfEmpty(input.deskripsi),
      urutan: input.poinMinimal,
      updated_at: new Date().toISOString(),
    })
    .where(eq(sanksiAmbang.id, id));

  const row = await db.query.sanksiAmbang.findFirst({ where: eq(sanksiAmbang.id, id) });
  return toItem(row!);
}

export async function deleteSanksiAmbang(db: Database, id: string): Promise<void> {
  const existing = await db.query.sanksiAmbang.findFirst({
    where: and(eq(sanksiAmbang.id, id), isNull(sanksiAmbang.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Ambang sanksi tidak ditemukan." });

  await db
    .update(sanksiAmbang)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(sanksiAmbang.id, id));
}
