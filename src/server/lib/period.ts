import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

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
