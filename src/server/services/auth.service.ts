import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { users } from "../db/schema";
import { verifyPassword } from "../lib/pbkdf2";

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 menit

export type LoginAttemptResult =
  | { outcome: "success"; user: typeof users.$inferSelect }
  | { outcome: "invalid_credentials" }
  | { outcome: "inactive" }
  | { outcome: "locked"; lockedUntil: string; justLocked: boolean };

/**
 * Verifikasi username+password, menegakkan lockout 5x percobaan gagal selama
 * 15 menit. Setiap pemanggilan menulis paling banyak satu UPDATE ke `users`.
 */
export async function attemptLogin(
  db: Database,
  username: string,
  password: string,
): Promise<LoginAttemptResult> {
  const row = await db.query.users.findFirst({ where: eq(users.username, username) });

  if (!row || row.deleted_at) {
    return { outcome: "invalid_credentials" };
  }
  if (row.status !== "ACTIVE") {
    return { outcome: "inactive" };
  }

  const now = Date.now();
  if (row.locked_until && new Date(row.locked_until).getTime() > now) {
    return { outcome: "locked", lockedUntil: row.locked_until, justLocked: false };
  }

  const valid = await verifyPassword(password, {
    hash: row.password_hash,
    salt: row.password_salt,
    iterations: row.password_iterations,
  });

  const nowIso = new Date(now).toISOString();

  if (!valid) {
    const attempts = row.failed_login_attempts + 1;
    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(now + LOCKOUT_DURATION_MS).toISOString();
      await db
        .update(users)
        .set({ failed_login_attempts: 0, locked_until: lockedUntil, updated_at: nowIso })
        .where(eq(users.id, row.id));
      return { outcome: "locked", lockedUntil, justLocked: true };
    }
    await db
      .update(users)
      .set({ failed_login_attempts: attempts, updated_at: nowIso })
      .where(eq(users.id, row.id));
    return { outcome: "invalid_credentials" };
  }

  await db
    .update(users)
    .set({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: nowIso,
      updated_at: nowIso,
    })
    .where(eq(users.id, row.id));

  return { outcome: "success", user: row };
}
