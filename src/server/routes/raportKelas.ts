import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  saveEkskulNilaiSchema,
  saveKehadiranOverrideSchema,
  saveCatatanPendidikSchema,
  saveKenaikanKelasSchema,
  bukaKunciRombelSchema,
} from "../../shared/schemas/raportKelas.schema";
import {
  getRaportKelasKonteks,
  assertBisaLihatRombel,
  assertWaliRombel,
  assertBisaIsiEkskul,
  saveEkskulNilai,
  saveKehadiranOverride,
  saveCatatanPendidik,
  saveKenaikanKelas,
  getKekuranganFinalisasi,
  finalisasiRombel,
  bukaKunciRombelDenganAlasan,
} from "../services/raportKelas.service";
import { isRombelTerkunci } from "../services/raportKunciRombel.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "raport_kelas";

export const raportKelasRoutes = new Hono<AppEnv>()
  .get("/:rombelId", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.param("rombelId")!;

    await assertBisaLihatRombel(db, user, scope, periodId, rombelId);
    const item = await getRaportKelasKonteks(db, periodId, rombelId);
    return c.json({ item });
  })

  .get("/:rombelId/kekurangan", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.param("rombelId")!;

    await assertBisaLihatRombel(db, user, scope, periodId, rombelId);
    const items = await getKekuranganFinalisasi(db, periodId, rombelId);
    return c.json({ items });
  })

  .put("/:rombelId/ekskul", requirePermission(MODULE, "tambah"), zValidator("json", saveEkskulNilaiSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.param("rombelId")!;
    const input = c.req.valid("json");

    if (await isRombelTerkunci(db, periodId, rombelId)) {
      return c.json({ error: "Raport rombel ini sudah dikunci." }, 400);
    }
    await assertBisaIsiEkskul(db, user, scope, periodId, rombelId, input.ekskulId);
    await saveEkskulNilai(db, periodId, input);

    return c.json({ ok: true });
  })

  .put(
    "/:rombelId/kehadiran",
    requirePermission(MODULE, "ubah"),
    zValidator("json", saveKehadiranOverrideSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const scope = c.get("permissionScope")!;
      const periodId = await resolvePeriodId(c);
      const rombelId = c.req.param("rombelId")!;
      const input = c.req.valid("json");

      if (await isRombelTerkunci(db, periodId, rombelId)) {
        return c.json({ error: "Raport rombel ini sudah dikunci." }, 400);
      }
      await assertWaliRombel(db, actor, scope, periodId, rombelId);
      await saveKehadiranOverride(db, periodId, rombelId, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: input.siswaId,
        after: { overrideSakit: input.overrideSakit, overrideIzin: input.overrideIzin, overrideAlpa: input.overrideAlpa },
      });

      return c.json({ ok: true });
    },
  )

  .put(
    "/:rombelId/catatan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", saveCatatanPendidikSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const scope = c.get("permissionScope")!;
      const periodId = await resolvePeriodId(c);
      const rombelId = c.req.param("rombelId")!;
      const input = c.req.valid("json");

      if (await isRombelTerkunci(db, periodId, rombelId)) {
        return c.json({ error: "Raport rombel ini sudah dikunci." }, 400);
      }
      await assertWaliRombel(db, actor, scope, periodId, rombelId);
      await saveCatatanPendidik(db, periodId, rombelId, input);

      return c.json({ ok: true });
    },
  )

  .put(
    "/:rombelId/kenaikan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", saveKenaikanKelasSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const scope = c.get("permissionScope")!;
      const periodId = await resolvePeriodId(c);
      const rombelId = c.req.param("rombelId")!;
      const input = c.req.valid("json");

      if (await isRombelTerkunci(db, periodId, rombelId)) {
        return c.json({ error: "Raport rombel ini sudah dikunci." }, 400);
      }
      await assertWaliRombel(db, actor, scope, periodId, rombelId);
      await saveKenaikanKelas(db, periodId, rombelId, input);

      return c.json({ ok: true });
    },
  )

  .post("/:rombelId/finalisasi", requirePermission(MODULE, "approve"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const rombelId = c.req.param("rombelId")!;

    await assertWaliRombel(db, actor, scope, periodId, rombelId);
    await finalisasiRombel(db, periodId, rombelId, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "approve",
      recordId: rombelId,
      after: { periodId, status: "final" },
    });

    return c.json({ ok: true });
  })

  .post(
    "/:rombelId/buka-kunci",
    requirePermission(MODULE, "approve"),
    zValidator("json", bukaKunciRombelSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const scope = c.get("permissionScope")!;
      if (scope !== "semua") {
        return c.json({ error: "Hanya Admin yang bisa membuka kunci raport." }, 403);
      }
      const periodId = await resolvePeriodId(c);
      const rombelId = c.req.param("rombelId")!;
      const { alasan } = c.req.valid("json");

      await bukaKunciRombelDenganAlasan(db, periodId, rombelId);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: rombelId,
        after: { periodId, status: "draf", alasan },
      });

      return c.json({ ok: true });
    },
  );
