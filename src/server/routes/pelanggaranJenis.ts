import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createPelanggaranJenisSchema,
  updatePelanggaranJenisSchema,
} from "../../shared/schemas/pelanggaranJenis.schema";
import {
  listPelanggaranJenis,
  createPelanggaranJenis,
  updatePelanggaranJenis,
  deletePelanggaranJenis,
} from "../services/pelanggaranJenis.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "master_pelanggaran";

export const pelanggaranJenisRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listPelanggaranJenis(c.get("db"));
    return c.json({ items });
  })

  .post(
    "/",
    requirePermission(MODULE, "tambah"),
    zValidator("json", createPelanggaranJenisSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const input = c.req.valid("json");
      const result = await createPelanggaranJenis(db, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: result.id,
        after: { nama: input.nama, poin: input.poin },
      });

      return c.json(result, 201);
    },
  )

  .put(
    "/:id",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updatePelanggaranJenisSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id");
      const input = c.req.valid("json");
      await updatePelanggaranJenis(db, id, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { nama: input.nama, poin: input.poin },
      });

      return c.json({ ok: true });
    },
  )

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deletePelanggaranJenis(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
