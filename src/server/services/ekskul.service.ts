import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { ekskul, ekskulNilai, guru } from "../db/schema";
import { generateId } from "../lib/id";
import type { CreateEkskulInput, UpdateEkskulInput } from "../../shared/schemas/ekskul.schema";
import type { EkskulItem } from "../../shared/types";

async function sudahDipakai(db: Database, ekskulId: string): Promise<boolean> {
  const row = await db.query.ekskulNilai.findFirst({ where: eq(ekskulNilai.ekskul_id, ekskulId) });
  return !!row;
}

export async function listEkskul(db: Database): Promise<EkskulItem[]> {
  const rows = await db
    .select({
      id: ekskul.id,
      nama: ekskul.nama,
      pembinaGuruId: ekskul.pembina_guru_id,
      pembinaNama: guru.nama_lengkap,
      aktif: ekskul.aktif,
    })
    .from(ekskul)
    .leftJoin(guru, eq(guru.id, ekskul.pembina_guru_id))
    .where(isNull(ekskul.deleted_at))
    .orderBy(asc(ekskul.nama));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const dipakaiRows = await db
    .select({ ekskulId: ekskulNilai.ekskul_id })
    .from(ekskulNilai)
    .where(sql`${ekskulNilai.ekskul_id} IN ${ids}`)
    .groupBy(ekskulNilai.ekskul_id);
  const dipakaiIds = new Set(dipakaiRows.map((r) => r.ekskulId));

  return rows.map((r) => ({ ...r, bisaDihapus: !dipakaiIds.has(r.id) }));
}

/** Dipakai pemilih Ekskul di Raport Kelas — hanya yang aktif. */
export async function listEkskulAktif(db: Database): Promise<{ id: string; nama: string }[]> {
  const rows = await db.query.ekskul.findMany({
    where: and(isNull(ekskul.deleted_at), eq(ekskul.aktif, true)),
    orderBy: [asc(ekskul.nama)],
  });
  return rows.map((r) => ({ id: r.id, nama: r.nama }));
}

export async function createEkskul(db: Database, input: CreateEkskulInput): Promise<{ id: string }> {
  const id = generateId();
  const now = new Date().toISOString();
  await db.insert(ekskul).values({
    id,
    nama: input.nama,
    pembina_guru_id: input.pembinaGuruId,
    aktif: input.aktif,
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export async function updateEkskul(db: Database, id: string, input: UpdateEkskulInput): Promise<void> {
  const existing = await db.query.ekskul.findFirst({ where: and(eq(ekskul.id, id), isNull(ekskul.deleted_at)) });
  if (!existing) throw new HTTPException(404, { message: "Ekskul tidak ditemukan." });

  await db
    .update(ekskul)
    .set({ nama: input.nama, pembina_guru_id: input.pembinaGuruId, aktif: input.aktif, updated_at: new Date().toISOString() })
    .where(eq(ekskul.id, id));
}

export async function deleteEkskul(db: Database, id: string): Promise<void> {
  const existing = await db.query.ekskul.findFirst({ where: and(eq(ekskul.id, id), isNull(ekskul.deleted_at)) });
  if (!existing) throw new HTTPException(404, { message: "Ekskul tidak ditemukan." });

  if (await sudahDipakai(db, id)) {
    throw new HTTPException(400, { message: "Ekskul ini sudah punya nilai tersimpan, tidak bisa dihapus — nonaktifkan saja." });
  }

  await db
    .update(ekskul)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(ekskul.id, id));
}
