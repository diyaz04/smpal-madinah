import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { setujuiBiometrikSchema, tambahDescriptorSchema } from "../../shared/schemas/wajahGuru.schema";
import {
  setujuiBiometrik,
  tarikPersetujuan,
  tambahDescriptorManual,
  hapusDescriptor,
  getWajahStatus,
} from "../services/wajahGuru.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { uploadFile } from "../services/r2.service";
import type { AppEnv } from "../types";

const MODULE = "data_guru";

async function extractUploadedFile(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }): Promise<File> {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) throw new Error("NO_FILE");
  return file;
}

export const guruWajahRoutes = new Hono<AppEnv>()
  .post("/thumbnail", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;

    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "wajah",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .get("/:guruId", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const guruId = c.req.param("guruId");
    if (!guruId) return c.json({ error: "Parameter tidak lengkap." }, 400);

    const item = await getWajahStatus(db, guruId);
    return c.json({ item });
  })

  .post("/:guruId/setuju", requirePermission(MODULE, "ubah"), zValidator("json", setujuiBiometrikSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const guruId = c.req.param("guruId");
    if (!guruId) return c.json({ error: "Parameter tidak lengkap." }, 400);
    const input = c.req.valid("json");

    await setujuiBiometrik(db, guruId, input.versi);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: guruId,
      after: { persetujuanBiometrik: true, versi: input.versi },
    });

    return c.json({ ok: true });
  })

  .post("/:guruId/tarik", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const guruId = c.req.param("guruId");
    if (!guruId) return c.json({ error: "Parameter tidak lengkap." }, 400);

    await tarikPersetujuan(db, c.env.FILES, guruId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: guruId,
      after: { persetujuanBiometrik: false, ditarik: true },
    });

    return c.json({ ok: true });
  })

  .post("/:guruId/descriptor", requirePermission(MODULE, "ubah"), zValidator("json", tambahDescriptorSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const guruId = c.req.param("guruId");
    if (!guruId) return c.json({ error: "Parameter tidak lengkap." }, 400);
    const input = c.req.valid("json");

    await tambahDescriptorManual(db, guruId, input.descriptor, input.fotoFileId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: guruId,
      after: { descriptorDitambah: true },
    });

    return c.json({ ok: true }, 201);
  })

  .post("/descriptor/:descriptorId/hapus", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const descriptorId = c.req.param("descriptorId");
    if (!descriptorId) return c.json({ error: "Parameter tidak lengkap." }, 400);

    await hapusDescriptor(db, c.env.FILES, descriptorId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: descriptorId,
      after: { descriptorDihapus: true },
    });

    return c.json({ ok: true });
  });
