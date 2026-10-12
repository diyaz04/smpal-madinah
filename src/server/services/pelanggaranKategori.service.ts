import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { pelanggaranKategori, pelanggaranJenis } from "../db/schema";
import { generateId } from "../lib/id";
import type {
  CreatePelanggaranKategoriInput,
  UpdatePelanggaranKategoriInput,
} from "../../shared/schemas/pelanggaranKategori.schema";
import type { PelanggaranKategoriItem } from "../../shared/types";

function toItem(row: typeof pelanggaranKategori.$inferSelect): PelanggaranKategoriItem {
  return { id: row.id, nama: row.nama, warna: row.warna, urutan: row.urutan };
}

export async function listPelanggaranKategori(db: Database): Promise<PelanggaranKategoriItem[]> {
  const rows = await db.query.pelanggaranKategori.findMany({
    where: isNull(pelanggaranKategori.deleted_at),
    orderBy: [asc(pelanggaranKategori.urutan), asc(pelanggaranKategori.nama)],
  });
  return rows.map(toItem);
}

export async function createPelanggaranKategori(
  db: Database,
  input: CreatePelanggaranKategoriInput,
): Promise<PelanggaranKategoriItem> {
  const now = new Date().toISOString();
  const id = generateId();
  const maxUrutan = await db.query.pelanggaranKategori.findFirst({
    where: isNull(pelanggaranKategori.deleted_at),
    orderBy: [desc(pelanggaranKategori.urutan)],
  });
  await db.insert(pelanggaranKategori).values({
    id,
    nama: input.nama,
    warna: input.warna,
    urutan: (maxUrutan?.urutan ?? 0) + 1,
    created_at: now,
    updated_at: now,
  });
  const row = await db.query.pelanggaranKategori.findFirst({ where: eq(pelanggaranKategori.id, id) });
  return toItem(row!);
}

export async function updatePelanggaranKategori(
  db: Database,
  id: string,
  input: UpdatePelanggaranKategoriInput,
): Promise<PelanggaranKategoriItem> {
  const existing = await db.query.pelanggaranKategori.findFirst({
    where: and(eq(pelanggaranKategori.id, id), isNull(pelanggaranKategori.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Kategori tidak ditemukan." });

  await db
    .update(pelanggaranKategori)
    .set({ nama: input.nama, warna: input.warna, updated_at: new Date().toISOString() })
    .where(eq(pelanggaranKategori.id, id));

  const row = await db.query.pelanggaranKategori.findFirst({ where: eq(pelanggaranKategori.id, id) });
  return toItem(row!);
}

export async function deletePelanggaranKategori(db: Database, id: string): Promise<void> {
  const existing = await db.query.pelanggaranKategori.findFirst({
    where: and(eq(pelanggaranKategori.id, id), isNull(pelanggaranKategori.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Kategori tidak ditemukan." });

  const anakJenis = await db.query.pelanggaranJenis.findFirst({
    where: and(eq(pelanggaranJenis.kategori_id, id), isNull(pelanggaranJenis.deleted_at)),
  });
  if (anakJenis) {
    throw new HTTPException(400, {
      message: "Tidak bisa menghapus kategori yang masih punya jenis pelanggaran.",
    });
  }

  await db
    .update(pelanggaranKategori)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(pelanggaranKategori.id, id));
}

export async function updateUrutanPelanggaranKategori(
  db: Database,
  items: { id: string; urutan: number }[],
): Promise<void> {
  if (items.length === 0) return;
  const now = new Date().toISOString();
  const [first, ...rest] = items;
  const toStatement = (item: (typeof items)[number]) =>
    db.update(pelanggaranKategori).set({ urutan: item.urutan, updated_at: now }).where(eq(pelanggaranKategori.id, item.id));
  await db.batch([toStatement(first!), ...rest.map(toStatement)]);
}
