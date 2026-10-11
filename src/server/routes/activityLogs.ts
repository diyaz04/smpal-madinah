import { Hono } from "hono";

import {
  listActivityLogs,
  getActivityLogDetail,
  listActivityLogArchives,
  getActivityLogArchive,
} from "../services/activityLogs.service";
import { ACTIVITY_ACTIONS, type ActivityAction } from "../../shared/constants";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "log_aktivitas";

function isActivityAction(value: string): value is ActivityAction {
  return (ACTIVITY_ACTIONS as readonly string[]).includes(value);
}

export const activityLogRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const q = c.req.query();
    const action = q.action && isActivityAction(q.action) ? q.action : undefined;

    const result = await listActivityLogs(c.get("db"), {
      cursor: q.cursor,
      limit: q.limit ? Number(q.limit) : undefined,
      userId: q.userId || undefined,
      moduleKey: q.moduleKey || undefined,
      action,
      dateFrom: q.dateFrom || undefined,
      dateTo: q.dateTo || undefined,
    });
    return c.json(result);
  })

  .get("/archives", requirePermission(MODULE, "lihat"), async (c) => {
    const archives = await listActivityLogArchives(c.get("db"));
    return c.json({ archives });
  })

  .get("/archives/:id/download", requirePermission(MODULE, "export"), async (c) => {
    const db = c.get("db");
    const archive = await getActivityLogArchive(db, c.req.param("id")!);
    if (!archive) return c.notFound();

    const object = await c.env.FILES.get(archive.r2_key);
    if (!object) return c.notFound();

    return new Response(object.body, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${archive.year_month}.json.gz"`,
      },
    });
  })

  .get("/:id", requirePermission(MODULE, "lihat"), async (c) => {
    const detail = await getActivityLogDetail(c.get("db"), c.req.param("id")!);
    if (!detail) return c.json({ error: "Log tidak ditemukan." }, 404);
    return c.json({ log: detail });
  });
