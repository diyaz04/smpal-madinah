import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { assignPenggantiSchema, hapusPenggantiSchema } from "../../shared/schemas/penggantiKbm.schema";
import { getPapanKbm, assignPengganti, hapusPengganti } from "../services/penggantiKbm.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import { nowWib } from "../lib/waktu";
import type { AppEnv } from "../types";

const MODULE = "papan_kbm";

export const papanKbmRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const periodId = await resolvePeriodId(c);
    const tanggal = c.req.query("tanggal") || nowWib().tanggal;
    const items = await getPapanKbm(db, periodId, tanggal);
    return c.json({ items, tanggal });
  })

  .post("/assign", requirePermission(MODULE, "ubah"), zValidator("json", assignPenggantiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await assignPengganti(db, periodId, input, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: `${input.rombelId}|${input.tanggal}|${input.slotMulai}`,
      after: input,
    });

    return c.json({ ok: true });
  })

  .post("/hapus", requirePermission(MODULE, "ubah"), zValidator("json", hapusPenggantiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await hapusPengganti(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: `${input.rombelId}|${input.tanggal}|${input.slotMulai}`,
      after: { dihapus: true },
    });

    return c.json({ ok: true });
  });
