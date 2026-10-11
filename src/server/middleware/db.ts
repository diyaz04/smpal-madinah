import type { Context, Next } from "hono";

import { createDb } from "../db/client";
import { createQueryCounter, wrapD1WithCounter } from "../db/queryCounter";
import type { AppEnv } from "../types";

/**
 * Membuat satu instance Drizzle per request dan menaruhnya di context supaya
 * semua middleware/route memakai koneksi + penghitung query yang sama.
 * Di luar production, binding D1 dibungkus query-counter (lihat db/queryCounter.ts)
 * untuk mendeteksi request yang mendekati batas 50 subrequest/invocation.
 */
export async function dbMiddleware(c: Context<AppEnv>, next: Next) {
  const counter = createQueryCounter();
  c.set("queryCounter", counter);

  const d1 = c.env.ENVIRONMENT === "production" ? c.env.DB : wrapD1WithCounter(c.env.DB, counter);
  c.set("db", createDb(d1));

  await next();

  if (c.env.ENVIRONMENT !== "production") {
    c.header("X-DB-Query-Count", String(counter.count));
  }
}
