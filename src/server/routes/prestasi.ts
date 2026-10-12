import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createPrestasiSchema, updatePrestasiSchema } from "../../shared/schemas/prestasi.schema";
import { listPrestasi, createPrestasi, updatePrestasi, deletePrestasi } from "../services/prestasi.service";
import { uploadFile } from "../services/r2.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { PrestasiBidang, PrestasiTingkat } from "../../shared/constants";
import type { AppEnv } from "../types";

const MODULE = "prestasi";

export const prestasiRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const result = await listPrestasi(db, {
      cursor: c.req.query("cursor") || undefined,
      limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
      siswaId: c.req.query("siswa") || undefined,
      periodId: c.req.query("periodId") || undefined,
      tingkat: (c.req.query("tingkat") as PrestasiTingkat | undefined) || undefined,
      bidang: (c.req.query("bidang") as PrestasiBidang | undefined) || undefined,
      rombelId: c.req.query("rombel") || undefined,
    });
    return c.json(result);
  })

  .post("/sertifikat", requirePermission(MODULE, "tambah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "prestasi",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createPrestasiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const periodId = await resolvePeriodId(c);

    const result = await createPrestasi(db, input, periodId, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: null,
      after: { namaKegiatan: input.namaKegiatan, jumlahSiswa: result.count, tingkat: input.tingkat },
    });

    return c.json(result, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updatePrestasiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");

    await updatePrestasi(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { namaKegiatan: input.namaKegiatan, tingkat: input.tingkat },
    });

    return c.json({ ok: true });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deletePrestasi(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
