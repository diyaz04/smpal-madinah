import { Hono } from "hono";

import { getMonitoringGridHariIni, getBelumDiisi7Hari } from "../services/monitoringKbm.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import { nowWib } from "../lib/waktu";
import type { AppEnv } from "../types";

const MODULE = "monitoring_kbm";

export const monitoringKbmRoutes = new Hono<AppEnv>()
  .get("/grid-hari-ini", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const periodId = await resolvePeriodId(c);
    const tanggal = c.req.query("tanggal") || nowWib().tanggal;
    const items = await getMonitoringGridHariIni(db, periodId, tanggal);
    return c.json({ items, tanggal });
  })

  .get("/belum-diisi", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const periodId = await resolvePeriodId(c);
    const items = await getBelumDiisi7Hari(db, periodId);
    return c.json({ items });
  });
