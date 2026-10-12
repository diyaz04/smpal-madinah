import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { academicPeriods } from "../db/schema";
import { getActivePeriod } from "../services/settings.service";
import type { AppEnv } from "../types";

/** Query param `periodId` kalau ada, atau periode aktif sebagai default. */
export async function resolvePeriodId(c: Context<AppEnv>): Promise<string> {
  const queryPeriodId = c.req.query("periodId");
  if (queryPeriodId) return queryPeriodId;
  const active = await getActivePeriod(c.get("db"));
  if (!active) throw new HTTPException(400, { message: "Belum ada tahun ajaran aktif." });
  return active.id;
}

/** `year_label` periode — dipakai modul yang akumulasi datanya per tahun ajaran (bukan per semester), mis. Pelanggaran. */
export async function getTahunAjaran(db: Database, periodId: string): Promise<string> {
  const row = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) });
  if (!row) throw new HTTPException(400, { message: "Periode tidak ditemukan." });
  return row.year_label;
}
