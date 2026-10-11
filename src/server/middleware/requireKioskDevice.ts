import type { Context, Next } from "hono";

import { isDeviceActive, touchDeviceActivity } from "../services/kiosk.service";
import type { AppEnv } from "../types";

/**
 * Dipasang setelah requireAuth di route kiosk. Menolak request kecuali
 * sesi ini milik akun KIOSK yang baris kiosk_devices-nya masih berstatus
 * aktif — "cabut perangkat" langsung memutus akses tanpa menunggu expiry.
 */
export async function requireKioskDevice(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");
  const session = c.get("session");
  if (!user || !session || user.accountType !== "KIOSK") {
    return c.json({ error: "Perangkat ini belum terdaftar sebagai kiosk." }, 403);
  }

  const db = c.get("db");
  const active = await isDeviceActive(db, session.id);
  if (!active) {
    return c.json({ error: "Perangkat ini sudah dicabut Admin. Pasangkan ulang." }, 403);
  }

  await touchDeviceActivity(db, session.id);
  await next();
}
