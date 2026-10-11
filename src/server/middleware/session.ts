import type { Context, Next } from "hono";

import { getSessionCookie, resolveSession } from "../services/session.service";
import type { AppEnv } from "../types";

/**
 * Membaca cookie sesi (kalau ada) dan menaruh session+user di context.
 * Dipasang global supaya endpoint publik (mis. /public/branding) tetap bisa
 * tahu apakah request datang dari user yang login, tanpa mewajibkan sesi.
 */
export async function attachSession(c: Context<AppEnv>, next: Next) {
  const token = getSessionCookie(c);
  if (!token) {
    c.set("session", null);
    c.set("user", null);
    await next();
    return;
  }

  const db = c.get("db");
  const resolved = await resolveSession(db, token);
  if (!resolved) {
    c.set("session", null);
    c.set("user", null);
    await next();
    return;
  }

  c.set("session", resolved.session);
  c.set("user", resolved.user);
  await next();
}

/** Tolak request tanpa sesi valid. Pasang setelah attachSession. */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  if (!c.get("user")) {
    return c.json({ error: "Sesi tidak valid atau sudah berakhir. Silakan login kembali." }, 401);
  }
  await next();
}
