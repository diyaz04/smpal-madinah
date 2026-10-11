import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createRombelSchema,
  updateRombelSchema,
  copyRombelFromPeriodSchema,
  updateNomorAbsenSchema,
} from "../../shared/schemas/rombel.schema";
import {
  listRombel,
  createRombel,
  updateRombel,
  deleteRombel,
  copyRombelFromPeriod,
  getSiswaInRombel,
  updateNomorAbsen,
} from "../services/rombel.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "data_kelas";

export const rombelRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await listRombel(c.get("db"), periodId);
    return c.json({ items, periodId });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createRombelSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");
    const { item, warning } = await createRombel(db, periodId, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: item.id,
      after: { tingkat: item.tingkat, nama: item.nama, waliGuruId: item.waliGuru?.id ?? null },
    });

    return c.json({ item, warning }, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateRombelSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");
    const { item, warning } = await updateRombel(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { tingkat: item.tingkat, nama: item.nama, waliGuruId: item.waliGuru?.id ?? null },
    });

    return c.json({ item, warning });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteRombel(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  })

  .post(
    "/copy-from-period",
    requirePermission(MODULE, "tambah"),
    zValidator("json", copyRombelFromPeriodSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const targetPeriodId = await resolvePeriodId(c);
      const input = c.req.valid("json");
      const result = await copyRombelFromPeriod(db, targetPeriodId, input.sourcePeriodId, input.keepWaliKelas);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: targetPeriodId,
        after: { disalinDari: input.sourcePeriodId, jumlah: result.count },
      });

      return c.json(result);
    },
  )

  .get("/:id/siswa", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await getSiswaInRombel(c.get("db"), c.req.param("id")!, periodId);
    return c.json({ items });
  })

  .put(
    "/:id/nomor-absen",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateNomorAbsenSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id")!;
      const periodId = await resolvePeriodId(c);
      const { items } = c.req.valid("json");
      await updateNomorAbsen(db, id, periodId, items);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { nomorAbsenDiperbarui: items.length },
      });

      return c.json({ ok: true });
    },
  );
