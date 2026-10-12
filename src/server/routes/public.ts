import { Hono } from "hono";

import { getBranding, getSchoolProfile } from "../services/settings.service";
import { verifikasiKodeRaport } from "../services/verifikasiRaport.service";
import { checkRateLimit } from "../lib/rateLimit";
import type { PublicBranding } from "../../shared/schemas/settings.schema";
import type { AppEnv } from "../types";

const VERIFIKASI_RATE_LIMIT = { maxRequests: 20, windowMs: 5 * 60 * 1000 };

export const publicRoutes = new Hono<AppEnv>()
  .get("/branding", async (c) => {
    const db = c.get("db");
    const [branding, schoolProfile] = await Promise.all([getBranding(db), getSchoolProfile(db)]);

    const payload: PublicBranding = {
      schoolName: schoolProfile.nama,
      logoUrl: branding.logo_file_id ? `/api/files/${branding.logo_file_id}` : null,
      defaultPrimaryColor: branding.default_primary_color,
    };
    return c.json(payload);
  })

  .get("/verifikasi/:kode", async (c) => {
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
    if (!checkRateLimit(`verifikasi:${ip}`, VERIFIKASI_RATE_LIMIT.maxRequests, VERIFIKASI_RATE_LIMIT.windowMs)) {
      return c.json({ error: "Terlalu banyak permintaan, coba lagi beberapa menit lagi." }, 429);
    }

    const kode = c.req.param("kode")!;
    const item = await verifikasiKodeRaport(c.get("db"), kode);
    return c.json({ item });
  });
