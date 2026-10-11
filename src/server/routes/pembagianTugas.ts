import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  assignPembagianTugasSchema,
  copyPembagianTugasFromPeriodSchema,
} from "../../shared/schemas/pembagianTugas.schema";
import {
  getMatrix,
  getGuruAssignments,
  assignPembagianTugas,
  removePembagianTugas,
  copyPembagianTugasFromPeriod,
  getRingkasanGuru,
} from "../services/pembagianTugas.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "pembagian_tugas_mengajar";

export const pembagianTugasRoutes = new Hono<AppEnv>()
  .get("/matrix", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const matrix = await getMatrix(c.get("db"), periodId);
    return c.json(matrix);
  })

  .get("/ringkasan-guru", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await getRingkasanGuru(c.get("db"), periodId);
    return c.json({ items });
  })

  .get("/guru/:guruId", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await getGuruAssignments(c.get("db"), c.req.param("guruId")!, periodId);
    return c.json({ items });
  })

  .post(
    "/copy-from-period",
    requirePermission(MODULE, "tambah"),
    zValidator("json", copyPembagianTugasFromPeriodSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const targetPeriodId = await resolvePeriodId(c);
      const input = c.req.valid("json");
      const result = await copyPembagianTugasFromPeriod(db, targetPeriodId, input.sourcePeriodId);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: targetPeriodId,
        after: { disalinDari: input.sourcePeriodId, jumlah: result.count },
      });

      return c.json(result);
    },
  )

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", assignPembagianTugasSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");
    const result = await assignPembagianTugas(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: input.guruId,
      after: { mapelId: input.mapelId, jumlahRombel: result.assigned },
    });

    return c.json(result, 201);
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await removePembagianTugas(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
