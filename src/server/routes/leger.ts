import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { kirimPengingatSchema } from "../../shared/schemas/deskripsiNilai.schema";
import { getMonitoringKelengkapan, kirimPengingatKelengkapan } from "../services/monitoringNilai.service";
import { getLeger } from "../services/leger.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { getWaliRombelIds } from "../services/scope.service";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "leger";

export const legerRoutes = new Hono<AppEnv>()
  .get("/monitoring", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);

    const scopedRombelIds =
      scope === "milik_sendiri" ? (user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : []) : null;

    const items = await getMonitoringKelengkapan(db, periodId, scopedRombelIds);
    return c.json({ items });
  })

  .post("/pengingat", requirePermission(MODULE, "tambah"), zValidator("json", kirimPengingatSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    if (scope === "milik_sendiri") {
      const scopedRombelIds = actor.guruId ? await getWaliRombelIds(db, actor.guruId, periodId) : [];
      if (!scopedRombelIds.includes(input.rombelId)) {
        return c.json({ error: "Anda tidak punya akses ke rombel ini." }, 403);
      }
    }

    await kirimPengingatKelengkapan(db, periodId, input.rombelId, input.mapelId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: null,
      after: { rombelId: input.rombelId, mapelId: input.mapelId },
    });

    return c.json({ ok: true });
  })

  .get("/:rombelId", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.param("rombelId")!;

    if (scope === "milik_sendiri") {
      const scopedRombelIds = user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : [];
      if (!scopedRombelIds.includes(rombelId)) {
        return c.json({ error: "Anda tidak punya akses ke rombel ini." }, 403);
      }
    }

    const item = await getLeger(db, periodId, rombelId);
    return c.json({ item });
  });
