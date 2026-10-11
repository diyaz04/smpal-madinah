import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

import type { Database } from "../db/client";
import { sessions, users } from "../db/schema";
import type { AppEnv, AuthUser } from "../types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
// Hanya tulis ulang expires_at/last_active_at kalau sudah lebih dari batas ini
// sejak terakhir diperpanjang — supaya tidak menulis ke D1 di setiap request.
const EXTEND_THRESHOLD_MS = 60 * 60 * 1000; // 1 jam

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSession(
  db: Database,
  userId: string,
  meta: { ip: string | null; userAgent: string | null },
  ttlMs: number = SESSION_TTL_MS,
): Promise<{ token: string; expiresAt: string }> {
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  await db.insert(sessions).values({
    id: token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    last_active_at: now.toISOString(),
    ip: meta.ip,
    user_agent: meta.userAgent,
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    photoFileId: row.photo_file_id,
    accountType: row.account_type,
    status: row.status,
    primaryColor: row.primary_color,
    mustChangePassword: row.must_change_password,
    guruId: row.guru_id,
  };
}

/**
 * Validasi token sesi: cek ada, belum kedaluwarsa, user masih aktif & belum
 * dihapus. Memperpanjang masa berlaku kalau sudah lewat EXTEND_THRESHOLD_MS
 * sejak terakhir aktif (sliding expiry, hemat tulis D1).
 */
export async function resolveSession(
  db: Database,
  token: string,
): Promise<{ session: { id: string; user_id: string; expires_at: string }; user: AuthUser } | null> {
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .where(eq(sessions.id, token))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const now = Date.now();
  if (new Date(row.session.expires_at).getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, token));
    return null;
  }
  if (row.user.status !== "ACTIVE" || row.user.deleted_at) {
    return null;
  }

  const lastActive = new Date(row.session.last_active_at).getTime();
  if (now - lastActive > EXTEND_THRESHOLD_MS) {
    // Perpanjang pakai durasi aslinya (created_at -> expires_at) — supaya sesi
    // kiosk berumur panjang tidak ikut terpotong jadi SESSION_TTL_MS staff biasa.
    const originalTtlMs = new Date(row.session.expires_at).getTime() - new Date(row.session.created_at).getTime();
    const newExpiresAt = new Date(now + Math.max(originalTtlMs, SESSION_TTL_MS)).toISOString();
    const nowIso = new Date(now).toISOString();
    await db
      .update(sessions)
      .set({ last_active_at: nowIso, expires_at: newExpiresAt })
      .where(eq(sessions.id, token));
    row.session.last_active_at = nowIso;
    row.session.expires_at = newExpiresAt;
  }

  return {
    session: {
      id: row.session.id,
      user_id: row.session.user_id,
      expires_at: row.session.expires_at,
    },
    user: toAuthUser(row.user),
  };
}

export async function revokeSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export async function revokeAllSessionsForUser(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.user_id, userId));
}

export function setSessionCookie(c: Context<AppEnv>, token: string, maxAgeMs: number = SESSION_TTL_MS): void {
  setCookie(c, c.env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Secure wajib di production (HTTPS). Di dev lokal (http://localhost)
    // dimatikan supaya cookie tetap terkirim — lihat DECISIONS.md.
    secure: c.env.ENVIRONMENT === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: maxAgeMs / 1000,
  });
}

/** TTL sesi perangkat kiosk — jauh lebih panjang dari sesi staff biasa (tablet dipasang tetap). */
export const KIOSK_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 tahun

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, c.env.SESSION_COOKIE_NAME, { path: "/" });
}

export function getSessionCookie(c: Context<AppEnv>): string | undefined {
  return getCookie(c, c.env.SESSION_COOKIE_NAME);
}
