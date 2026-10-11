import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { files } from "../db/schema";
import type { AppEnv } from "../types";

const PUBLIC_PREFIXES = new Set(["logo", "kop"]);

export const fileRoutes = new Hono<AppEnv>().get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id")!;

  const row = await db.query.files.findFirst({ where: eq(files.id, id) });
  if (!row || row.deleted_at) return c.notFound();

  if (!PUBLIC_PREFIXES.has(row.prefix) && !c.get("user")) {
    return c.json({ error: "Perlu login untuk mengakses file ini." }, 401);
  }

  const object = await c.env.FILES.get(row.r2_key);
  if (!object) return c.notFound();

  return new Response(object.body, {
    headers: {
      "Content-Type": row.mime_type,
      "Cache-Control": "public, max-age=3600",
    },
  });
});
