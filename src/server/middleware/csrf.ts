import type { Context, Next } from "hono";

import type { AppEnv } from "../types";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Proteksi CSRF untuk request yang mengubah data: cookie sesi sudah
 * SameSite=Lax (menahan sebagian besar kasus), ditambah pengecekan header
 * Origin harus sama dengan origin request itu sendiri.
 */
export async function csrfProtection(c: Context<AppEnv>, next: Next) {
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const origin = c.req.header("Origin");
  const requestOrigin = new URL(c.req.url).origin;

  if (!origin || origin !== requestOrigin) {
    return c.json({ error: "Permintaan ditolak (validasi origin gagal)." }, 403);
  }

  await next();
}
