import { and, eq, isNull, lte, gte, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { kalenderEntri, rombel, mapel, guru, agenda } from "../db/schema";
import { getPertemuanUntukTanggal } from "./pertemuan.service";
import { determineStatus } from "./agenda.service";
import { getPapanKbm } from "./penggantiKbm.service";
import { getHariFromTanggal, addDays } from "../../shared/tanggal";
import { nowWib } from "../lib/waktu";
import type { PapanKbmCell, MonitoringBelumDiisiItem } from "../../shared/types";
import type { Tingkat } from "../../shared/constants";

export async function getMonitoringGridHariIni(db: Database, periodId: string, tanggal: string): Promise<PapanKbmCell[]> {
  return getPapanKbm(db, periodId, tanggal);
}

/**
 * Daftar pertemuan 7 hari terakhir (termasuk hari ini) yang sudah lewat
 * waktunya tapi belum diisi agendanya. Pengecekan kalender libur dilakukan
 * dengan SATU query untuk seluruh rentang (bukan per-rombel per-hari)
 * supaya tetap hemat kuota untuk sekolah dengan banyak rombel.
 */
export async function getBelumDiisi7Hari(db: Database, periodId: string): Promise<MonitoringBelumDiisiItem[]> {
  const today = nowWib().tanggal;
  const tanggalMulai = addDays(today, -6);

  const [rombelRows, entriLibur] = await Promise.all([
    db.select({ id: rombel.id, nama: rombel.nama, tingkat: rombel.tingkat }).from(rombel),
    db.query.kalenderEntri.findMany({
      where: and(
        eq(kalenderEntri.period_id, periodId),
        eq(kalenderEntri.kbm_ditiadakan, true),
        isNull(kalenderEntri.deleted_at),
        lte(kalenderEntri.tanggal_mulai, today),
        gte(kalenderEntri.tanggal_selesai, tanggalMulai),
      ),
    }),
  ]);
  const rombelById = new Map(rombelRows.map((r) => [r.id, r]));

  function isLibur(tanggal: string, tingkat: Tingkat): boolean {
    return entriLibur.some((e) => {
      if (tanggal < e.tanggal_mulai || tanggal > e.tanggal_selesai) return false;
      if (e.cakupan === "SEMUA") return true;
      const tingkatBerlaku = JSON.parse(e.tingkat_berlaku) as Tingkat[];
      return tingkatBerlaku.includes(tingkat);
    });
  }

  type Candidate = { rombelId: string; tanggal: string; slotMulai: string; slotSelesai: string; mapelId: string | null; guruId: string };
  const candidates: Candidate[] = [];

  for (let i = 0; i < 7; i++) {
    const tanggal = addDays(tanggalMulai, i);
    const hari = getHariFromTanggal(tanggal);
    if (!hari) continue;

    const perRombel = await getPertemuanUntukTanggal(db, periodId, hari);
    for (const { rombelId, pertemuan } of perRombel) {
      const rombelRow = rombelById.get(rombelId);
      if (!rombelRow || isLibur(tanggal, rombelRow.tingkat)) continue;

      for (const p of pertemuan) {
        const guruId = p.guruIds[0];
        if (!guruId) continue;
        if (determineStatus(tanggal, p.slotMulai, p.slotSelesai) !== "belum_diisi") continue;
        candidates.push({ rombelId, tanggal, slotMulai: p.slotMulai, slotSelesai: p.slotSelesai, mapelId: p.mapelId, guruId });
      }
    }
  }
  if (candidates.length === 0) return [];

  const rombelIds = [...new Set(candidates.map((c) => c.rombelId))];
  const agendaRows = await db
    .select({ rombelId: agenda.rombel_id, tanggal: agenda.tanggal, slotMulai: agenda.slot_mulai })
    .from(agenda)
    .where(
      and(
        sql`${agenda.rombel_id} IN ${rombelIds}`,
        gte(agenda.tanggal, tanggalMulai),
        lte(agenda.tanggal, today),
      ),
    );
  const filledKeys = new Set(agendaRows.map((a) => `${a.rombelId}|${a.tanggal}|${a.slotMulai}`));

  const unfilled = candidates.filter((c) => !filledKeys.has(`${c.rombelId}|${c.tanggal}|${c.slotMulai}`));
  if (unfilled.length === 0) return [];

  const mapelIds = [...new Set(unfilled.map((c) => c.mapelId).filter((v): v is string => !!v))];
  const guruIds = [...new Set(unfilled.map((c) => c.guruId))];
  const [mapelRows, guruRows] = await Promise.all([
    mapelIds.length ? db.select({ id: mapel.id, nama: mapel.nama }).from(mapel).where(sql`${mapel.id} IN ${mapelIds}`) : Promise.resolve([]),
    db.select({ id: guru.id, nama: guru.nama_lengkap }).from(guru).where(sql`${guru.id} IN ${guruIds}`),
  ]);
  const mapelNamaById = new Map(mapelRows.map((m) => [m.id, m.nama]));
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));

  return unfilled
    .map((c) => ({
      guruId: c.guruId,
      guruNama: guruNamaById.get(c.guruId) ?? "—",
      tanggal: c.tanggal,
      rombelNama: rombelById.get(c.rombelId)?.nama ?? "—",
      mapelNama: c.mapelId ? (mapelNamaById.get(c.mapelId) ?? null) : null,
      slotMulai: c.slotMulai,
      slotSelesai: c.slotSelesai,
    }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.slotMulai.localeCompare(b.slotMulai));
}
