import { Hono } from "hono";

import {
  listNotifikasi,
  markNotifikasiDibaca,
  markSemuaNotifikasiDibaca,
} from "../services/notifikasi.service";
import { requireAuth } from "../middleware/session";
import type { AppEnv } from "../types";

export const notifikasiRoutes = new Hono<AppEnv>()
  .get("/", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const cursor = c.req.query("cursor") || null;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const result = await listNotifikasi(db, user.id, cursor, limit);
    return c.json(result);
  })

  .put("/:id/baca", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const id = c.req.param("id")!;
    await markNotifikasiDibaca(db, user.id, id);
    return c.json({ ok: true });
  })

  .put("/baca-semua", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    await markSemuaNotifikasiDibaca(db, user.id);
    return c.json({ ok: true });
  });
