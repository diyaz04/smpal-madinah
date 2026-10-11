import { Hono } from "hono";

import { getBranding, getSchoolProfile } from "../services/settings.service";
import type { PublicBranding } from "../../shared/schemas/settings.schema";
import type { AppEnv } from "../types";

export const publicRoutes = new Hono<AppEnv>().get("/branding", async (c) => {
  const db = c.get("db");
  const [branding, schoolProfile] = await Promise.all([getBranding(db), getSchoolProfile(db)]);

  const payload: PublicBranding = {
    schoolName: schoolProfile.nama,
    logoUrl: branding.logo_file_id ? `/api/files/${branding.logo_file_id}` : null,
    defaultPrimaryColor: branding.default_primary_color,
  };
  return c.json(payload);
});
