import { and, asc, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { catatanTemplate } from "../db/schema";
import { generateId } from "../lib/id";
import type { CreateCatatanTemplateInput, UpdateCatatanTemplateInput } from "../../shared/schemas/catatanTemplate.schema";
import type { CatatanTemplateItem } from "../../shared/types";

export async function listCatatanTemplate(db: Database): Promise<CatatanTemplateItem[]> {
  const rows = await db.query.catatanTemplate.findMany({
    where: isNull(catatanTemplate.deleted_at),
    orderBy: [asc(catatanTemplate.teks)],
  });
  return rows.map((r) => ({ id: r.id, teks: r.teks }));
}

export async function createCatatanTemplate(db: Database, input: CreateCatatanTemplateInput): Promise<{ id: string }> {
  const id = generateId();
  const now = new Date().toISOString();
  await db.insert(catatanTemplate).values({ id, teks: input.teks, created_at: now, updated_at: now });
  return { id };
}

export async function updateCatatanTemplate(db: Database, id: string, input: UpdateCatatanTemplateInput): Promise<void> {
  const existing = await db.query.catatanTemplate.findFirst({ where: and(eq(catatanTemplate.id, id), isNull(catatanTemplate.deleted_at)) });
  if (!existing) throw new HTTPException(404, { message: "Template tidak ditemukan." });
  await db.update(catatanTemplate).set({ teks: input.teks, updated_at: new Date().toISOString() }).where(eq(catatanTemplate.id, id));
}

export async function deleteCatatanTemplate(db: Database, id: string): Promise<void> {
  const existing = await db.query.catatanTemplate.findFirst({ where: and(eq(catatanTemplate.id, id), isNull(catatanTemplate.deleted_at)) });
  if (!existing) throw new HTTPException(404, { message: "Template tidak ditemukan." });
  await db
    .update(catatanTemplate)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(catatanTemplate.id, id));
}
