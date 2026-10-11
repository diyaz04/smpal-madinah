import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { generatePairingCodeSchema } from "../../shared/schemas/kiosk.schema";
import { generatePairingCode, listDevices, revokeDevice } from "../services/kiosk.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { nullIfEmpty } from "../lib/text";
import type { AppEnv } from "../types";

const MODULE = "perangkat_kiosk";

export const kioskDevicesRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const items = await listDevices(db);
    return c.json({ items });
  })

  .post("/pairing-code", requirePermission(MODULE, "tambah"), zValidator("json", generatePairingCodeSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");

    const result = await generatePairingCode(db, { nama: input.nama, lokasi: nullIfEmpty(input.lokasi) }, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.code,
      after: { nama: input.nama, lokasi: input.lokasi },
    });

    return c.json(result, 201);
  })

  .post("/:id/cabut", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id");
    if (!id) return c.json({ error: "Parameter tidak lengkap." }, 400);

    await revokeDevice(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
