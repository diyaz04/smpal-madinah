import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { updateRaportPengaturanSchema } from "../../shared/schemas/raportPengaturan.schema";
import { getOrCreateRaportPengaturan, updateRaportPengaturan } from "../services/raportPengaturan.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "pengaturan_raport";

export const raportPengaturanRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const periodId = await resolvePeriodId(c);
    const item = await getOrCreateRaportPengaturan(db, periodId);
    return c.json({ item });
  })

  .put("/", requirePermission(MODULE, "ubah"), zValidator("json", updateRaportPengaturanSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    const item = await updateRaportPengaturan(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: periodId,
      after: { bobotTp: item.bobotTp, bobotSts: item.bobotSts, bobotSas: item.bobotSas },
    });

    return c.json({ item });
  });
