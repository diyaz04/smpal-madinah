import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { submitAgendaSchema } from "../../shared/schemas/agenda.schema";
import { getJadwalHariIni, getAgendaFormContext, submitAgenda, listRiwayatMateri } from "../services/agenda.service";
import { getRekapMengajarGuru } from "../services/rekapMengajar.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolveScopedRombelIds } from "../services/scope.service";
import { resolvePeriodId } from "../lib/period";
import { nowWib } from "../lib/waktu";
import type { AppEnv } from "../types";

const MODULE = "agenda_guru";

export const agendaRoutes = new Hono<AppEnv>()
  .get("/hari-ini", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    if (!user.guruId) return c.json({ error: "Akun ini tidak terhubung ke data guru." }, 400);

    const periodId = await resolvePeriodId(c);
    const tanggal = c.req.query("tanggal") || nowWib().tanggal;
    const items = await getJadwalHariIni(db, user.guruId, tanggal, periodId);
    return c.json({ items, tanggal });
  })

  .get("/form-context", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    if (!user.guruId) return c.json({ error: "Akun ini tidak terhubung ke data guru." }, 400);

    const rombelId = c.req.query("rombel");
    const tanggal = c.req.query("tanggal");
    const slotMulai = c.req.query("slot");
    if (!rombelId || !tanggal || !slotMulai) {
      return c.json({ error: "Parameter tidak lengkap." }, 400);
    }
    const mapelId = c.req.query("mapel") || null;

    const context = await getAgendaFormContext(db, { rombelId, mapelId, tanggal, slotMulai, guruId: user.guruId });
    return c.json({ item: context });
  })

  .get("/riwayat-materi", requirePermission("riwayat_materi", "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;

    const periodId = await resolvePeriodId(c);
    const scopedRombelIds = await resolveScopedRombelIds(db, user, scope, periodId);

    const result = await listRiwayatMateri(
      db,
      {
        cursor: c.req.query("cursor") || undefined,
        limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
        rombelId: c.req.query("rombel") || undefined,
        mapelId: c.req.query("mapel") || undefined,
        guruId: c.req.query("guru") || undefined,
      },
      scopedRombelIds,
    );
    return c.json(result);
  })

  .get("/rekap-mengajar", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);
    const bulan = c.req.query("bulan");
    if (!bulan) return c.json({ error: "Parameter bulan wajib diisi." }, 400);

    const guruId = scope === "milik_sendiri" ? (user.guruId ?? undefined) : c.req.query("guru") || undefined;
    const items = await getRekapMengajarGuru(db, periodId, { bulan, guruId });
    return c.json({ items });
  })

  .post("/submit", requirePermission(MODULE, "tambah"), zValidator("json", submitAgendaSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const input = c.req.valid("json");

    const result = await submitAgenda(db, input, { userId: actor.id, guruId: actor.guruId }, scope);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: result.agendaId,
      after: { rombelId: input.rombelId, tanggal: input.tanggal, slotMulai: input.slotMulai, status: input.status },
    });

    return c.json(result, 201);
  });
