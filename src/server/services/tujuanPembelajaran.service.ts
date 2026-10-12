import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { tujuanPembelajaran, nilaiLingkup } from "../db/schema";
import { generateId } from "../lib/id";
import type {
  CreateTujuanPembelajaranInput,
  UpdateTujuanPembelajaranInput,
  SalinTujuanPembelajaranInput,
} from "../../shared/schemas/tujuanPembelajaran.schema";
import type { TujuanPembelajaranItem } from "../../shared/types";
import type { Tingkat } from "../../shared/constants";

async function sudahDipakai(db: Database, tpId: string): Promise<boolean> {
  const row = await db.query.nilaiLingkup.findFirst({ where: eq(nilaiLingkup.tp_id, tpId) });
  return !!row;
}

export async function listTujuanPembelajaran(
  db: Database,
  periodId: string,
  mapelId: string,
  tingkat: Tingkat,
): Promise<TujuanPembelajaranItem[]> {
  const rows = await db.query.tujuanPembelajaran.findMany({
    where: and(
      eq(tujuanPembelajaran.period_id, periodId),
      eq(tujuanPembelajaran.mapel_id, mapelId),
      eq(tujuanPembelajaran.tingkat, tingkat),
      isNull(tujuanPembelajaran.deleted_at),
    ),
    orderBy: [asc(tujuanPembelajaran.urutan), asc(tujuanPembelajaran.kode)],
  });

  if (rows.length === 0) return [];
  const tpIds = rows.map((r) => r.id);
  const dipakaiRows = await db
    .select({ tpId: nilaiLingkup.tp_id })
    .from(nilaiLingkup)
    .where(sql`${nilaiLingkup.tp_id} IN ${tpIds}`)
    .groupBy(nilaiLingkup.tp_id);
  const dipakaiIds = new Set(dipakaiRows.map((r) => r.tpId));

  return rows.map((r) => ({
    id: r.id,
    periodId: r.period_id,
    mapelId: r.mapel_id,
    tingkat: r.tingkat,
    kode: r.kode,
    deskripsi: r.deskripsi,
    urutan: r.urutan,
    bisaDihapus: !dipakaiIds.has(r.id),
  }));
}

export async function createTujuanPembelajaran(
  db: Database,
  periodId: string,
  input: CreateTujuanPembelajaranInput,
): Promise<{ id: string }> {
  const id = generateId();
  const now = new Date().toISOString();
  const maxUrutan = await db.query.tujuanPembelajaran.findFirst({
    where: and(
      eq(tujuanPembelajaran.period_id, periodId),
      eq(tujuanPembelajaran.mapel_id, input.mapelId),
      eq(tujuanPembelajaran.tingkat, input.tingkat),
      isNull(tujuanPembelajaran.deleted_at),
    ),
    orderBy: [sql`${tujuanPembelajaran.urutan} DESC`],
  });

  await db.insert(tujuanPembelajaran).values({
    id,
    period_id: periodId,
    mapel_id: input.mapelId,
    tingkat: input.tingkat,
    kode: input.kode,
    deskripsi: input.deskripsi,
    urutan: (maxUrutan?.urutan ?? 0) + 1,
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export async function updateTujuanPembelajaran(
  db: Database,
  id: string,
  input: UpdateTujuanPembelajaranInput,
): Promise<void> {
  const existing = await db.query.tujuanPembelajaran.findFirst({
    where: and(eq(tujuanPembelajaran.id, id), isNull(tujuanPembelajaran.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Tujuan pembelajaran tidak ditemukan." });

  await db
    .update(tujuanPembelajaran)
    .set({ kode: input.kode, deskripsi: input.deskripsi, updated_at: new Date().toISOString() })
    .where(eq(tujuanPembelajaran.id, id));
}

export async function deleteTujuanPembelajaran(db: Database, id: string): Promise<void> {
  const existing = await db.query.tujuanPembelajaran.findFirst({
    where: and(eq(tujuanPembelajaran.id, id), isNull(tujuanPembelajaran.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Tujuan pembelajaran tidak ditemukan." });

  if (await sudahDipakai(db, id)) {
    throw new HTTPException(400, { message: "TP ini sudah punya nilai tersimpan, tidak bisa dihapus." });
  }

  await db
    .update(tujuanPembelajaran)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(tujuanPembelajaran.id, id));
}

export async function updateUrutanTujuanPembelajaran(
  db: Database,
  items: { id: string; urutan: number }[],
): Promise<void> {
  if (items.length === 0) return;
  const now = new Date().toISOString();
  const [first, ...rest] = items;
  const toStatement = (item: (typeof items)[number]) =>
    db.update(tujuanPembelajaran).set({ urutan: item.urutan, updated_at: now }).where(eq(tujuanPembelajaran.id, item.id));
  await db.batch([toStatement(first!), ...rest.map(toStatement)]);
}

export async function salinTujuanPembelajaran(
  db: Database,
  toPeriodId: string,
  input: SalinTujuanPembelajaranInput,
): Promise<{ count: number }> {
  const sumberRows = await db.query.tujuanPembelajaran.findMany({
    where: and(
      eq(tujuanPembelajaran.period_id, input.dariPeriodId),
      eq(tujuanPembelajaran.mapel_id, input.mapelId),
      eq(tujuanPembelajaran.tingkat, input.tingkat),
      isNull(tujuanPembelajaran.deleted_at),
    ),
    orderBy: [asc(tujuanPembelajaran.urutan)],
  });
  if (sumberRows.length === 0) return { count: 0 };

  const existingCount = await db.query.tujuanPembelajaran.findFirst({
    where: and(
      eq(tujuanPembelajaran.period_id, toPeriodId),
      eq(tujuanPembelajaran.mapel_id, input.mapelId),
      eq(tujuanPembelajaran.tingkat, input.tingkat),
      isNull(tujuanPembelajaran.deleted_at),
    ),
  });
  if (existingCount) {
    throw new HTTPException(400, { message: "Sudah ada TP untuk mapel+tingkat ini di periode tujuan." });
  }

  const now = new Date().toISOString();
  const statements = sumberRows.map((r) =>
    db.insert(tujuanPembelajaran).values({
      id: generateId(),
      period_id: toPeriodId,
      mapel_id: r.mapel_id,
      tingkat: r.tingkat,
      kode: r.kode,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      created_at: now,
      updated_at: now,
    }),
  );
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);

  return { count: sumberRows.length };
}
