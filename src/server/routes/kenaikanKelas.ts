import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { promoteSchema } from "../../shared/schemas/kenaikanKelas.schema";
import { getPromotionOverview, promoteSiswa } from "../services/kenaikanKelas.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "kenaikan_kelas";

export const kenaikanKelasRoutes = new Hono<AppEnv>()
  .get("/overview", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await getPromotionOverview(c.get("db"), periodId);
    return c.json({ items });
  })

  .post("/promote", requirePermission(MODULE, "tambah"), zValidator("json", promoteSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");
    const result = await promoteSiswa(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: input.targetPeriodId,
      after: { promoted: result.promoted, lulus: result.lulus, skipped: result.skipped },
    });

    return c.json(result, 201);
  });
