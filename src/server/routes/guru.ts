import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createGuruSchema,
  updateGuruSchema,
  guruListQuerySchema,
  buatAkunGuruSchema,
  addGuruAliasSchema,
  addTugasTambahanSchema,
  importGuruCommitSchema,
} from "../../shared/schemas/guru.schema";
import {
  listGuruSimple,
  listGuru,
  getGuruDetail,
  createGuru,
  updateGuru,
  deleteGuru,
  setGuruActive,
  buatAkunGuru,
  addGuruAlias,
  removeGuruAlias,
  addTugasTambahan,
  removeTugasTambahan,
  importGuruCommit,
  exportGuru,
} from "../services/guru.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { requireAuth } from "../middleware/session";
import { resolvePeriodId } from "../lib/period";
import { nullIfEmpty } from "../lib/text";
import type { AppEnv } from "../types";

const MODULE = "data_guru";

export const guruRoutes = new Hono<AppEnv>()
  .get("/simple", requireAuth, async (c) => {
    const items = await listGuruSimple(c.get("db"));
    return c.json({ items });
  })

  .get("/export", requirePermission(MODULE, "export"), async (c) => {
    const items = await exportGuru(c.get("db"));
    return c.json({ items });
  })

  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const query = guruListQuerySchema.parse(c.req.query());
    const result = await listGuru(c.get("db"), query);
    return c.json(result);
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createGuruSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const item = await createGuru(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: item.id,
      after: { namaLengkap: item.namaLengkap, nip: item.nip },
    });

    return c.json({ item }, 201);
  })

  .post(
    "/import/commit",
    requirePermission(MODULE, "tambah"),
    zValidator("json", importGuruCommitSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const { rows } = c.req.valid("json");
      const result = await importGuruCommit(db, rows);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: "import",
        after: { jumlahDiimpor: result.count },
      });

      return c.json(result);
    },
  )

  .post(
    "/:id/buat-akun",
    requirePermission(MODULE, "ubah"),
    zValidator("json", buatAkunGuruSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id")!;
      const input = c.req.valid("json");
      const result = await buatAkunGuru(db, id, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { akunDibuat: result.username },
      });

      return c.json(result, 201);
    },
  )

  .put("/:id/status", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const body = await c.req.json<{ isActive: boolean }>();
    await setGuruActive(db, id, body.isActive);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { isActive: body.isActive },
    });

    return c.json({ ok: true });
  })

  .post(
    "/:id/alias",
    requirePermission(MODULE, "ubah"),
    zValidator("json", addGuruAliasSchema),
    async (c) => {
      const db = c.get("db");
      const id = c.req.param("id")!;
      const { aliasNama } = c.req.valid("json");
      await addGuruAlias(db, id, aliasNama);
      return c.json({ ok: true }, 201);
    },
  )

  .delete("/:id/alias/:aliasNama", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const aliasNama = decodeURIComponent(c.req.param("aliasNama")!);
    await removeGuruAlias(db, id, aliasNama);
    return c.json({ ok: true });
  })

  .post(
    "/:id/tugas-tambahan",
    requirePermission(MODULE, "ubah"),
    zValidator("json", addTugasTambahanSchema),
    async (c) => {
      const db = c.get("db");
      const id = c.req.param("id")!;
      const periodId = await resolvePeriodId(c);
      const input = c.req.valid("json");
      await addTugasTambahan(db, id, periodId, input.namaTugas, nullIfEmpty(input.keterangan));
      return c.json({ ok: true }, 201);
    },
  )

  .delete("/tugas-tambahan/:tugasId", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const tugasId = c.req.param("tugasId")!;
    await removeTugasTambahan(db, tugasId);
    return c.json({ ok: true });
  })

  .get("/:id", requirePermission(MODULE, "lihat"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const item = await getGuruDetail(c.get("db"), c.req.param("id")!, periodId);
    if (!item) return c.json({ error: "Guru tidak ditemukan." }, 404);
    return c.json({ item });
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateGuruSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");
    const item = await updateGuru(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { namaLengkap: item.namaLengkap, nip: item.nip },
    });

    return c.json({ item });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const periodId = await resolvePeriodId(c);
    await deleteGuru(db, id, periodId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
