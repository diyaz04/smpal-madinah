import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createKalenderEntriSchema,
  updateKalenderEntriSchema,
  updatePengaturanAkademikSchema,
} from "../../shared/schemas/kalenderAkademik.schema";
import {
  listKalenderEntri,
  createKalenderEntri,
  updateKalenderEntri,
  deleteKalenderEntri,
  getPengaturanAkademik,
  updatePengaturanAkademik,
} from "../services/kalender.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "kalender_akademik";

export const kalenderAkademikRoutes = new Hono<AppEnv>()
  .get("/pengaturan", requirePermission(MODULE, "lihat"), async (c) => {
    const item = await getPengaturanAkademik(c.get("db"));
    return c.json({ item });
  })

  .put(
    "/pengaturan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updatePengaturanAkademikSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const input = c.req.valid("json");
      await updatePengaturanAkademik(db, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: "pengaturan",
        after: { ...input },
      });

      return c.json({ ok: true });
    },
  )

  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await listKalenderEntri(c.get("db"), periodId);
    return c.json({ items });
  })

  .post(
    "/",
    requirePermission(MODULE, "tambah"),
    zValidator("json", createKalenderEntriSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const periodId = await resolvePeriodId(c);
      const input = c.req.valid("json");
      const item = await createKalenderEntri(db, periodId, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: item.id,
        after: { nama: item.nama, tanggalMulai: item.tanggalMulai, tanggalSelesai: item.tanggalSelesai },
      });

      return c.json({ item }, 201);
    },
  )

  .put(
    "/:id",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateKalenderEntriSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id")!;
      const input = c.req.valid("json");
      const item = await updateKalenderEntri(db, id, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { nama: item.nama, tanggalMulai: item.tanggalMulai, tanggalSelesai: item.tanggalSelesai },
      });

      return c.json({ item });
    },
  )

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteKalenderEntri(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
