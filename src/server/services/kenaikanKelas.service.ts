import { and, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { rombel, siswa, siswaKelas, academicPeriods } from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import type { PromoteInput } from "../../shared/schemas/kenaikanKelas.schema";
import type { RombelPromotionOverviewItem, PromoteResult } from "../../shared/types";

export async function getPromotionOverview(
  db: Database,
  sourcePeriodId: string,
): Promise<RombelPromotionOverviewItem[]> {
  const rombelRows = await db.query.rombel.findMany({
    where: and(eq(rombel.period_id, sourcePeriodId), isNull(rombel.deleted_at)),
    orderBy: (t, { asc }) => [asc(t.tingkat), asc(t.urutan), asc(t.nama)],
  });
  if (rombelRows.length === 0) return [];

  const countRows = await db
    .select({ rombelId: siswaKelas.rombel_id, count: sql<number>`COUNT(*)` })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
    .where(
      and(
        eq(siswaKelas.period_id, sourcePeriodId),
        sql`${siswaKelas.rombel_id} IN ${rombelRows.map((r) => r.id)}`,
        eq(siswa.status, "AKTIF"),
        isNull(siswa.deleted_at),
      ),
    )
    .groupBy(siswaKelas.rombel_id);
  const countByRombel = new Map(countRows.map((r) => [r.rombelId, Number(r.count)]));

  return rombelRows.map((r) => ({
    id: r.id,
    nama: r.nama,
    tingkat: r.tingkat,
    jumlahSiswaAktif: countByRombel.get(r.id) ?? 0,
  }));
}

export async function promoteSiswa(
  db: Database,
  sourcePeriodId: string,
  input: PromoteInput,
): Promise<PromoteResult> {
  if (input.targetPeriodId === sourcePeriodId) {
    throw new HTTPException(400, { message: "Periode tujuan harus berbeda dari periode asal." });
  }
  const targetPeriod = await db.query.academicPeriods.findFirst({
    where: eq(academicPeriods.id, input.targetPeriodId),
  });
  if (!targetPeriod || targetPeriod.deleted_at) {
    throw new HTTPException(404, { message: "Periode tujuan tidak ditemukan." });
  }

  let promoted = 0;
  let lulus = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const mapping of input.mappings) {
    if (mapping.action === "lewati") {
      skipped++;
      continue;
    }

    const siswaRows = await db
      .select({ siswaId: siswaKelas.siswa_id })
      .from(siswaKelas)
      .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
      .where(
        and(
          eq(siswaKelas.rombel_id, mapping.sourceRombelId),
          eq(siswaKelas.period_id, sourcePeriodId),
          eq(siswa.status, "AKTIF"),
          isNull(siswa.deleted_at),
        ),
      );
    if (siswaRows.length === 0) continue;
    const siswaIds = siswaRows.map((r) => r.siswaId);

    if (mapping.action === "lulus") {
      const [firstId, ...restIds] = siswaIds;
      const toStatement = (id: string) =>
        db
          .update(siswa)
          .set({ status: "LULUS", status_tanggal: now, updated_at: now })
          .where(eq(siswa.id, id));
      await db.batch([toStatement(firstId!), ...restIds.map(toStatement)]);
      lulus += siswaIds.length;
      continue;
    }

    // action === "naik": pindahkan ke rombel tujuan di periode baru (skip yang sudah punya penempatan di periode tujuan).
    const existingRows = await db
      .select({ siswaId: siswaKelas.siswa_id })
      .from(siswaKelas)
      .where(and(sql`${siswaKelas.siswa_id} IN ${siswaIds}`, eq(siswaKelas.period_id, input.targetPeriodId)));
    const existingSet = new Set(existingRows.map((r) => r.siswaId));
    const toInsert = siswaIds
      .filter((id) => !existingSet.has(id))
      .map((siswaId) => ({
        id: generateId(),
        siswa_id: siswaId,
        rombel_id: mapping.targetRombelId!,
        period_id: input.targetPeriodId,
        nomor_absen: null,
        created_at: now,
        updated_at: now,
      }));
    skipped += existingSet.size;
    if (toInsert.length === 0) continue;

    const chunks = chunkArray(toInsert, 40);
    await db.batch([
      db.insert(siswaKelas).values(chunks[0]!),
      ...chunks.slice(1).map((chunk) => db.insert(siswaKelas).values(chunk)),
    ]);
    promoted += toInsert.length;
  }

  return { promoted, lulus, skipped };
}
