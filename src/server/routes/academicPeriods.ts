import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createAcademicPeriodSchema,
  updateAcademicPeriodSchema,
} from "../../shared/schemas/academicPeriod.schema";
import {
  listAcademicPeriods,
  createAcademicPeriod,
  updateAcademicPeriod,
  deleteAcademicPeriod,
  activateAcademicPeriod,
} from "../services/academicPeriods.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "tahun_ajaran";

export const academicPeriodRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const periods = await listAcademicPeriods(c.get("db"));
    return c.json({ periods });
  })

  .post(
    "/",
    requirePermission(MODULE, "tambah"),
    zValidator("json", createAcademicPeriodSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const input = c.req.valid("json");
      const period = await createAcademicPeriod(db, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: period.id,
        after: { yearLabel: period.yearLabel, semester: period.semester },
      });

      return c.json({ period }, 201);
    },
  )

  .put(
    "/:id",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateAcademicPeriodSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id")!;
      const input = c.req.valid("json");
      const period = await updateAcademicPeriod(db, id, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { yearLabel: period.yearLabel, semester: period.semester, startDate: period.startDate, endDate: period.endDate },
      });

      return c.json({ period });
    },
  )

  .post("/:id/activate", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await activateAcademicPeriod(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "approve",
      recordId: id,
      after: { isActive: true },
    });

    return c.json({ ok: true });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteAcademicPeriod(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
