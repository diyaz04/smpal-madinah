import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { jadwalPengganti, jadwalIsi, jadwalIsiGuru, rombel, mapel, guru, agenda } from "../db/schema";
import { getPertemuanUntukTanggal } from "./pertemuan.service";
import { determineStatus } from "./agenda.service";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { getGuruIzinPadaTanggal } from "./izinGuru.service";
import { getHariFromTanggal } from "../../shared/tanggal";
import type { PapanKbmCell } from "../../shared/types";
import type { PenggantiStatus } from "../../shared/constants";

export async function getPapanKbm(db: Database, periodId: string, tanggal: string): Promise<PapanKbmCell[]> {
  const hari = getHariFromTanggal(tanggal);
  if (!hari) return [];

  const perRombel = await getPertemuanUntukTanggal(db, periodId, hari);
  if (perRombel.length === 0) return [];

  const rombelIds = [...new Set(perRombel.map((r) => r.rombelId))];
  const mapelIds = [
    ...new Set(perRombel.flatMap((r) => r.pertemuan.map((p) => p.mapelId).filter((v): v is string => !!v))),
  ];

  const [penggantiRows, agendaRows, izinByGuru] = await Promise.all([
    db.query.jadwalPengganti.findMany({ where: eq(jadwalPengganti.tanggal, tanggal) }),
    db
      .select({ rombelId: agenda.rombel_id, slotMulai: agenda.slot_mulai })
      .from(agenda)
      .where(and(eq(agenda.tanggal, tanggal), sql`${agenda.rombel_id} IN ${rombelIds}`)),
    getGuruIzinPadaTanggal(db, tanggal),
  ]);

  const guruIds = new Set<string>();
  for (const { pertemuan } of perRombel) {
    for (const p of pertemuan) {
      for (const gid of p.guruIds) guruIds.add(gid);
    }
  }
  for (const pg of penggantiRows) {
    guruIds.add(pg.guru_asli_id);
    if (pg.guru_pengganti_id) guruIds.add(pg.guru_pengganti_id);
  }

  const [rombelRows, mapelRows, guruRows] = await Promise.all([
    db.select({ id: rombel.id, nama: rombel.nama }).from(rombel).where(sql`${rombel.id} IN ${rombelIds}`),
    mapelIds.length
      ? db.select({ id: mapel.id, nama: mapel.nama }).from(mapel).where(sql`${mapel.id} IN ${mapelIds}`)
      : Promise.resolve([]),
    guruIds.size
      ? db.select({ id: guru.id, nama: guru.nama_lengkap }).from(guru).where(sql`${guru.id} IN ${[...guruIds]}`)
      : Promise.resolve([]),
  ]);
  const rombelNamaById = new Map(rombelRows.map((r) => [r.id, r.nama]));
  const mapelNamaById = new Map(mapelRows.map((m) => [m.id, m.nama]));
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));
  const agendaByKey = new Set(agendaRows.map((a) => `${a.rombelId}|${a.slotMulai}`));
  const penggantiBySlotRombel = new Map(penggantiRows.map((p) => [`${p.jadwal_slot_id}|${p.rombel_id}`, p]));

  const cells: PapanKbmCell[] = [];
  for (const { rombelId, pertemuan } of perRombel) {
    for (const p of pertemuan) {
      const guruAsliId = p.guruIds[0] ?? null;
      const penggantiEntry = p.slotIds.map((sid) => penggantiBySlotRombel.get(`${sid}|${rombelId}`)).find((v) => v);
      const sudahDiisi = agendaByKey.has(`${rombelId}|${p.slotMulai}`);

      cells.push({
        rombelId,
        rombelNama: rombelNamaById.get(rombelId) ?? "—",
        slotMulai: p.slotMulai,
        slotSelesai: p.slotSelesai,
        jamKeMulai: p.jamKeMulai,
        mapelNama: p.mapelId ? (mapelNamaById.get(p.mapelId) ?? null) : null,
        guruAsliId,
        guruAsliNama: guruAsliId ? (guruNamaById.get(guruAsliId) ?? null) : null,
        statusAgenda: sudahDiisi ? "sudah_diisi" : determineStatus(tanggal, p.slotMulai, p.slotSelesai),
        pengganti: penggantiEntry
          ? {
              id: penggantiEntry.id,
              jadwalSlotId: penggantiEntry.jadwal_slot_id,
              rombelId,
              rombelNama: rombelNamaById.get(rombelId) ?? "—",
              mapelNama: p.mapelId ? (mapelNamaById.get(p.mapelId) ?? null) : null,
              tanggal,
              slotMulai: p.slotMulai,
              slotSelesai: p.slotSelesai,
              guruAsliId: penggantiEntry.guru_asli_id,
              guruAsliNama: guruNamaById.get(penggantiEntry.guru_asli_id) ?? "—",
              guruPenggantiId: penggantiEntry.guru_pengganti_id,
              guruPenggantiNama: penggantiEntry.guru_pengganti_id
                ? (guruNamaById.get(penggantiEntry.guru_pengganti_id) ?? null)
                : null,
              alasan: penggantiEntry.alasan,
              status: penggantiEntry.status,
            }
          : null,
        izinInfo: guruAsliId ? (izinByGuru.get(guruAsliId) ?? null) : null,
      });
    }
  }
  return cells.sort((a, b) => a.slotMulai.localeCompare(b.slotMulai) || a.rombelNama.localeCompare(b.rombelNama));
}

export interface AssignPenggantiInput {
  rombelId: string;
  tanggal: string;
  slotMulai: string;
  guruPenggantiId: string | null;
  alasan: string;
}

/** Tetapkan guru pengganti (atau jam kosong kalau guruPenggantiId null) utk satu pertemuan. */
export async function assignPengganti(
  db: Database,
  periodId: string,
  input: AssignPenggantiInput,
  actorUserId: string,
): Promise<void> {
  const hari = getHariFromTanggal(input.tanggal);
  if (!hari) throw new HTTPException(400, { message: "Tanggal tidak valid." });

  const perRombel = await getPertemuanUntukTanggal(db, periodId, hari, { rombelId: input.rombelId });
  const pertemuan = perRombel[0]?.pertemuan.find((p) => p.slotMulai === input.slotMulai);
  if (!pertemuan) throw new HTTPException(404, { message: "Pertemuan tidak ditemukan di jadwal aktif." });

  const guruAsliId = pertemuan.guruIds[0];
  if (!guruAsliId) throw new HTTPException(400, { message: "Pertemuan ini tidak punya guru asli." });

  if (input.guruPenggantiId) {
    const bentrokRows = await db
      .select({ isiId: jadwalIsiGuru.jadwal_isi_id })
      .from(jadwalIsiGuru)
      .innerJoin(jadwalIsi, eq(jadwalIsiGuru.jadwal_isi_id, jadwalIsi.id))
      .where(
        and(eq(jadwalIsiGuru.guru_id, input.guruPenggantiId), sql`${jadwalIsi.jadwal_slot_id} IN ${pertemuan.slotIds}`),
      );
    if (bentrokRows.length > 0) {
      throw new HTTPException(400, { message: "Guru pengganti sudah punya jadwal mengajar sendiri di jam ini." });
    }
  }

  const status: PenggantiStatus = input.guruPenggantiId ? "pengganti" : "jam_kosong";
  const now = new Date().toISOString();

  const existingRows = await db
    .select({ id: jadwalPengganti.id, slotId: jadwalPengganti.jadwal_slot_id })
    .from(jadwalPengganti)
    .where(and(eq(jadwalPengganti.rombel_id, input.rombelId), eq(jadwalPengganti.tanggal, input.tanggal)));
  const existingBySlot = new Map(existingRows.map((r) => [r.slotId, r.id]));

  const statements = pertemuan.slotIds.map((slotId) => {
    const existingId = existingBySlot.get(slotId);
    return existingId
      ? db
          .update(jadwalPengganti)
          .set({
            guru_pengganti_id: input.guruPenggantiId,
            alasan: nullIfEmpty(input.alasan),
            status,
            updated_at: now,
          })
          .where(eq(jadwalPengganti.id, existingId))
      : db.insert(jadwalPengganti).values({
          id: generateId(),
          jadwal_slot_id: slotId,
          rombel_id: input.rombelId,
          tanggal: input.tanggal,
          guru_asli_id: guruAsliId,
          guru_pengganti_id: input.guruPenggantiId,
          alasan: nullIfEmpty(input.alasan),
          status,
          dibuat_oleh: actorUserId,
          created_at: now,
          updated_at: now,
        });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

/** Batalkan penugasan pengganti/jam kosong — kembalikan ke guru asli terjadwal. */
export async function hapusPengganti(db: Database, periodId: string, input: { rombelId: string; tanggal: string; slotMulai: string }): Promise<void> {
  const hari = getHariFromTanggal(input.tanggal);
  if (!hari) throw new HTTPException(400, { message: "Tanggal tidak valid." });

  const perRombel = await getPertemuanUntukTanggal(db, periodId, hari, { rombelId: input.rombelId });
  const pertemuan = perRombel[0]?.pertemuan.find((p) => p.slotMulai === input.slotMulai);
  if (!pertemuan) throw new HTTPException(404, { message: "Pertemuan tidak ditemukan di jadwal aktif." });

  await db
    .delete(jadwalPengganti)
    .where(
      and(
        eq(jadwalPengganti.rombel_id, input.rombelId),
        eq(jadwalPengganti.tanggal, input.tanggal),
        sql`${jadwalPengganti.jadwal_slot_id} IN ${pertemuan.slotIds}`,
      ),
    );
}
