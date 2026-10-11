import { and, eq, sql, lt, or, desc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { izinGuru, guru } from "../db/schema";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import type { CreateIzinGuruInput, UpdateIzinGuruInput } from "../../shared/schemas/izinGuru.schema";
import type { IzinGuruItem, CursorPaginatedResult } from "../../shared/types";
import type { IzinGuruJenis } from "../../shared/constants";

export interface IzinGuruQuery {
  cursor?: string;
  limit?: number;
  guruId?: string;
}

export async function listIzinGuru(db: Database, query: IzinGuruQuery): Promise<CursorPaginatedResult<IzinGuruItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions = [sql`${izinGuru.deleted_at} IS NULL`];
  if (query.guruId) conditions.push(eq(izinGuru.guru_id, query.guruId));

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(lt(izinGuru.created_at, decoded.createdAt), and(eq(izinGuru.created_at, decoded.createdAt), lt(izinGuru.id, decoded.id)))!,
      );
    }
  }

  const rows = await db
    .select({
      id: izinGuru.id,
      created_at: izinGuru.created_at,
      guruId: izinGuru.guru_id,
      jenis: izinGuru.jenis,
      tanggalMulai: izinGuru.tanggal_mulai,
      tanggalSelesai: izinGuru.tanggal_selesai,
      parsial: izinGuru.parsial,
      jamDari: izinGuru.jam_dari,
      jamSampai: izinGuru.jam_sampai,
      keterangan: izinGuru.keterangan,
      lampiranFileId: izinGuru.lampiran_file_id,
      status: izinGuru.status,
    })
    .from(izinGuru)
    .where(and(...conditions))
    .orderBy(desc(izinGuru.created_at), desc(izinGuru.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(rows, limit);

  const guruIds = [...new Set(items.map((r) => r.guruId))];
  const guruRows = guruIds.length
    ? await db.select({ id: guru.id, nama: guru.nama_lengkap }).from(guru).where(sql`${guru.id} IN ${guruIds}`)
    : [];
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));

  return {
    nextCursor,
    items: items.map((r) => ({
      id: r.id,
      guruId: r.guruId,
      guruNama: guruNamaById.get(r.guruId) ?? "—",
      jenis: r.jenis,
      tanggalMulai: r.tanggalMulai,
      tanggalSelesai: r.tanggalSelesai,
      parsial: r.parsial,
      jamDari: r.jamDari,
      jamSampai: r.jamSampai,
      keterangan: r.keterangan,
      lampiranFileId: r.lampiranFileId,
      status: r.status,
    })),
  };
}

export async function createIzinGuru(db: Database, input: CreateIzinGuruInput, actorUserId: string): Promise<{ id: string }> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, input.guruId) });
  if (!row) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const id = generateId();
  const now = new Date().toISOString();
  await db.insert(izinGuru).values({
    id,
    guru_id: input.guruId,
    jenis: input.jenis,
    tanggal_mulai: input.tanggalMulai,
    tanggal_selesai: input.tanggalSelesai,
    parsial: input.parsial,
    jam_dari: input.parsial ? input.jamDari : null,
    jam_sampai: input.parsial ? input.jamSampai : null,
    keterangan: nullIfEmpty(input.keterangan),
    lampiran_file_id: input.lampiranFileId,
    status: "disetujui",
    dibuat_oleh: actorUserId,
    created_at: now,
    updated_at: now,
  });

  return { id };
}

export async function updateIzinGuru(db: Database, id: string, input: UpdateIzinGuruInput): Promise<void> {
  const existing = await db.query.izinGuru.findFirst({ where: and(eq(izinGuru.id, id), sql`${izinGuru.deleted_at} IS NULL`) });
  if (!existing) throw new HTTPException(404, { message: "Data izin tidak ditemukan." });

  await db
    .update(izinGuru)
    .set({
      jenis: input.jenis,
      tanggal_mulai: input.tanggalMulai,
      tanggal_selesai: input.tanggalSelesai,
      parsial: input.parsial,
      jam_dari: input.parsial ? input.jamDari : null,
      jam_sampai: input.parsial ? input.jamSampai : null,
      keterangan: nullIfEmpty(input.keterangan),
      lampiran_file_id: input.lampiranFileId,
      updated_at: new Date().toISOString(),
    })
    .where(eq(izinGuru.id, id));
}

/** Dipakai Papan KBM (Tahap 3) — guru yang izin pada tanggal tsb, tanpa parsial jam (izin penuh hari itu). */
export async function getGuruIzinPadaTanggal(
  db: Database,
  tanggal: string,
): Promise<Map<string, { jenis: IzinGuruJenis; keterangan: string | null }>> {
  const rows = await db.query.izinGuru.findMany({
    where: and(
      sql`${izinGuru.tanggal_mulai} <= ${tanggal}`,
      sql`${izinGuru.tanggal_selesai} >= ${tanggal}`,
      eq(izinGuru.status, "disetujui"),
      eq(izinGuru.parsial, false),
      sql`${izinGuru.deleted_at} IS NULL`,
    ),
  });
  return new Map(rows.map((r) => [r.guru_id, { jenis: r.jenis, keterangan: r.keterangan }]));
}
