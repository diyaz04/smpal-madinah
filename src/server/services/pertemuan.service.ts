import { and, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { jadwalSlot, jadwalIsi, jadwalIsiGuru, jadwalVersi } from "../db/schema";
import type { PertemuanGroup } from "../../shared/types";
import type { Hari } from "../../shared/constants";
import { groupPertemuan, type PertemuanSlotInput, type PertemuanIsiInput } from "../../shared/pertemuan";

export { groupPertemuan, type PertemuanSlotInput, type PertemuanIsiInput } from "../../shared/pertemuan";

export interface PertemuanUntukTanggalResult {
  rombelId: string;
  pertemuan: PertemuanGroup[];
}

/**
 * Ambil pertemuan hasil penggabungan untuk SEMUA rombel pada hari-of-week
 * tanggal tertentu, dari versi jadwal AKTIF periode ini. Kalau rombelId
 * diberikan, dibatasi ke satu rombel saja (hemat baca).
 */
export async function getPertemuanUntukTanggal(
  db: Database,
  periodId: string,
  hari: Hari,
  options: { rombelId?: string } = {},
): Promise<PertemuanUntukTanggalResult[]> {
  const versiAktif = await db.query.jadwalVersi.findFirst({
    where: and(eq(jadwalVersi.period_id, periodId), eq(jadwalVersi.status, "aktif")),
  });
  if (!versiAktif) return [];

  const slotRows = await db.query.jadwalSlot.findMany({
    where: and(eq(jadwalSlot.jadwal_versi_id, versiAktif.id), eq(jadwalSlot.hari, hari)),
    orderBy: (t, { asc }) => [asc(t.urutan)],
  });
  if (slotRows.length === 0) return [];
  const slotIds = slotRows.map((s) => s.id);

  const slotInputs: PertemuanSlotInput[] = slotRows.map((s) => ({
    slotId: s.id,
    urutan: s.urutan,
    jamKe: s.jam_ke,
    jamMulai: s.jam_mulai,
    jamSelesai: s.jam_selesai,
    jenisSlot: s.jenis_slot,
  }));

  const isiConditions = [sql`${jadwalIsi.jadwal_slot_id} IN ${slotIds}`];
  if (options.rombelId) isiConditions.push(eq(jadwalIsi.rombel_id, options.rombelId));

  const relevantIsi = await db
    .select({ id: jadwalIsi.id, slotId: jadwalIsi.jadwal_slot_id, rombelId: jadwalIsi.rombel_id, mapelId: jadwalIsi.mapel_id })
    .from(jadwalIsi)
    .where(and(...isiConditions));

  if (relevantIsi.length === 0) return [];

  const isiIds = relevantIsi.map((i) => i.id);
  const guruRows = await db
    .select({ isiId: jadwalIsiGuru.jadwal_isi_id, guruId: jadwalIsiGuru.guru_id })
    .from(jadwalIsiGuru)
    .where(sql`${jadwalIsiGuru.jadwal_isi_id} IN ${isiIds}`);
  const guruByIsi = new Map<string, string[]>();
  for (const g of guruRows) {
    const arr = guruByIsi.get(g.isiId) ?? [];
    arr.push(g.guruId);
    guruByIsi.set(g.isiId, arr);
  }

  const byRombel = new Map<string, PertemuanIsiInput[]>();
  for (const i of relevantIsi) {
    const arr = byRombel.get(i.rombelId) ?? [];
    arr.push({ slotId: i.slotId, mapelId: i.mapelId, guruIds: guruByIsi.get(i.id) ?? [] });
    byRombel.set(i.rombelId, arr);
  }

  return [...byRombel.entries()].map(([rombelId, isiRows]) => ({
    rombelId,
    pertemuan: groupPertemuan(slotInputs, isiRows).map((p) => ({ ...p, rombelId })),
  }));
}
