import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createJadwalVersiSchema,
  createJadwalSlotSchema,
  updateJadwalSlotSchema,
  updateJadwalIsiSchema,
  setPiketSchema,
} from "../../shared/schemas/jadwal.schema";
import {
  listVersi,
  createVersi,
  activateVersi,
  deleteVersi,
  listSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getGridForRombel,
  getGridForGuru,
  updateJadwalIsi,
  listPiket,
  setPiket,
} from "../services/jadwal.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { requireAuth } from "../middleware/session";
import { resolvePeriodId } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "jadwal_pelajaran";

export const jadwalRoutes = new Hono<AppEnv>()
  .get("/versi", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await listVersi(c.get("db"), periodId);
    return c.json({ items });
  })

  .post("/versi", requirePermission(MODULE, "ubah"), zValidator("json", createJadwalVersiSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const { nama } = c.req.valid("json");
    const item = await createVersi(db, periodId, nama);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: item.id,
      after: { nama: item.nama },
    });

    return c.json({ item }, 201);
  })

  .put("/versi/:id/aktifkan", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await activateVersi(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { status: "aktif" },
    });

    return c.json({ ok: true });
  })

  .delete("/versi/:id", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteVersi(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  })

  .get("/versi/:versiId/slots", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listSlots(c.get("db"), c.req.param("versiId")!);
    return c.json({ items });
  })

  .post(
    "/versi/:versiId/slots",
    requirePermission(MODULE, "ubah"),
    zValidator("json", createJadwalSlotSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const versiId = c.req.param("versiId")!;
      const input = c.req.valid("json");
      const item = await createSlot(db, versiId, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: item.id,
        after: { hari: item.hari, jamMulai: item.jamMulai },
      });

      return c.json({ item }, 201);
    },
  )

  .put("/slots/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateJadwalSlotSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");
    const item = await updateSlot(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { hari: item.hari, jamMulai: item.jamMulai },
    });

    return c.json({ item });
  })

  .delete("/slots/:id", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteSlot(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  })

  .get("/versi/:versiId/grid/rombel/:rombelId", requirePermission(MODULE, "lihat"), async (c) => {
    const grid = await getGridForRombel(c.get("db"), c.req.param("versiId")!, c.req.param("rombelId")!);
    return c.json(grid);
  })

  .get("/versi/:versiId/grid/guru/:guruId", requirePermission(MODULE, "lihat"), async (c) => {
    const grid = await getGridForGuru(c.get("db"), c.req.param("versiId")!, c.req.param("guruId")!);
    return c.json(grid);
  })

  .get("/jadwal-saya", requireAuth, async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    if (!user.guruId) return c.json({ error: "Akun ini tidak terhubung ke data guru." }, 400);
    const periodId = await resolvePeriodId(c);
    const versiList = await listVersi(db, periodId);
    const aktif = versiList.find((v) => v.status === "aktif");
    if (!aktif) return c.json({ slots: [], isi: [] });
    const grid = await getGridForGuru(db, aktif.id, user.guruId);
    return c.json(grid);
  })

  .put(
    "/slots/:slotId/isi/:rombelId",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateJadwalIsiSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const slotId = c.req.param("slotId")!;
      const rombelId = c.req.param("rombelId")!;
      const input = c.req.valid("json");
      await updateJadwalIsi(db, slotId, rombelId, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: `${slotId}:${rombelId}`,
        after: { mapelId: input.mapelId, jumlahGuru: input.guruIds.length },
      });

      return c.json({ ok: true });
    },
  )

  .get("/versi/:versiId/piket", requirePermission(MODULE, "lihat"), async (c) => {
    const items = await listPiket(c.get("db"), c.req.param("versiId")!);
    return c.json({ items });
  })

  .put(
    "/versi/:versiId/piket",
    requirePermission(MODULE, "ubah"),
    zValidator("json", setPiketSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const versiId = c.req.param("versiId")!;
      const { hari, guruIds } = c.req.valid("json");
      await setPiket(db, versiId, hari, guruIds);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: `piket:${hari}`,
        after: { jumlahGuru: guruIds.length },
      });

      return c.json({ ok: true });
    },
  );
