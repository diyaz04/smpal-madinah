import { Hono } from "hono";

import { MODULES } from "../../shared/modules";
import { requireAuth } from "../middleware/session";
import type { AppEnv } from "../types";

export const moduleRoutes = new Hono<AppEnv>().get("/", requireAuth, async (c) => {
  return c.json({ modules: MODULES });
});
