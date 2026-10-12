import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createSanksiAmbangSchema, updateSanksiAmbangSchema } from "../../shared/schemas/sanksiAmbang.schema";
import {
  listSanksiAmbang,
  createSanksiAmbang,
  updateSanksiAmbang,
  deleteSanksiAmbang,
} from "../services/sanksiAmbang.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "master_pelanggaran";

export const sanksiAmbangRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listSanksiAmbang(c.get("db"));
    return c.json({ items });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createSanksiAmbangSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const item = await createSanksiAmbang(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: item.id,
      after: { nama: item.nama, poinMinimal: item.poinMinimal },
    });

    return c.json({ item }, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateSanksiAmbangSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const item = await updateSanksiAmbang(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { nama: item.nama, poinMinimal: item.poinMinimal },
    });

    return c.json({ item });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteSanksiAmbang(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
