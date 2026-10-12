import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { simpanNilaiSchema } from "../../shared/schemas/nilai.schema";
import { updateDeskripsiSchema } from "../../shared/schemas/deskripsiNilai.schema";
import {
  resolveAmpuan,
  assertAmpu,
  getInputNilaiKonteks,
  simpanNilai,
  updateDeskripsiCapaian,
} from "../services/nilai.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "input_nilai";

export const nilaiRoutes = new Hono<AppEnv>()
  .get("/pilihan", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const items = await resolveAmpuan(db, user, scope, periodId);
    return c.json({ items });
  })

  .get("/konteks", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.query("rombelId");
    const mapelId = c.req.query("mapelId");
    if (!rombelId || !mapelId) return c.json({ error: "rombelId dan mapelId wajib diisi." }, 400);

    await assertAmpu(db, user, scope, periodId, rombelId, mapelId);
    const item = await getInputNilaiKonteks(db, periodId, rombelId, mapelId);
    return c.json({ item });
  })

  .put("/simpan", requirePermission(MODULE, "tambah"), zValidator("json", simpanNilaiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await assertAmpu(db, actor, scope, periodId, input.rombelId, input.mapelId);
    const result = await simpanNilai(db, input, periodId, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: null,
      after: { rombelId: input.rombelId, mapelId: input.mapelId, jumlahSiswa: result.count },
    });

    return c.json(result);
  })

  .put("/deskripsi", requirePermission(MODULE, "tambah"), zValidator("json", updateDeskripsiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await assertAmpu(db, actor, scope, periodId, input.rombelId, input.mapelId);
    await updateDeskripsiCapaian(db, input, periodId);

    return c.json({ ok: true });
  });
