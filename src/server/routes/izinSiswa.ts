import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createIzinSiswaSchema, updateIzinSiswaSchema } from "../../shared/schemas/izinSiswa.schema";
import { listIzinSiswa, createIzinSiswa, updateIzinSiswa } from "../services/izinSiswa.service";
import { uploadFile } from "../services/r2.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolveScopedRombelIds } from "../services/scope.service";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "izin_siswa";

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

export const izinSiswaRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);

    const result = await listIzinSiswa(
      db,
      {
        cursor: c.req.query("cursor") || undefined,
        limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
        siswaId: c.req.query("siswa") || undefined,
        rombelId: c.req.query("rombel") || undefined,
      },
      periodId,
      scopedRombelIds,
    );
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
      prefix: "izin-siswa",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createIzinSiswaSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");

    const result = await createIzinSiswa(db, input, actor.id);

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

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateIzinSiswaSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id");
    const input = c.req.valid("json");

    await updateIzinSiswa(db, id, input);

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
