import { Hono, type Context } from "hono";

import {
  getPeringkatPoin,
  getRekapKategoriPerRombel,
  getRekapJenisPerBulan,
} from "../services/rekapKesiswaan.service";
import { requirePermission } from "../middleware/requirePermission";
import { getWaliRombelIds } from "../services/scope.service";
import { resolvePeriodId, getTahunAjaran } from "../lib/period";
import type { Tingkat } from "../../shared/constants";
import type { AppEnv } from "../types";

const MODULE = "rekap_kesiswaan";

async function resolveScopedRombelIds(c: Context<AppEnv>) {
  const db = c.get("db");
  const user = c.get("user")!;
  const scope = c.get("permissionScope")!;
  const periodId = await resolvePeriodId(c);
  const scopedRombelIds =
    scope === "milik_sendiri" ? (user.guruId ? await getWaliRombelIds(db, user.guruId, periodId) : []) : null;
  return { db, periodId, scopedRombelIds };
}

export const rekapKesiswaanRoutes = new Hono<AppEnv>()
  .get("/peringkat", requirePermission(MODULE, "lihat"), async (c) => {
    const { db, periodId, scopedRombelIds } = await resolveScopedRombelIds(c);
    const tahunAjaran = c.req.query("tahunAjaran") || (await getTahunAjaran(db, periodId));

    const items = await getPeringkatPoin(
      db,
      {
        tahunAjaran,
        tingkat: (c.req.query("tingkat") as Tingkat | undefined) || undefined,
        rombelId: c.req.query("rombel") || undefined,
        limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
      },
      scopedRombelIds,
    );
    return c.json({ items, tahunAjaran });
  })

  .get("/kategori-rombel", requirePermission(MODULE, "lihat"), async (c) => {
    const { db, periodId, scopedRombelIds } = await resolveScopedRombelIds(c);
    const tahunAjaran = c.req.query("tahunAjaran") || (await getTahunAjaran(db, periodId));
    const items = await getRekapKategoriPerRombel(db, tahunAjaran, scopedRombelIds);
    return c.json({ items, tahunAjaran });
  })

  .get("/jenis-bulanan", requirePermission(MODULE, "lihat"), async (c) => {
    const { db, periodId, scopedRombelIds } = await resolveScopedRombelIds(c);
    const tahunAjaran = c.req.query("tahunAjaran") || (await getTahunAjaran(db, periodId));
    const items = await getRekapJenisPerBulan(db, tahunAjaran, scopedRombelIds);
    return c.json({ items, tahunAjaran });
  });
