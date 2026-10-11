import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";

import { koreksiAbsensiHarianSchema } from "../../shared/schemas/rekapAbsensi.schema";
import { getRekapBulananRombel, getRekapSemesterRombel, getRekapSiswaDetail, koreksiAbsensiHarian } from "../services/rekapAbsensi.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolveScopedRombelIds, assertRombelInScope } from "../services/scope.service";
import { resolvePeriodId } from "../lib/period";
import { siswaKelas } from "../db/schema";
import type { AppEnv } from "../types";

const MODULE = "absensi_siswa";

export const rekapAbsensiRoutes = new Hono<AppEnv>()
  .get("/bulanan", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.query("rombel");
    const bulan = c.req.query("bulan");
    if (!rombelId || !bulan) return c.json({ error: "Parameter tidak lengkap." }, 400);

    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);
    assertRombelInScope(scopedRombelIds, rombelId);

    const result = await getRekapBulananRombel(db, rombelId, periodId, bulan);
    return c.json(result);
  })

  .get("/semester", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.query("rombel");
    if (!rombelId) return c.json({ error: "Parameter tidak lengkap." }, 400);

    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);
    assertRombelInScope(scopedRombelIds, rombelId);

    const items = await getRekapSemesterRombel(db, rombelId, periodId);
    return c.json({ items });
  })

  .get("/siswa/:siswaId", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const siswaId = c.req.param("siswaId");
    if (!siswaId) return c.json({ error: "Parameter tidak lengkap." }, 400);

    const siswaKelasRow = await db.query.siswaKelas.findFirst({
      where: and(eq(siswaKelas.siswa_id, siswaId), eq(siswaKelas.period_id, periodId)),
    });
    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);
    assertRombelInScope(scopedRombelIds, siswaKelasRow?.rombel_id ?? null);

    const item = await getRekapSiswaDetail(db, siswaId, periodId);
    return c.json({ item });
  })

  .put("/koreksi", requirePermission(MODULE, "ubah"), zValidator("json", koreksiAbsensiHarianSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    const siswaKelasRow = await db.query.siswaKelas.findFirst({
      where: and(eq(siswaKelas.siswa_id, input.siswaId), eq(siswaKelas.period_id, periodId)),
    });
    const scopedRombelIds = await resolveScopedRombelIds(db, actor, scope, periodId);
    assertRombelInScope(scopedRombelIds, siswaKelasRow?.rombel_id ?? null);

    await koreksiAbsensiHarian(db, input, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: `${input.siswaId}|${input.tanggal}`,
      after: input,
    });

    return c.json({ ok: true });
  });
