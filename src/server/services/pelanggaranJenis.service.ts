import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { pelanggaranJenis, pelanggaranKategori, pelanggaran } from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import type {
  CreatePelanggaranJenisInput,
  UpdatePelanggaranJenisInput,
} from "../../shared/schemas/pelanggaranJenis.schema";
import type { PelanggaranJenisItem, PelanggaranJenisAktifItem } from "../../shared/types";

async function sudahDipakai(db: Database, jenisId: string): Promise<boolean> {
  const row = await db.query.pelanggaran.findFirst({ where: eq(pelanggaran.jenis_id, jenisId) });
  return !!row;
}

export async function listPelanggaranJenis(db: Database): Promise<PelanggaranJenisItem[]> {
  const rows = await db
    .select({
      id: pelanggaranJenis.id,
      kategoriId: pelanggaranJenis.kategori_id,
      kategoriNama: pelanggaranKategori.nama,
      nama: pelanggaranJenis.nama,
      poin: pelanggaranJenis.poin,
      deskripsi: pelanggaranJenis.deskripsi,
      aktif: pelanggaranJenis.aktif,
    })
    .from(pelanggaranJenis)
    .innerJoin(pelanggaranKategori, eq(pelanggaranJenis.kategori_id, pelanggaranKategori.id))
    .where(isNull(pelanggaranJenis.deleted_at))
    .orderBy(asc(pelanggaranKategori.urutan), asc(pelanggaranJenis.nama));

  if (rows.length === 0) return [];
  const jenisIds = rows.map((r) => r.id);
  const dipakaiRows = await db
    .select({ jenisId: pelanggaran.jenis_id })
    .from(pelanggaran)
    .where(sql`${pelanggaran.jenis_id} IN ${jenisIds}`)
    .groupBy(pelanggaran.jenis_id);
  const dipakaiIds = new Set(dipakaiRows.map((r) => r.jenisId));

  return rows.map((row) => ({ ...row, bisaDihapus: !dipakaiIds.has(row.id) }));
}

/** Daftar jenis aktif saja — dipakai picker Pencatatan Pelanggaran (modul `pelanggaran`, bukan `master_pelanggaran`). */
export async function listPelanggaranJenisAktif(db: Database): Promise<PelanggaranJenisAktifItem[]> {
  return db
    .select({
      id: pelanggaranJenis.id,
      kategoriId: pelanggaranJenis.kategori_id,
      kategoriNama: pelanggaranKategori.nama,
      kategoriWarna: pelanggaranKategori.warna,
      nama: pelanggaranJenis.nama,
      poin: pelanggaranJenis.poin,
    })
    .from(pelanggaranJenis)
    .innerJoin(pelanggaranKategori, eq(pelanggaranJenis.kategori_id, pelanggaranKategori.id))
    .where(and(isNull(pelanggaranJenis.deleted_at), eq(pelanggaranJenis.aktif, true)))
    .orderBy(asc(pelanggaranKategori.urutan), asc(pelanggaranJenis.nama));
}

export async function createPelanggaranJenis(
  db: Database,
  input: CreatePelanggaranJenisInput,
): Promise<{ id: string }> {
  const kategori = await db.query.pelanggaranKategori.findFirst({
    where: and(eq(pelanggaranKategori.id, input.kategoriId), isNull(pelanggaranKategori.deleted_at)),
  });
  if (!kategori) throw new HTTPException(400, { message: "Kategori tidak ditemukan." });

  const id = generateId();
  const now = new Date().toISOString();
  await db.insert(pelanggaranJenis).values({
    id,
    kategori_id: input.kategoriId,
    nama: input.nama,
    poin: input.poin,
    deskripsi: nullIfEmpty(input.deskripsi),
    aktif: input.aktif,
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export async function updatePelanggaranJenis(
  db: Database,
  id: string,
  input: UpdatePelanggaranJenisInput,
): Promise<void> {
  const existing = await db.query.pelanggaranJenis.findFirst({
    where: and(eq(pelanggaranJenis.id, id), isNull(pelanggaranJenis.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Jenis pelanggaran tidak ditemukan." });

  const kategori = await db.query.pelanggaranKategori.findFirst({
    where: and(eq(pelanggaranKategori.id, input.kategoriId), isNull(pelanggaranKategori.deleted_at)),
  });
  if (!kategori) throw new HTTPException(400, { message: "Kategori tidak ditemukan." });

  await db
    .update(pelanggaranJenis)
    .set({
      kategori_id: input.kategoriId,
      nama: input.nama,
      poin: input.poin,
      deskripsi: nullIfEmpty(input.deskripsi),
      aktif: input.aktif,
      updated_at: new Date().toISOString(),
    })
    .where(eq(pelanggaranJenis.id, id));
}

export async function deletePelanggaranJenis(db: Database, id: string): Promise<void> {
  const existing = await db.query.pelanggaranJenis.findFirst({
    where: and(eq(pelanggaranJenis.id, id), isNull(pelanggaranJenis.deleted_at)),
  });
  if (!existing) throw new HTTPException(404, { message: "Jenis pelanggaran tidak ditemukan." });

  if (await sudahDipakai(db, id)) {
    throw new HTTPException(400, {
      message: "Jenis pelanggaran ini sudah pernah dipakai, tidak bisa dihapus — nonaktifkan saja.",
    });
  }

  await db
    .update(pelanggaranJenis)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(pelanggaranJenis.id, id));
}
