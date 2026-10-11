import { and, asc, eq, ne, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { jadwalVersi, jadwalSlot, jadwalIsi, jadwalIsiGuru, jadwalPiket, rombel, mapel, guru } from "../db/schema";
import { generateId } from "../lib/id";
import type {
  CreateJadwalSlotInput,
  UpdateJadwalSlotInput,
  UpdateJadwalIsiInput,
} from "../../shared/schemas/jadwal.schema";
import type {
  JadwalVersiItem,
  JadwalSlotItem,
  JadwalIsiItem,
  JadwalGridResponse,
  JadwalPiketItem,
  GuruRef,
} from "../../shared/types";
import type { Hari } from "../../shared/constants";

function toVersiItem(row: typeof jadwalVersi.$inferSelect): JadwalVersiItem {
  return {
    id: row.id,
    periodId: row.period_id,
    nama: row.nama,
    status: row.status,
    tanggalMulaiBerlaku: row.tanggal_mulai_berlaku,
    createdAt: row.created_at,
  };
}

export async function listVersi(db: Database, periodId: string): Promise<JadwalVersiItem[]> {
  const rows = await db.query.jadwalVersi.findMany({
    where: eq(jadwalVersi.period_id, periodId),
    orderBy: [asc(jadwalVersi.created_at)],
  });
  return rows.map(toVersiItem);
}

export async function createVersi(
  db: Database,
  periodId: string,
  nama: string,
): Promise<JadwalVersiItem> {
  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(jadwalVersi).values({
    id,
    period_id: periodId,
    nama,
    status: "draf",
    tanggal_mulai_berlaku: null,
    created_at: now,
    updated_at: now,
  });
  const row = await db.query.jadwalVersi.findFirst({ where: eq(jadwalVersi.id, id) });
  return toVersiItem(row!);
}

export async function activateVersi(db: Database, id: string): Promise<void> {
  const existing = await db.query.jadwalVersi.findFirst({ where: eq(jadwalVersi.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Versi jadwal tidak ditemukan." });
  if (existing.status === "aktif") return;

  const now = new Date().toISOString();
  await db.batch([
    db
      .update(jadwalVersi)
      .set({ status: "arsip", updated_at: now })
      .where(and(eq(jadwalVersi.period_id, existing.period_id), eq(jadwalVersi.status, "aktif"), ne(jadwalVersi.id, id))),
    db
      .update(jadwalVersi)
      .set({ status: "aktif", tanggal_mulai_berlaku: now.slice(0, 10), updated_at: now })
      .where(eq(jadwalVersi.id, id)),
  ]);
}

export async function deleteVersi(db: Database, id: string): Promise<void> {
  const existing = await db.query.jadwalVersi.findFirst({ where: eq(jadwalVersi.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Versi jadwal tidak ditemukan." });
  if (existing.status === "aktif") {
    throw new HTTPException(400, { message: "Tidak bisa menghapus versi yang sedang aktif." });
  }

  const slotRows = await db.query.jadwalSlot.findMany({ where: eq(jadwalSlot.jadwal_versi_id, id) });
  const slotIds = slotRows.map((s) => s.id);
  if (slotIds.length > 0) {
    const isiRows = await db
      .select({ id: jadwalIsi.id })
      .from(jadwalIsi)
      .where(sql`${jadwalIsi.jadwal_slot_id} IN ${slotIds}`);
    const isiIds = isiRows.map((r) => r.id);
    if (isiIds.length > 0) {
      await db.delete(jadwalIsiGuru).where(sql`${jadwalIsiGuru.jadwal_isi_id} IN ${isiIds}`);
      await db.delete(jadwalIsi).where(sql`${jadwalIsi.id} IN ${isiIds}`);
    }
    await db.delete(jadwalSlot).where(sql`${jadwalSlot.id} IN ${slotIds}`);
  }
  await db.delete(jadwalPiket).where(eq(jadwalPiket.jadwal_versi_id, id));
  await db.delete(jadwalVersi).where(eq(jadwalVersi.id, id));
}

function toSlotItem(row: typeof jadwalSlot.$inferSelect): JadwalSlotItem {
  return {
    id: row.id,
    hari: row.hari,
    urutan: row.urutan,
    jamMulai: row.jam_mulai,
    jamSelesai: row.jam_selesai,
    jamKe: row.jam_ke,
    jenisSlot: row.jenis_slot,
  };
}

export async function listSlots(db: Database, versiId: string): Promise<JadwalSlotItem[]> {
  const rows = await db.query.jadwalSlot.findMany({
    where: eq(jadwalSlot.jadwal_versi_id, versiId),
    orderBy: [asc(jadwalSlot.hari), asc(jadwalSlot.urutan)],
  });
  return rows.map(toSlotItem);
}

export async function createSlot(
  db: Database,
  versiId: string,
  input: CreateJadwalSlotInput,
): Promise<JadwalSlotItem> {
  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(jadwalSlot).values({
    id,
    jadwal_versi_id: versiId,
    hari: input.hari,
    urutan: input.urutan,
    jam_mulai: input.jamMulai,
    jam_selesai: input.jamSelesai,
    jam_ke: input.jamKe,
    jenis_slot: input.jenisSlot,
    created_at: now,
    updated_at: now,
  });
  const row = await db.query.jadwalSlot.findFirst({ where: eq(jadwalSlot.id, id) });
  return toSlotItem(row!);
}

export async function updateSlot(
  db: Database,
  id: string,
  input: UpdateJadwalSlotInput,
): Promise<JadwalSlotItem> {
  const existing = await db.query.jadwalSlot.findFirst({ where: eq(jadwalSlot.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Jam pelajaran tidak ditemukan." });

  await db
    .update(jadwalSlot)
    .set({
      hari: input.hari,
      urutan: input.urutan,
      jam_mulai: input.jamMulai,
      jam_selesai: input.jamSelesai,
      jam_ke: input.jamKe,
      jenis_slot: input.jenisSlot,
      updated_at: new Date().toISOString(),
    })
    .where(eq(jadwalSlot.id, id));

  const row = await db.query.jadwalSlot.findFirst({ where: eq(jadwalSlot.id, id) });
  return toSlotItem(row!);
}

export async function deleteSlot(db: Database, id: string): Promise<void> {
  const existing = await db.query.jadwalSlot.findFirst({ where: eq(jadwalSlot.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Jam pelajaran tidak ditemukan." });

  const isiRows = await db.select({ id: jadwalIsi.id }).from(jadwalIsi).where(eq(jadwalIsi.jadwal_slot_id, id));
  const isiIds = isiRows.map((r) => r.id);
  if (isiIds.length > 0) {
    await db.delete(jadwalIsiGuru).where(sql`${jadwalIsiGuru.jadwal_isi_id} IN ${isiIds}`);
    await db.delete(jadwalIsi).where(sql`${jadwalIsi.id} IN ${isiIds}`);
  }
  await db.delete(jadwalSlot).where(eq(jadwalSlot.id, id));
}

async function buildIsiItems(
  db: Database,
  slotIds: string[],
  rombelFilter?: string,
  guruFilter?: string,
): Promise<JadwalIsiItem[]> {
  if (slotIds.length === 0) return [];
  const conditions = [sql`${jadwalIsi.jadwal_slot_id} IN ${slotIds}`];
  if (rombelFilter) conditions.push(eq(jadwalIsi.rombel_id, rombelFilter));

  const isiRows = await db
    .select({
      id: jadwalIsi.id,
      jadwalSlotId: jadwalIsi.jadwal_slot_id,
      rombelId: jadwalIsi.rombel_id,
      rombelNama: rombel.nama,
      mapelId: jadwalIsi.mapel_id,
      mapelNama: mapel.nama,
      keterangan: jadwalIsi.keterangan,
    })
    .from(jadwalIsi)
    .innerJoin(rombel, eq(rombel.id, jadwalIsi.rombel_id))
    .leftJoin(mapel, eq(mapel.id, jadwalIsi.mapel_id))
    .where(and(...conditions));

  if (isiRows.length === 0) return [];
  const isiIds = isiRows.map((r) => r.id);
  const guruRowsQuery = [sql`${jadwalIsiGuru.jadwal_isi_id} IN ${isiIds}`];
  const guruRows = await db
    .select({ isiId: jadwalIsiGuru.jadwal_isi_id, guruId: guru.id, guruNama: guru.nama_lengkap })
    .from(jadwalIsiGuru)
    .innerJoin(guru, eq(guru.id, jadwalIsiGuru.guru_id))
    .where(and(...guruRowsQuery));

  const guruByIsi = new Map<string, GuruRef[]>();
  for (const g of guruRows) {
    const arr = guruByIsi.get(g.isiId) ?? [];
    arr.push({ id: g.guruId, namaLengkap: g.guruNama });
    guruByIsi.set(g.isiId, arr);
  }

  let items = isiRows.map((r) => ({
    id: r.id,
    jadwalSlotId: r.jadwalSlotId,
    rombelId: r.rombelId,
    mapelId: r.mapelId,
    mapelNama: r.mapelNama,
    keterangan: r.keterangan,
    guru: guruByIsi.get(r.id) ?? [],
    rombelNama: r.rombelNama,
  }));

  if (guruFilter) {
    items = items.filter((i) => i.guru.some((g) => g.id === guruFilter));
  }

  return items;
}

export async function getGridForRombel(
  db: Database,
  versiId: string,
  rombelId: string,
): Promise<JadwalGridResponse> {
  const slots = await listSlots(db, versiId);
  const isi = await buildIsiItems(db, slots.map((s) => s.id), rombelId);
  return { slots, isi };
}

export interface JadwalGridGuruResponse extends JadwalGridResponse {
  isi: (JadwalIsiItem & { rombelNama: string })[];
}

export async function getGridForGuru(
  db: Database,
  versiId: string,
  guruId: string,
): Promise<JadwalGridGuruResponse> {
  const slots = await listSlots(db, versiId);
  const isi = await buildIsiItems(db, slots.map((s) => s.id), undefined, guruId);
  return { slots, isi: isi as (JadwalIsiItem & { rombelNama: string })[] };
}

export async function updateJadwalIsi(
  db: Database,
  slotId: string,
  rombelId: string,
  input: UpdateJadwalIsiInput,
): Promise<void> {
  const slotRow = await db.query.jadwalSlot.findFirst({ where: eq(jadwalSlot.id, slotId) });
  if (!slotRow) throw new HTTPException(404, { message: "Jam pelajaran tidak ditemukan." });

  if (input.guruIds.length > 0) {
    const conflictRows = await db
      .select({ guruId: jadwalIsiGuru.guru_id, guruNama: guru.nama_lengkap, rombelNama: rombel.nama })
      .from(jadwalIsiGuru)
      .innerJoin(jadwalIsi, eq(jadwalIsiGuru.jadwal_isi_id, jadwalIsi.id))
      .innerJoin(guru, eq(guru.id, jadwalIsiGuru.guru_id))
      .innerJoin(rombel, eq(rombel.id, jadwalIsi.rombel_id))
      .where(
        and(
          eq(jadwalIsi.jadwal_slot_id, slotId),
          ne(jadwalIsi.rombel_id, rombelId),
          sql`${jadwalIsiGuru.guru_id} IN ${input.guruIds}`,
        ),
      );
    if (conflictRows.length > 0) {
      const c = conflictRows[0]!;
      throw new HTTPException(409, {
        message: `${c.guruNama} sudah mengajar di rombel ${c.rombelNama} pada jam yang sama.`,
      });
    }
  }

  const now = new Date().toISOString();
  const existing = await db.query.jadwalIsi.findFirst({
    where: and(eq(jadwalIsi.jadwal_slot_id, slotId), eq(jadwalIsi.rombel_id, rombelId)),
  });

  let isiId: string;
  if (existing) {
    isiId = existing.id;
    await db
      .update(jadwalIsi)
      .set({ mapel_id: input.mapelId, keterangan: input.keterangan || null, updated_at: now })
      .where(eq(jadwalIsi.id, isiId));
    await db.delete(jadwalIsiGuru).where(eq(jadwalIsiGuru.jadwal_isi_id, isiId));
  } else {
    isiId = generateId();
    await db.insert(jadwalIsi).values({
      id: isiId,
      jadwal_slot_id: slotId,
      rombel_id: rombelId,
      mapel_id: input.mapelId,
      keterangan: input.keterangan || null,
      created_at: now,
      updated_at: now,
    });
  }

  if (input.guruIds.length > 0) {
    await db.insert(jadwalIsiGuru).values(
      input.guruIds.map((guruId) => ({
        id: generateId(),
        jadwal_isi_id: isiId,
        guru_id: guruId,
        created_at: now,
      })),
    );
  }
}

export async function listPiket(db: Database, versiId: string): Promise<JadwalPiketItem[]> {
  const rows = await db
    .select({ hari: jadwalPiket.hari, guruId: guru.id, guruNama: guru.nama_lengkap })
    .from(jadwalPiket)
    .innerJoin(guru, eq(guru.id, jadwalPiket.guru_id))
    .where(eq(jadwalPiket.jadwal_versi_id, versiId));

  const byHari = new Map<Hari, GuruRef[]>();
  for (const r of rows) {
    const arr = byHari.get(r.hari) ?? [];
    arr.push({ id: r.guruId, namaLengkap: r.guruNama });
    byHari.set(r.hari, arr);
  }
  return [...byHari.entries()].map(([hari, guruList]) => ({ hari, guru: guruList }));
}

export async function setPiket(db: Database, versiId: string, hari: Hari, guruIds: string[]): Promise<void> {
  await db.delete(jadwalPiket).where(and(eq(jadwalPiket.jadwal_versi_id, versiId), eq(jadwalPiket.hari, hari)));
  if (guruIds.length === 0) return;
  const now = new Date().toISOString();
  await db.insert(jadwalPiket).values(
    guruIds.map((guruId) => ({
      id: generateId(),
      jadwal_versi_id: versiId,
      hari,
      guru_id: guruId,
      created_at: now,
    })),
  );
}
