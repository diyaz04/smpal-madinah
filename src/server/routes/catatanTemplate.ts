import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createCatatanTemplateSchema, updateCatatanTemplateSchema } from "../../shared/schemas/catatanTemplate.schema";
import {
  listCatatanTemplate,
  createCatatanTemplate,
  updateCatatanTemplate,
  deleteCatatanTemplate,
} from "../services/catatanTemplate.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "pengaturan_raport";

export const catatanTemplateRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listCatatanTemplate(c.get("db"));
    return c.json({ items });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createCatatanTemplateSchema), async (c) => {
    const result = await createCatatanTemplate(c.get("db"), c.req.valid("json"));
    return c.json(result, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateCatatanTemplateSchema), async (c) => {
    await updateCatatanTemplate(c.get("db"), c.req.param("id")!, c.req.valid("json"));
    return c.json({ ok: true });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    await deleteCatatanTemplate(c.get("db"), c.req.param("id")!);
    return c.json({ ok: true });
  });
