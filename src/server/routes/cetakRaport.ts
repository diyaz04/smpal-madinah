import { Hono } from "hono";

import { getRaportCetakKonteks } from "../services/raportCetak.service";
import { assertBisaLihatRombel } from "../services/raportKelas.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "cetak_raport";

export const cetakRaportRoutes = new Hono<AppEnv>().get("/:rombelId", requirePermission(MODULE, "lihat"), async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const scope = c.get("permissionScope")!;
  const periodId = await resolvePeriodId(c);
  const rombelId = c.req.param("rombelId")!;

  await assertBisaLihatRombel(db, user, scope, periodId, rombelId);
  const item = await getRaportCetakKonteks(db, periodId, rombelId);
  return c.json({ item });
});
