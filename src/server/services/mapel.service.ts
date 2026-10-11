import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { mapel } from "../db/schema";
import { generateId } from "../lib/id";
import type { CreateMapelInput, UpdateMapelInput } from "../../shared/schemas/mapel.schema";
import type { MapelListItem, PredikatRange } from "../../shared/types";
import type { Tingkat } from "../../shared/constants";

async function assertKodeAvailable(db: Database, kodeJadwal: string, excludeId?: string): Promise<void> {
  const existing = await db.query.mapel.findFirst({
    where: eq(mapel.kode_jadwal, kodeJadwal),
  });
  if (existing && existing.id !== excludeId) {
    throw new HTTPException(409, { message: `Kode jadwal "${kodeJadwal}" sudah dipakai mapel lain.` });
  }
}

async function assertIndukValid(db: Database, indukMapelId: string | null, selfId?: string): Promise<void> {
  if (!indukMapelId) return;
  if (indukMapelId === selfId) {
    throw new HTTPException(400, { message: "Mapel tidak bisa menjadi induk dari dirinya sendiri." });
  }
  const induk = await db.query.mapel.findFirst({ where: eq(mapel.id, indukMapelId) });
  if (!induk || induk.deleted_at) {
    throw new HTTPException(400, { message: "Induk mapel tidak ditemukan." });
  }
  if (induk.induk_mapel_id) {
    throw new HTTPException(400, {
      message: "Induk mapel tidak boleh memiliki induk lagi (maksimal 2 tingkat).",
    });
  }
}

function toDbPredikat(ranges: PredikatRange[]) {
  return JSON.stringify(ranges.map((r) => ({ batas_bawah: r.batasBawah, label: r.label })));
}
function fromDbPredikat(json: string): PredikatRange[] {
  const raw = JSON.parse(json) as { batas_bawah: number; label: string }[];
  return raw.map((r) => ({ batasBawah: r.batas_bawah, label: r.label }));
}

function toListItemFull(row: typeof mapel.$inferSelect): MapelListItem {
  return {
    id: row.id,
    nama: row.nama,
    kodeJadwal: row.kode_jadwal,
    aliasKode: JSON.parse(row.alias_kode) as string[],
    jenis: row.jenis,
    indukMapelId: row.induk_mapel_id,
    tampilRaport: row.tampil_raport,
    urutanRaport: row.urutan_raport,
    tingkatBerlaku: JSON.parse(row.tingkat_berlaku) as Tingkat[],
    predikatConfig: fromDbPredikat(row.predikat_config),
    isActive: row.is_active,
  };
}

export async function listMapel(db: Database): Promise<MapelListItem[]> {
  const rows = await db.query.mapel.findMany({
    where: isNull(mapel.deleted_at),
    orderBy: [asc(mapel.urutan_raport), asc(mapel.nama)],
  });
  return rows.map(toListItemFull);
}

export async function createMapel(db: Database, input: CreateMapelInput): Promise<MapelListItem> {
  await assertKodeAvailable(db, input.kodeJadwal);
  await assertIndukValid(db, input.indukMapelId);

  const now = new Date().toISOString();
  const id = generateId();
  const maxUrutan = await db.query.mapel.findFirst({
    where: isNull(mapel.deleted_at),
    orderBy: [desc(mapel.urutan_raport)],
  });
  await db.insert(mapel).values({
    id,
    nama: input.nama,
    kode_jadwal: input.kodeJadwal,
    alias_kode: JSON.stringify(input.aliasKode),
    jenis: input.jenis,
    induk_mapel_id: input.indukMapelId,
    tampil_raport: input.tampilRaport,
    urutan_raport: (maxUrutan?.urutan_raport ?? 0) + 1,
    tingkat_berlaku: JSON.stringify(input.tingkatBerlaku),
    predikat_config: toDbPredikat(input.predikatConfig),
    is_active: input.isActive,
    created_at: now,
    updated_at: now,
  });

  const row = await db.query.mapel.findFirst({ where: eq(mapel.id, id) });
  return toListItemFull(row!);
}

export async function updateMapel(
  db: Database,
  id: string,
  input: UpdateMapelInput,
): Promise<MapelListItem> {
  const existing = await db.query.mapel.findFirst({ where: eq(mapel.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Mapel tidak ditemukan." });

  await assertKodeAvailable(db, input.kodeJadwal, id);
  await assertIndukValid(db, input.indukMapelId, id);

  const hasChildren = await db.query.mapel.findFirst({
    where: and(eq(mapel.induk_mapel_id, id), isNull(mapel.deleted_at)),
  });
  if (hasChildren && input.indukMapelId) {
    throw new HTTPException(400, {
      message: "Mapel ini sudah menjadi induk mapel lain, tidak bisa sekaligus menjadi sub-mapel.",
    });
  }

  await db
    .update(mapel)
    .set({
      nama: input.nama,
      kode_jadwal: input.kodeJadwal,
      alias_kode: JSON.stringify(input.aliasKode),
      jenis: input.jenis,
      induk_mapel_id: input.indukMapelId,
      tampil_raport: input.tampilRaport,
      tingkat_berlaku: JSON.stringify(input.tingkatBerlaku),
      predikat_config: toDbPredikat(input.predikatConfig),
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .where(eq(mapel.id, id));

  const row = await db.query.mapel.findFirst({ where: eq(mapel.id, id) });
  return toListItemFull(row!);
}

export async function deleteMapel(db: Database, id: string): Promise<void> {
  const existing = await db.query.mapel.findFirst({ where: eq(mapel.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Mapel tidak ditemukan." });

  const hasChildren = await db.query.mapel.findFirst({
    where: and(eq(mapel.induk_mapel_id, id), isNull(mapel.deleted_at)),
  });
  if (hasChildren) {
    throw new HTTPException(400, {
      message: "Tidak bisa menghapus mapel yang masih menjadi induk sub-mapel lain.",
    });
  }

  await db
    .update(mapel)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(mapel.id, id));
}

export async function updateUrutanMapel(
  db: Database,
  items: { id: string; urutanRaport: number }[],
): Promise<void> {
  if (items.length === 0) return;
  const now = new Date().toISOString();
  const [first, ...rest] = items;
  const toStatement = (item: (typeof items)[number]) =>
    db.update(mapel).set({ urutan_raport: item.urutanRaport, updated_at: now }).where(eq(mapel.id, item.id));
  await db.batch([toStatement(first!), ...rest.map(toStatement)]);
}

export interface RaportPreviewGroup {
  induk: MapelListItem | null;
  anak: MapelListItem[];
}

export async function getRaportPreview(db: Database): Promise<RaportPreviewGroup[]> {
  const rows = await db.query.mapel.findMany({
    where: and(isNull(mapel.deleted_at), eq(mapel.tampil_raport, true), eq(mapel.is_active, true)),
    orderBy: [asc(mapel.urutan_raport), asc(mapel.nama)],
  });
  const items = rows.map(toListItemFull);

  const roots = items.filter((m) => !m.indukMapelId);
  const byInduk = new Map<string, MapelListItem[]>();
  for (const m of items) {
    if (!m.indukMapelId) continue;
    const arr = byInduk.get(m.indukMapelId) ?? [];
    arr.push(m);
    byInduk.set(m.indukMapelId, arr);
  }

  return roots.map((root) => {
    const anak = byInduk.get(root.id);
    return anak && anak.length > 0 ? { induk: root, anak } : { induk: null, anak: [root] };
  });
}
