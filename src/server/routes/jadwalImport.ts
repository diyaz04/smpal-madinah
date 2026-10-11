import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  matchImportRequestSchema,
  saveGuruAliasBulkSchema,
  commitImportSchema,
} from "../../shared/schemas/jadwalImport.schema";
import { matchImportData, commitImport } from "../services/jadwalImport.service";
import { addGuruAlias } from "../services/guru.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "import_jadwal";

export const jadwalImportRoutes = new Hono<AppEnv>()
  .post("/match", requirePermission(MODULE, "lihat"), zValidator("json", matchImportRequestSchema), async (c) => {
    const db = c.get("db");
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");
    const result = await matchImportData(db, input, periodId);
    return c.json(result);
  })

  .post(
    "/save-alias",
    requirePermission(MODULE, "tambah"),
    zValidator("json", saveGuruAliasBulkSchema),
    async (c) => {
      const db = c.get("db");
      const { items } = c.req.valid("json");
      for (const item of items) {
        await addGuruAlias(db, item.guruId, item.aliasNama);
      }
      return c.json({ ok: true });
    },
  )

  .post("/commit", requirePermission(MODULE, "tambah"), zValidator("json", commitImportSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");
    const result = await commitImport(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.versiId,
      after: { slotCount: result.slotCount, isiCount: result.isiCount, warningCount: result.warnings.length },
    });

    return c.json(result, 201);
  });
