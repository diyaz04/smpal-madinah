import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { updateSettingsSchema } from "../../shared/schemas/settings.schema";
import {
  getSchoolProfile,
  getBranding,
  updateSchoolSettings,
  setBrandingFile,
} from "../services/settings.service";
import { uploadFile, deleteFile } from "../services/r2.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "pengaturan_sekolah";

async function extractUploadedFile(c: {
  req: { parseBody: () => Promise<Record<string, unknown>> };
}): Promise<File> {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) {
    throw new Error("NO_FILE");
  }
  return file;
}

export const settingsRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const [schoolProfile, branding] = await Promise.all([getSchoolProfile(db), getBranding(db)]);
    return c.json({
      schoolProfile,
      defaultPrimaryColor: branding.default_primary_color,
      logoUrl: branding.logo_file_id ? `/api/files/${branding.logo_file_id}` : null,
      kopUrl: branding.kop_file_id ? `/api/files/${branding.kop_file_id}` : null,
    });
  })

  .put("/", requirePermission(MODULE, "ubah"), zValidator("json", updateSettingsSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");

    const before = await getSchoolProfile(db);
    await updateSchoolSettings(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: "school_profile",
      before,
      after: input.schoolProfile,
    });

    return c.json({ ok: true });
  })

  .post("/logo", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;

    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "logo",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    const previousFileId = await setBrandingFile(db, "logo_file_id", uploaded.id);
    if (previousFileId) await deleteFile(db, c.env.FILES, previousFileId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: "logo",
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .post("/letterhead", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;

    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "kop",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    const previousFileId = await setBrandingFile(db, "kop_file_id", uploaded.id);
    if (previousFileId) await deleteFile(db, c.env.FILES, previousFileId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: "kop",
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  });
