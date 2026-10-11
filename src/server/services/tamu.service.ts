import { and, eq, sql, lt, or, desc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { tamu, guru } from "../db/schema";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { nowWib } from "../lib/waktu";
import type { CatatKunjunganInput } from "../../shared/schemas/tamu.schema";
import type { TamuItem, CursorPaginatedResult } from "../../shared/types";

export async function catatKunjungan(
  db: Database,
  input: CatatKunjunganInput,
  kioskDeviceId: string | null,
): Promise<{ id: string }> {
  const { tanggal, jam } = nowWib();
  const id = generateId();

  await db.insert(tamu).values({
    id,
    jenis: input.jenis,
    nama_instansi: input.namaInstansi ? nullIfEmpty(input.namaInstansi) : null,
    nama: input.nama,
    maksud_tujuan: input.maksudTujuan,
    no_hp: input.noHp ? nullIfEmpty(input.noHp) : null,
    ingin_bertemu_guru_id: input.inginBertemuGuruId,
    foto_file_id: input.fotoFileId,
    status_kunjungan: "menunggu",
    kiosk_device_id: kioskDeviceId,
    tanggal,
    waktu: jam,
    created_at: new Date().toISOString(),
  });

  return { id };
}

export interface TamuQuery {
  cursor?: string;
  limit?: number;
  tanggalDari?: string;
  tanggalSampai?: string;
  jenis?: string;
  search?: string;
}

export async function listTamu(db: Database, query: TamuQuery): Promise<CursorPaginatedResult<TamuItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions = [];
  if (query.tanggalDari) conditions.push(sql`${tamu.tanggal} >= ${query.tanggalDari}`);
  if (query.tanggalSampai) conditions.push(sql`${tamu.tanggal} <= ${query.tanggalSampai}`);
  if (query.jenis) conditions.push(eq(tamu.jenis, query.jenis as "individu" | "instansi"));
  if (query.search) conditions.push(sql`(${tamu.nama} LIKE ${query.search + "%"} OR ${tamu.nama_instansi} LIKE ${query.search + "%"})`);

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(or(lt(tamu.created_at, decoded.createdAt), and(eq(tamu.created_at, decoded.createdAt), lt(tamu.id, decoded.id)))!);
    }
  }

  const rows = await db
    .select()
    .from(tamu)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tamu.created_at), desc(tamu.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(
    rows.map((r) => ({ ...r, created_at: r.created_at })),
    limit,
  );

  const guruIds = [...new Set(items.map((r) => r.ingin_bertemu_guru_id).filter((v): v is string => !!v))];
  const guruRows = guruIds.length
    ? await db.select({ id: guru.id, nama: guru.nama_lengkap }).from(guru).where(sql`${guru.id} IN ${guruIds}`)
    : [];
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));

  return {
    nextCursor,
    items: items.map((r) => ({
      id: r.id,
      jenis: r.jenis,
      namaInstansi: r.nama_instansi,
      nama: r.nama,
      maksudTujuan: r.maksud_tujuan,
      noHp: r.no_hp,
      inginBertemuGuruId: r.ingin_bertemu_guru_id,
      inginBertemuGuruNama: r.ingin_bertemu_guru_id ? (guruNamaById.get(r.ingin_bertemu_guru_id) ?? null) : null,
      fotoUrl: r.foto_file_id ? `/api/files/${r.foto_file_id}` : null,
      statusKunjungan: r.status_kunjungan,
      tanggal: r.tanggal,
      waktu: r.waktu,
    })),
  };
}

export async function updateStatusKunjungan(db: Database, id: string, status: "menunggu" | "dilayani" | "selesai"): Promise<void> {
  const existing = await db.query.tamu.findFirst({ where: eq(tamu.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Data tamu tidak ditemukan." });
  await db.update(tamu).set({ status_kunjungan: status }).where(eq(tamu.id, id));
}
