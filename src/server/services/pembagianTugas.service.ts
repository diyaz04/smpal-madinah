import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  pembagianTugas,
  rombel,
  mapel,
  guru,
  jadwalIsiGuru,
  jadwalIsi,
  jadwalSlot,
  jadwalVersi,
} from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import { MINIMAL_JP_MENGAJAR } from "../../shared/constants";
import type { Tingkat } from "../../shared/constants";
import type { AssignPembagianTugasInput } from "../../shared/schemas/pembagianTugas.schema";
import type { PembagianTugasMatrix, PembagianTugasCell, RingkasanGuruItem } from "../../shared/types";

export async function getMatrix(db: Database, periodId: string): Promise<PembagianTugasMatrix> {
  const rombelRows = await db.query.rombel.findMany({
    where: and(eq(rombel.period_id, periodId), isNull(rombel.deleted_at)),
    orderBy: [asc(rombel.tingkat), asc(rombel.urutan), asc(rombel.nama)],
  });
  const mapelRows = await db.query.mapel.findMany({
    where: and(isNull(mapel.deleted_at), eq(mapel.is_active, true)),
    orderBy: [asc(mapel.urutan_raport)],
  });

  const tugasRows = await db
    .select({
      id: pembagianTugas.id,
      rombelId: pembagianTugas.rombel_id,
      mapelId: pembagianTugas.mapel_id,
      isTeamTeaching: pembagianTugas.is_team_teaching,
      guruId: guru.id,
      guruNama: guru.nama_lengkap,
    })
    .from(pembagianTugas)
    .innerJoin(guru, eq(guru.id, pembagianTugas.guru_id))
    .where(eq(pembagianTugas.period_id, periodId));

  const cellMap = new Map<string, PembagianTugasCell>();
  for (const row of tugasRows) {
    const key = `${row.rombelId}|${row.mapelId}`;
    const cell = cellMap.get(key) ?? {
      rombelId: row.rombelId,
      mapelId: row.mapelId,
      guru: [],
      isTeamTeaching: row.isTeamTeaching,
      pembagianTugasIds: [],
    };
    cell.guru.push({ id: row.guruId, namaLengkap: row.guruNama });
    cell.pembagianTugasIds.push(row.id);
    cellMap.set(key, cell);
  }

  return {
    rombel: rombelRows.map((r) => ({ id: r.id, nama: r.nama, tingkat: r.tingkat })),
    mapel: mapelRows.map((m) => ({ id: m.id, nama: m.nama, kodeJadwal: m.kode_jadwal })),
    cells: [...cellMap.values()],
  };
}

export interface GuruAssignmentItem {
  id: string;
  rombelId: string;
  rombelNama: string;
  mapelId: string;
  mapelNama: string;
  tingkat: Tingkat;
  isTeamTeaching: boolean;
}

export async function getGuruAssignments(
  db: Database,
  guruId: string,
  periodId: string,
): Promise<GuruAssignmentItem[]> {
  const rows = await db
    .select({
      id: pembagianTugas.id,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      mapelId: mapel.id,
      mapelNama: mapel.nama,
      tingkat: rombel.tingkat,
      isTeamTeaching: pembagianTugas.is_team_teaching,
    })
    .from(pembagianTugas)
    .innerJoin(rombel, eq(rombel.id, pembagianTugas.rombel_id))
    .innerJoin(mapel, eq(mapel.id, pembagianTugas.mapel_id))
    .where(and(eq(pembagianTugas.guru_id, guruId), eq(pembagianTugas.period_id, periodId)))
    .orderBy(asc(rombel.tingkat), asc(rombel.nama));
  return rows;
}

export async function assignPembagianTugas(
  db: Database,
  periodId: string,
  input: AssignPembagianTugasInput,
): Promise<{ assigned: number; skipped: { rombelId: string; reason: string }[] }> {
  const existingRows = await db
    .select({
      id: pembagianTugas.id,
      rombelId: pembagianTugas.rombel_id,
      guruId: pembagianTugas.guru_id,
      isTeamTeaching: pembagianTugas.is_team_teaching,
    })
    .from(pembagianTugas)
    .where(
      and(
        eq(pembagianTugas.period_id, periodId),
        eq(pembagianTugas.mapel_id, input.mapelId),
        sql`${pembagianTugas.rombel_id} IN ${input.rombelIds}`,
      ),
    );

  const existingByRombel = new Map<string, typeof existingRows>();
  for (const row of existingRows) {
    const arr = existingByRombel.get(row.rombelId) ?? [];
    arr.push(row);
    existingByRombel.set(row.rombelId, arr);
  }

  const now = new Date().toISOString();
  const toInsert: (typeof pembagianTugas.$inferInsert)[] = [];
  // Baris lama yang perlu ditandai team_teaching=true karena guru baru
  // bergabung sebagai team teaching (niat admin saat ini, bukan status lama).
  const idsToPromote: string[] = [];
  const skipped: { rombelId: string; reason: string }[] = [];

  for (const rombelId of input.rombelIds) {
    const existing = existingByRombel.get(rombelId) ?? [];
    if (existing.some((e) => e.guruId === input.guruId)) {
      skipped.push({ rombelId, reason: "Guru ini sudah ditugaskan di rombel ini." });
      continue;
    }
    if (existing.length > 0) {
      if (!input.isTeamTeaching) {
        skipped.push({
          rombelId,
          reason: "Sudah ada guru lain untuk mapel ini di rombel tersebut (centang Team Teaching untuk menambahkan).",
        });
        continue;
      }
      for (const e of existing) {
        if (!e.isTeamTeaching) idsToPromote.push(e.id);
      }
    }
    toInsert.push({
      id: generateId(),
      period_id: periodId,
      guru_id: input.guruId,
      rombel_id: rombelId,
      mapel_id: input.mapelId,
      is_team_teaching: input.isTeamTeaching,
      created_at: now,
      updated_at: now,
    });
  }

  if (idsToPromote.length > 0) {
    const [firstId, ...restIds] = idsToPromote;
    const toPromoteStatement = (rowId: string) =>
      db.update(pembagianTugas).set({ is_team_teaching: true, updated_at: now }).where(eq(pembagianTugas.id, rowId));
    await db.batch([toPromoteStatement(firstId!), ...restIds.map(toPromoteStatement)]);
  }

  if (toInsert.length > 0) {
    const chunks = chunkArray(toInsert, 30);
    await db.batch([
      db.insert(pembagianTugas).values(chunks[0]!),
      ...chunks.slice(1).map((chunk) => db.insert(pembagianTugas).values(chunk)),
    ]);
  }

  return { assigned: toInsert.length, skipped };
}

export async function removePembagianTugas(db: Database, id: string): Promise<void> {
  const existing = await db.query.pembagianTugas.findFirst({ where: eq(pembagianTugas.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Penugasan tidak ditemukan." });
  await db.delete(pembagianTugas).where(eq(pembagianTugas.id, id));
}

export async function copyPembagianTugasFromPeriod(
  db: Database,
  targetPeriodId: string,
  sourcePeriodId: string,
): Promise<{ count: number }> {
  const sourceRows = await db.query.pembagianTugas.findMany({
    where: eq(pembagianTugas.period_id, sourcePeriodId),
  });
  if (sourceRows.length === 0) return { count: 0 };

  const targetRows = await db.query.pembagianTugas.findMany({
    where: eq(pembagianTugas.period_id, targetPeriodId),
  });
  const targetKeys = new Set(targetRows.map((r) => `${r.rombel_id}|${r.mapel_id}|${r.guru_id}`));

  const now = new Date().toISOString();
  const toInsert = sourceRows
    .filter((r) => !targetKeys.has(`${r.rombel_id}|${r.mapel_id}|${r.guru_id}`))
    .map((r) => ({
      id: generateId(),
      period_id: targetPeriodId,
      guru_id: r.guru_id,
      rombel_id: r.rombel_id,
      mapel_id: r.mapel_id,
      is_team_teaching: r.is_team_teaching,
      created_at: now,
      updated_at: now,
    }));
  if (toInsert.length === 0) return { count: 0 };

  const chunks = chunkArray(toInsert, 30);
  await db.batch([
    db.insert(pembagianTugas).values(chunks[0]!),
    ...chunks.slice(1).map((chunk) => db.insert(pembagianTugas).values(chunk)),
  ]);

  return { count: toInsert.length };
}

export async function getRingkasanGuru(db: Database, periodId: string): Promise<RingkasanGuruItem[]> {
  const tugasRows = await db
    .select({
      guruId: guru.id,
      guruNama: guru.nama_lengkap,
      rombelId: pembagianTugas.rombel_id,
      mapelId: pembagianTugas.mapel_id,
    })
    .from(pembagianTugas)
    .innerJoin(guru, eq(guru.id, pembagianTugas.guru_id))
    .where(eq(pembagianTugas.period_id, periodId));

  if (tugasRows.length === 0) return [];

  const byGuru = new Map<string, { nama: string; rombel: Set<string>; mapel: Set<string> }>();
  for (const row of tugasRows) {
    const entry = byGuru.get(row.guruId) ?? { nama: row.guruNama, rombel: new Set(), mapel: new Set() };
    entry.rombel.add(row.rombelId);
    entry.mapel.add(row.mapelId);
    byGuru.set(row.guruId, entry);
  }

  const guruIds = [...byGuru.keys()];
  const jpRows = await db
    .select({ guruId: jadwalIsiGuru.guru_id, count: sql<number>`COUNT(*)` })
    .from(jadwalIsiGuru)
    .innerJoin(jadwalIsi, eq(jadwalIsiGuru.jadwal_isi_id, jadwalIsi.id))
    .innerJoin(jadwalSlot, eq(jadwalIsi.jadwal_slot_id, jadwalSlot.id))
    .innerJoin(jadwalVersi, eq(jadwalSlot.jadwal_versi_id, jadwalVersi.id))
    .where(
      and(
        sql`${jadwalIsiGuru.guru_id} IN ${guruIds}`,
        eq(jadwalVersi.period_id, periodId),
        eq(jadwalVersi.status, "aktif"),
        eq(jadwalSlot.jenis_slot, "kbm"),
      ),
    )
    .groupBy(jadwalIsiGuru.guru_id);
  const jpByGuru = new Map(jpRows.map((r) => [r.guruId, Number(r.count)]));

  return [...byGuru.entries()]
    .map(([guruId, entry]) => {
      const totalJp = jpByGuru.get(guruId) ?? 0;
      return {
        guruId,
        namaLengkap: entry.nama,
        totalJpPerMinggu: totalJp,
        jumlahMapel: entry.mapel.size,
        jumlahRombel: entry.rombel.size,
        dibawahMinimal: totalJp < MINIMAL_JP_MENGAJAR,
      };
    })
    .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, "id"));
}
