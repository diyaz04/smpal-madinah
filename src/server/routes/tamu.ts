import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { updateStatusKunjunganSchema } from "../../shared/schemas/tamu.schema";
import { listTamu, updateStatusKunjungan } from "../services/tamu.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "pengelolaan_buku_tamu";

export const tamuRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const result = await listTamu(db, {
      cursor: c.req.query("cursor") || undefined,
      limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
      tanggalDari: c.req.query("dari") || undefined,
      tanggalSampai: c.req.query("sampai") || undefined,
      jenis: c.req.query("jenis") || undefined,
      search: c.req.query("search") || undefined,
    });
    return c.json(result);
  })

  .put("/:id/status", requirePermission(MODULE, "ubah"), zValidator("json", updateStatusKunjunganSchema), async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    if (!id) return c.json({ error: "Parameter tidak lengkap." }, 400);
    const input = c.req.valid("json");

    await updateStatusKunjungan(db, id, input.statusKunjungan);
    return c.json({ ok: true });
  });
