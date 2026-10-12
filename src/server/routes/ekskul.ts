import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createEkskulSchema, updateEkskulSchema } from "../../shared/schemas/ekskul.schema";
import { listEkskul, createEkskul, updateEkskul, deleteEkskul } from "../services/ekskul.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "pengaturan_raport";

export const ekskulRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listEkskul(c.get("db"));
    return c.json({ items });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createEkskulSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const result = await createEkskul(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.id,
      after: { nama: input.nama },
    });

    return c.json(result, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateEkskulSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");
    await updateEkskul(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { nama: input.nama },
    });

    return c.json({ ok: true });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteEkskul(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
