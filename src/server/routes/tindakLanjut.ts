import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createTindakLanjutSchema } from "../../shared/schemas/tindakLanjut.schema";
import {
  listSanksiAktif,
  listRiwayatTindakLanjut,
  createTindakLanjut,
} from "../services/tindakLanjut.service";
import { uploadFile } from "../services/r2.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { getWaliRombelIds } from "../services/scope.service";
import { resolvePeriodId, getTahunAjaran } from "../lib/period";
import type { SanksiSiswaStatus } from "../../shared/constants";
import type { AppEnv } from "../types";

const MODULE = "tindak_lanjut";

export const tindakLanjutRoutes = new Hono<AppEnv>()
  .get("/sanksi", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const tahunAjaran = await getTahunAjaran(db, periodId);

    const scopedRombelIds =
      scope === "milik_sendiri" ? (user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : []) : null;

    const items = await listSanksiAktif(
      db,
      {
        status: (c.req.query("status") as SanksiSiswaStatus | undefined) || undefined,
        rombelId: c.req.query("rombel") || undefined,
        siswaId: c.req.query("siswa") || undefined,
      },
      tahunAjaran,
      periodId,
      scopedRombelIds,
    );
    return c.json({ items });
  })

  .get("/sanksi/:id/riwayat", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const items = await listRiwayatTindakLanjut(db, id);
    return c.json({ items });
  })

  .post("/lampiran", requirePermission(MODULE, "tambah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "tindak-lanjut",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createTindakLanjutSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const result = await createTindakLanjut(db, input, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.id,
      after: { sanksiSiswaId: input.sanksiSiswaId, jenis: input.jenis, statusBaru: input.statusBaru },
    });

    return c.json(result, 201);
  });
