import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";

import { themeSchema, updateProfileSchema } from "../../shared/schemas/profile.schema";
import { gantiPinSchema } from "../../shared/schemas/presensiGuru.schema";
import { users } from "../db/schema";
import { logActivity } from "../services/activityLog.service";
import { uploadFile, deleteFile } from "../services/r2.service";
import { toAuthUser } from "../services/session.service";
import { gantiPinSendiri } from "../services/presensiGuru.service";
import { nullIfEmpty } from "../lib/text";
import { requireAuth } from "../middleware/session";
import type { AppEnv } from "../types";

export const profileRoutes = new Hono<AppEnv>()
  .get("/", requireAuth, async (c) => {
    return c.json({ user: c.get("user") });
  })

  .put("/", requireAuth, zValidator("json", updateProfileSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const input = c.req.valid("json");

    await db
      .update(users)
      .set({
        full_name: input.fullName,
        email: nullIfEmpty(input.email),
        phone: nullIfEmpty(input.phone),
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    await logActivity(db, {
      userId: user.id,
      usernameSnapshot: user.username,
      moduleKey: "profil_saya",
      action: "update",
      recordId: user.id,
      before: { full_name: user.fullName, email: user.email, phone: user.phone },
      after: { full_name: input.fullName, email: nullIfEmpty(input.email), phone: nullIfEmpty(input.phone) },
    });

    const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    return c.json({ user: toAuthUser(row!) });
  })

  .post("/photo", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "profil",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: user.id,
    });

    const previousFileId = user.photoFileId;
    await db
      .update(users)
      .set({ photo_file_id: uploaded.id, updated_at: new Date().toISOString() })
      .where(eq(users.id, user.id));
    if (previousFileId) await deleteFile(db, c.env.FILES, previousFileId);

    await logActivity(db, {
      userId: user.id,
      usernameSnapshot: user.username,
      moduleKey: "profil_saya",
      action: "update",
      recordId: user.id,
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .put("/theme", requireAuth, zValidator("json", themeSchema), async (c) => {
    const { primaryColor } = c.req.valid("json");
    const db = c.get("db");
    const user = c.get("user")!;

    await db
      .update(users)
      .set({ primary_color: primaryColor, updated_at: new Date().toISOString() })
      .where(eq(users.id, user.id));

    await logActivity(db, {
      userId: user.id,
      usernameSnapshot: user.username,
      moduleKey: "profil_saya",
      action: "update",
      recordId: user.id,
      before: { primary_color: user.primaryColor },
      after: { primary_color: primaryColor },
    });

    return c.json({ ok: true, primaryColor });
  })

  .put("/pin", requireAuth, zValidator("json", gantiPinSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    if (!user.guruId) return c.json({ error: "Akun ini tidak terhubung ke data guru." }, 400);
    const input = c.req.valid("json");

    const result = await gantiPinSendiri(db, user.guruId, input.pinLama, input.pinBaru);
    if (!result.ok) return c.json({ error: result.message ?? "Gagal mengganti PIN." }, 400);

    return c.json({ ok: true });
  });
