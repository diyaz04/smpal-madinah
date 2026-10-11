import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createSiswaSchema,
  updateSiswaSchema,
  siswaListQuerySchema,
  bulkPindahRombelSchema,
  bulkUbahStatusSchema,
  importSiswaCommitSchema,
} from "../../shared/schemas/siswa.schema";
import {
  listSiswa,
  getSiswaDetail,
  getSiswaRombelId,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  bulkPindahRombel,
  bulkUbahStatus,
  importSiswaCommit,
  exportSiswa,
} from "../services/siswa.service";
import { resolveScopedRombelIds, assertRombelInScope } from "../services/scope.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId } from "../lib/period";
import { nullIfEmpty } from "../lib/text";
import type { AppEnv } from "../types";

const MODULE = "data_siswa";

export const siswaRoutes = new Hono<AppEnv>()
  .get("/export", requirePermission(MODULE, "export"), async (c) => {
    const periodId = await resolvePeriodId(c);
    const items = await exportSiswa(c.get("db"), periodId);
    return c.json({ items });
  })

  .post(
    "/bulk/pindah-rombel",
    requirePermission(MODULE, "ubah"),
    zValidator("json", bulkPindahRombelSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const periodId = await resolvePeriodId(c);
      const { siswaIds, rombelId } = c.req.valid("json");
      const result = await bulkPindahRombel(db, siswaIds, rombelId, periodId);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: "bulk-pindah-rombel",
        after: { jumlahSiswa: result.count, rombelId },
      });

      return c.json(result);
    },
  )

  .post(
    "/bulk/ubah-status",
    requirePermission(MODULE, "ubah"),
    zValidator("json", bulkUbahStatusSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const { siswaIds, status, statusKeterangan } = c.req.valid("json");
      const result = await bulkUbahStatus(db, siswaIds, status, nullIfEmpty(statusKeterangan));

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: "bulk-ubah-status",
        after: { jumlahSiswa: result.count, status },
      });

      return c.json(result);
    },
  )

  .post(
    "/import/commit",
    requirePermission(MODULE, "tambah"),
    zValidator("json", importSiswaCommitSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const periodId = await resolvePeriodId(c);
      const { rows } = c.req.valid("json");
      const result = await importSiswaCommit(db, rows, periodId);

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

  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const query = siswaListQuerySchema.parse(c.req.query());
    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);
    const result = await listSiswa(db, query, periodId, scopedRombelIds);
    return c.json(result);
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createSiswaSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");
    const item = await createSiswa(db, input, periodId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: item.id,
      after: { namaLengkap: item.namaLengkap, nis: item.nis },
    });

    return c.json({ item }, 201);
  })

  .get("/:id", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const id = c.req.param("id")!;
    const periodId = await resolvePeriodId(c);

    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);
    if (scopedRombelIds !== null) {
      const rombelId = await getSiswaRombelId(db, id, periodId);
      assertRombelInScope(scopedRombelIds, rombelId);
    }

    const item = await getSiswaDetail(db, id, periodId);
    if (!item) return c.json({ error: "Siswa tidak ditemukan." }, 404);
    return c.json({ item });
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateSiswaSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const id = c.req.param("id")!;
    const periodId = await resolvePeriodId(c);

    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);
    if (scopedRombelIds !== null) {
      const rombelId = await getSiswaRombelId(db, id, periodId);
      assertRombelInScope(scopedRombelIds, rombelId);
    }

    const input = c.req.valid("json");
    const item = await updateSiswa(db, id, input, periodId);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      after: { namaLengkap: item.namaLengkap, nis: item.nis },
    });

    return c.json({ item });
  })

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    await deleteSiswa(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
    });

    return c.json({ ok: true });
  });
