import { Hono } from "hono";

import { getSystemUsage } from "../services/systemUsage.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

export const systemUsageRoutes = new Hono<AppEnv>().get(
  "/",
  requirePermission("pemakaian_sistem", "lihat"),
  async (c) => {
    const usage = await getSystemUsage(c.get("db"));
    return c.json(usage);
  },
);
