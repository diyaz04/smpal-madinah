import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createTujuanPembelajaranSchema,
  updateTujuanPembelajaranSchema,
  updateUrutanTujuanPembelajaranSchema,
  salinTujuanPembelajaranSchema,
} from "../../shared/schemas/tujuanPembelajaran.schema";
import {
  listTujuanPembelajaran,
  createTujuanPembelajaran,
  updateTujuanPembelajaran,
  deleteTujuanPembelajaran,
  updateUrutanTujuanPembelajaran,
  salinTujuanPembelajaran,
} from "../services/tujuanPembelajaran.service";
import { assertAmpuMapelTingkat, resolveAmpuan } from "../services/nilai.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { Tingkat } from "../../shared/constants";
import type { AppEnv } from "../types";

const MODULE = "tujuan_pembelajaran";

export const tujuanPembelajaranRoutes = new Hono<AppEnv>()
  .get("/pilihan", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);

    const ampuan = await resolveAmpuan(db, user, scope, periodId);
    const unik = new Map<string, { mapelId: string; mapelNama: string; tingkat: string }>();
    for (const a of ampuan) unik.set(`${a.mapelId}|${a.tingkat}`, { mapelId: a.mapelId, mapelNama: a.mapelNama, tingkat: a.tingkat });

    return c.json({ items: [...unik.values()] });
  })

  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const mapelId = c.req.query("mapelId");
    const tingkat = c.req.query("tingkat") as Tingkat | undefined;
    if (!mapelId || !tingkat) return c.json({ error: "mapelId dan tingkat wajib diisi." }, 400);

    await assertAmpuMapelTingkat(db, user, scope, periodId, mapelId, tingkat);
    const items = await listTujuanPembelajaran(db, periodId, mapelId, tingkat);
    return c.json({ items });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createTujuanPembelajaranSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await assertAmpuMapelTingkat(db, user, scope, periodId, input.mapelId, input.tingkat);
    const result = await createTujuanPembelajaran(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.id,
      after: { kode: input.kode, deskripsi: input.deskripsi },
    });

    return c.json(result, 201);
  })

  .post("/salin", requirePermission(MODULE, "tambah"), zValidator("json", salinTujuanPembelajaranSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await assertAmpuMapelTingkat(db, user, scope, periodId, input.mapelId, input.tingkat);
    const result = await salinTujuanPembelajaran(db, periodId, input);
    return c.json(result, 201);
  })

  .put(
    "/urutan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateUrutanTujuanPembelajaranSchema),
    async (c) => {
      const db = c.get("db");
      const { items } = c.req.valid("json");
      await updateUrutanTujuanPembelajaran(db, items);
      return c.json({ ok: true });
    },
  )

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateTujuanPembelajaranSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");

    await updateTujuanPembelajaran(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { kode: input.kode, deskripsi: input.deskripsi },
    });

    return c.json({ ok: true });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteTujuanPembelajaran(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
