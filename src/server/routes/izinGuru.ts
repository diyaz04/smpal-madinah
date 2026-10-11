import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createIzinGuruSchema, updateIzinGuruSchema } from "../../shared/schemas/izinGuru.schema";
import { listIzinGuru, createIzinGuru, updateIzinGuru } from "../services/izinGuru.service";
import { uploadFile } from "../services/r2.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "izin_guru";

async function extractUploadedFile(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }): Promise<File> {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) throw new Error("NO_FILE");
  return file;
}

export const izinGuruRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const result = await listIzinGuru(db, {
      cursor: c.req.query("cursor") || undefined,
      limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
      guruId: c.req.query("guru") || undefined,
    });
    return c.json(result);
  })

  .post("/lampiran", requirePermission(MODULE, "tambah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }
    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "izin-guru",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });
    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createIzinGuruSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");

    const result = await createIzinGuru(db, input, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.id,
      after: input,
    });

    return c.json(result, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateIzinGuruSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id");
    const input = c.req.valid("json");

    await updateIzinGuru(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: input,
    });

    return c.json({ ok: true });
  });
