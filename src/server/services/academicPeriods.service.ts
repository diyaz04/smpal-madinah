import { desc, eq, ne } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { academicPeriods } from "../db/schema";
import { generateId } from "../lib/id";
import type {
  CreateAcademicPeriodInput,
  UpdateAcademicPeriodInput,
} from "../../shared/schemas/academicPeriod.schema";
import type { AcademicPeriodListItem } from "../../shared/types";

function toListItem(row: typeof academicPeriods.$inferSelect): AcademicPeriodListItem {
  return {
    id: row.id,
    yearLabel: row.year_label,
    semester: row.semester,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

export async function listAcademicPeriods(db: Database): Promise<AcademicPeriodListItem[]> {
  const rows = await db.query.academicPeriods.findMany({
    orderBy: [desc(academicPeriods.start_date)],
  });
  return rows.filter((r) => !r.deleted_at).map(toListItem);
}

async function assertNameAvailable(
  db: Database,
  yearLabel: string,
  semester: string,
  excludeId?: string,
) {
  const existing = await db.query.academicPeriods.findFirst({
    where: eq(academicPeriods.year_label, yearLabel),
  });
  if (existing && existing.semester === semester && existing.id !== excludeId) {
    throw new HTTPException(409, { message: "Tahun ajaran & semester ini sudah ada." });
  }
}

export async function createAcademicPeriod(
  db: Database,
  input: CreateAcademicPeriodInput,
): Promise<AcademicPeriodListItem> {
  await assertNameAvailable(db, input.yearLabel, input.semester);
  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(academicPeriods).values({
    id,
    year_label: input.yearLabel,
    semester: input.semester,
    start_date: input.startDate,
    end_date: input.endDate,
    is_active: false,
    created_at: now,
    updated_at: now,
  });
  const row = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, id) });
  return toListItem(row!);
}

export async function updateAcademicPeriod(
  db: Database,
  id: string,
  input: UpdateAcademicPeriodInput,
): Promise<AcademicPeriodListItem> {
  const existing = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, id) });
  if (!existing || existing.deleted_at) {
    throw new HTTPException(404, { message: "Periode tidak ditemukan." });
  }
  await assertNameAvailable(db, input.yearLabel, input.semester, id);

  await db
    .update(academicPeriods)
    .set({
      year_label: input.yearLabel,
      semester: input.semester,
      start_date: input.startDate,
      end_date: input.endDate,
      updated_at: new Date().toISOString(),
    })
    .where(eq(academicPeriods.id, id));

  const row = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, id) });
  return toListItem(row!);
}

export async function deleteAcademicPeriod(db: Database, id: string): Promise<void> {
  const existing = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, id) });
  if (!existing || existing.deleted_at) {
    throw new HTTPException(404, { message: "Periode tidak ditemukan." });
  }
  if (existing.is_active) {
    throw new HTTPException(400, {
      message: "Tidak bisa menghapus periode yang sedang aktif.",
    });
  }
  await db
    .update(academicPeriods)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(academicPeriods.id, id));
}

export async function activateAcademicPeriod(db: Database, id: string): Promise<void> {
  const existing = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, id) });
  if (!existing || existing.deleted_at) {
    throw new HTTPException(404, { message: "Periode tidak ditemukan." });
  }
  if (existing.is_active) return;

  const now = new Date().toISOString();
  await db.batch([
    db
      .update(academicPeriods)
      .set({ is_active: false, updated_at: now })
      .where(ne(academicPeriods.id, id)),
    db.update(academicPeriods).set({ is_active: true, updated_at: now }).where(eq(academicPeriods.id, id)),
  ]);
}
