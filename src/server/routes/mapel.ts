import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createMapelSchema, updateMapelSchema, updateUrutanMapelSchema } from "../../shared/schemas/mapel.schema";
import {
  listMapel,
  createMapel,
  updateMapel,
  deleteMapel,
  updateUrutanMapel,
  getRaportPreview,
} from "../services/mapel.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "data_mapel";

export const mapelRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listMapel(c.get("db"));
    return c.json({ items });
  })

  .get("/raport-preview", requirePermission(MODULE, "lihat"), async (c) => {
    const groups = await getRaportPreview(c.get("db"));
    return c.json({ groups });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createMapelSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const item = await createMapel(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: item.id,
      after: { nama: item.nama, kodeJadwal: item.kodeJadwal, jenis: item.jenis },
    });

    return c.json({ item }, 201);
  })

  .put(
    "/urutan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateUrutanMapelSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const { items } = c.req.valid("json");
      await updateUrutanMapel(db, items);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: "urutan",
        after: { urutanDiperbarui: items.length },
      });

      return c.json({ ok: true });
    },
  )

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateMapelSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");
    const item = await updateMapel(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { nama: item.nama, kodeJadwal: item.kodeJadwal, jenis: item.jenis },
    });

    return c.json({ item });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteMapel(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
