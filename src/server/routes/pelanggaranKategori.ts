import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createPelanggaranKategoriSchema,
  updatePelanggaranKategoriSchema,
  updateUrutanPelanggaranKategoriSchema,
} from "../../shared/schemas/pelanggaranKategori.schema";
import {
  listPelanggaranKategori,
  createPelanggaranKategori,
  updatePelanggaranKategori,
  deletePelanggaranKategori,
  updateUrutanPelanggaranKategori,
} from "../services/pelanggaranKategori.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "master_pelanggaran";

export const pelanggaranKategoriRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listPelanggaranKategori(c.get("db"));
    return c.json({ items });
  })

  .post(
    "/",
    requirePermission(MODULE, "tambah"),
    zValidator("json", createPelanggaranKategoriSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const input = c.req.valid("json");
      const item = await createPelanggaranKategori(db, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: item.id,
        after: { nama: item.nama, warna: item.warna },
      });

      return c.json({ item }, 201);
    },
  )

  .put(
    "/urutan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateUrutanPelanggaranKategoriSchema),
    async (c) => {
      const db = c.get("db");
      const { items } = c.req.valid("json");
      await updateUrutanPelanggaranKategori(db, items);
      return c.json({ ok: true });
    },
  )

  .put(
    "/:id",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updatePelanggaranKategoriSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id");
      const input = c.req.valid("json");
      const item = await updatePelanggaranKategori(db, id, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { nama: item.nama, warna: item.warna },
      });

      return c.json({ item });
    },
  )

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deletePelanggaranKategori(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
