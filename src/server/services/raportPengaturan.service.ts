import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { raportPengaturan } from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { DEFAULT_RAPORT_PENGATURAN } from "../../shared/constants";
import type { UpdateRaportPengaturanInput } from "../../shared/schemas/raportPengaturan.schema";
import type { RaportPengaturan } from "../../shared/types";
import type { Tingkat } from "../../shared/constants";

function toItem(row: typeof raportPengaturan.$inferSelect): RaportPengaturan {
  return {
    periodId: row.period_id,
    bobotTp: row.bobot_tp,
    bobotSts: row.bobot_sts,
    bobotSas: row.bobot_sas,
    pembulatanDesimal: row.pembulatan_desimal,
    tempatRaport: row.tempat_raport,
    tanggalRaport: row.tanggal_raport,
    fasePerTingkat: JSON.parse(row.fase_per_tingkat) as Record<Tingkat, string>,
    tampilkanPeringkat: row.tampilkan_peringkat,
  };
}

/** Dibuat otomatis dengan nilai default kalau periode belum punya pengaturan raport. */
export async function getOrCreateRaportPengaturan(db: Database, periodId: string): Promise<RaportPengaturan> {
  const existing = await db.query.raportPengaturan.findFirst({ where: eq(raportPengaturan.period_id, periodId) });
  if (existing) return toItem(existing);

  const now = new Date().toISOString();
  const row = {
    id: generateId(),
    period_id: periodId,
    bobot_tp: DEFAULT_RAPORT_PENGATURAN.bobotTp,
    bobot_sts: DEFAULT_RAPORT_PENGATURAN.bobotSts,
    bobot_sas: DEFAULT_RAPORT_PENGATURAN.bobotSas,
    pembulatan_desimal: DEFAULT_RAPORT_PENGATURAN.pembulatanDesimal,
    tempat_raport: null,
    tanggal_raport: null,
    fase_per_tingkat: JSON.stringify(DEFAULT_RAPORT_PENGATURAN.fasePerTingkat),
    tampilkan_peringkat: DEFAULT_RAPORT_PENGATURAN.tampilkanPeringkat,
    created_at: now,
    updated_at: now,
  };
  await db.insert(raportPengaturan).values(row);
  return toItem(row);
}

export async function updateRaportPengaturan(
  db: Database,
  periodId: string,
  input: UpdateRaportPengaturanInput,
): Promise<RaportPengaturan> {
  await getOrCreateRaportPengaturan(db, periodId); // pastikan baris ada dulu

  await db
    .update(raportPengaturan)
    .set({
      bobot_tp: input.bobotTp,
      bobot_sts: input.bobotSts,
      bobot_sas: input.bobotSas,
      pembulatan_desimal: input.pembulatanDesimal,
      tempat_raport: nullIfEmpty(input.tempatRaport),
      tanggal_raport: nullIfEmpty(input.tanggalRaport),
      fase_per_tingkat: JSON.stringify(input.fasePerTingkat),
      tampilkan_peringkat: input.tampilkanPeringkat,
      updated_at: new Date().toISOString(),
    })
    .where(eq(raportPengaturan.period_id, periodId));

  const row = await db.query.raportPengaturan.findFirst({ where: eq(raportPengaturan.period_id, periodId) });
  return toItem(row!);
}
