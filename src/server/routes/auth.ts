import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";

import { loginSchema, changePasswordSchema } from "../../shared/schemas/auth.schema";
import { users } from "../db/schema";
import { attemptLogin } from "../services/auth.service";
import {
  createSession,
  revokeSession,
  setSessionCookie,
  clearSessionCookie,
  toAuthUser,
} from "../services/session.service";
import { logActivity } from "../services/activityLog.service";
import { getEffectivePermissions } from "../services/permission.service";
import { getActivePeriod, getBranding } from "../services/settings.service";
import { countUnreadNotifikasi } from "../services/notifikasi.service";
import { hashPassword, verifyPassword, DEFAULT_PBKDF2_ITERATIONS } from "../lib/pbkdf2";
import { requireAuth } from "../middleware/session";
import type { AppEnv } from "../types";

function requestMeta(c: { req: { header: (k: string) => string | undefined } }) {
  return {
    ip: c.req.header("CF-Connecting-IP") ?? null,
    userAgent: c.req.header("User-Agent") ?? null,
  };
}

export const authRoutes = new Hono<AppEnv>()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { username, password } = c.req.valid("json");
    const db = c.get("db");
    const { ip, userAgent } = requestMeta(c);

    const result = await attemptLogin(db, username, password);

    if (result.outcome === "invalid_credentials") {
      await logActivity(db, {
        userId: null,
        usernameSnapshot: username,
        moduleKey: "auth",
        action: "login_failed",
        ip,
        userAgent,
      });
      return c.json({ error: "Username atau password salah." }, 401);
    }

    if (result.outcome === "inactive") {
      await logActivity(db, {
        userId: null,
        usernameSnapshot: username,
        moduleKey: "auth",
        action: "login_failed",
        ip,
        userAgent,
      });
      return c.json({ error: "Akun tidak aktif. Hubungi Admin sekolah." }, 403);
    }

    if (result.outcome === "locked") {
      await logActivity(db, {
        userId: null,
        usernameSnapshot: username,
        moduleKey: "auth",
        action: result.justLocked ? "lockout" : "login_failed",
        ip,
        userAgent,
      });
      const minutes = Math.max(
        1,
        Math.ceil((new Date(result.lockedUntil).getTime() - Date.now()) / 60000),
      );
      return c.json(
        {
          error: `Akun terkunci karena 5 kali percobaan gagal. Coba lagi dalam ${minutes} menit.`,
        },
        423,
      );
    }

    const { token } = await createSession(db, result.user.id, { ip, userAgent });
    setSessionCookie(c, token);
    await logActivity(db, {
      userId: result.user.id,
      usernameSnapshot: result.user.username,
      moduleKey: "auth",
      action: "login_success",
      ip,
      userAgent,
    });

    return c.json({ user: toAuthUser(result.user) });
  })

  .post("/logout", requireAuth, async (c) => {
    const db = c.get("db");
    const session = c.get("session")!;
    const user = c.get("user")!;
    const { ip, userAgent } = requestMeta(c);

    await revokeSession(db, session.id);
    clearSessionCookie(c);
    await logActivity(db, {
      userId: user.id,
      usernameSnapshot: user.username,
      moduleKey: "auth",
      action: "logout",
      ip,
      userAgent,
    });

    return c.json({ ok: true });
  })

  .get("/me", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const [permissions, activePeriod, branding, unreadNotifikasi] = await Promise.all([
      getEffectivePermissions(db, user.id),
      getActivePeriod(db),
      getBranding(db),
      countUnreadNotifikasi(db, user.id),
    ]);
    return c.json({
      user,
      permissions,
      activePeriod,
      defaultPrimaryColor: branding.default_primary_color,
      unreadNotifikasi,
    });
  })

  .put("/change-password", requireAuth, zValidator("json", changePasswordSchema), async (c) => {
    const { oldPassword, newPassword } = c.req.valid("json");
    const db = c.get("db");
    const authUser = c.get("user")!;
    const { ip, userAgent } = requestMeta(c);

    const row = await db.query.users.findFirst({ where: eq(users.id, authUser.id) });
    if (!row) return c.json({ error: "User tidak ditemukan." }, 404);

    const valid = await verifyPassword(oldPassword, {
      hash: row.password_hash,
      salt: row.password_salt,
      iterations: row.password_iterations,
    });
    if (!valid) return c.json({ error: "Password lama salah." }, 400);

    const iterations = Number(c.env.PASSWORD_PBKDF2_ITERATIONS) || DEFAULT_PBKDF2_ITERATIONS;
    const newHash = await hashPassword(newPassword, iterations);
    const nowIso = new Date().toISOString();

    await db
      .update(users)
      .set({
        password_hash: newHash.hash,
        password_salt: newHash.salt,
        password_iterations: newHash.iterations,
        must_change_password: false,
        updated_at: nowIso,
      })
      .where(eq(users.id, authUser.id));

    await logActivity(db, {
      userId: authUser.id,
      usernameSnapshot: authUser.username,
      moduleKey: "auth",
      action: "password_change",
      recordId: authUser.id,
      ip,
      userAgent,
    });

    return c.json({ ok: true });
  });
