import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { updatePengaturanPresensiSchema } from "../../shared/schemas/presensiGuru.schema";
import {
  getPengaturanPresensi,
  updatePengaturanPresensi,
  getRekapHarianSemua,
  getRekapBulananGuru,
  getRekapBulananSemuaGuru,
} from "../services/presensiGuru.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { nowWib } from "../lib/waktu";
import type { AppEnv } from "../types";

const MODULE = "rekap_presensi_guru";
const PENGATURAN_MODULE = "pengaturan_presensi";

export const presensiGuruRoutes = new Hono<AppEnv>()
  .get("/pengaturan", requirePermission(PENGATURAN_MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const item = await getPengaturanPresensi(db);
    return c.json({ item });
  })

  .put("/pengaturan", requirePermission(PENGATURAN_MODULE, "ubah"), zValidator("json", updatePengaturanPresensiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");

    await updatePengaturanPresensi(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: PENGATURAN_MODULE,
      action: "update",
      recordId: "pengaturan_presensi",
    });

    return c.json({ ok: true });
  })

  .get("/harian", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const tanggal = c.req.query("tanggal") || nowWib().tanggal;
    const items = await getRekapHarianSemua(db, tanggal);
    return c.json({ items, tanggal });
  })

  .get("/bulanan", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const bulan = c.req.query("bulan");
    if (!bulan) return c.json({ error: "Parameter bulan wajib diisi." }, 400);

    const guruId = scope === "milik_sendiri" ? user.guruId : c.req.query("guru");
    if (!guruId) return c.json({ error: "Parameter guru wajib diisi." }, 400);

    const item = await getRekapBulananGuru(db, guruId, bulan);
    return c.json({ item });
  })

  .get("/bulanan-semua", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const bulan = c.req.query("bulan");
    if (!bulan) return c.json({ error: "Parameter bulan wajib diisi." }, 400);

    const items = await getRekapBulananSemuaGuru(db, bulan);
    return c.json({ items });
  });
