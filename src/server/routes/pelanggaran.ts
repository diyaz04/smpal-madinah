import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createPelanggaranSchema, batalkanPelanggaranSchema } from "../../shared/schemas/pelanggaran.schema";
import { listPelanggaran, createPelanggaran, batalkanPelanggaran, getRekapPoinSatuSiswa } from "../services/pelanggaran.service";
import { listPelanggaranJenisAktif } from "../services/pelanggaranJenis.service";
import { uploadFile } from "../services/r2.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import { resolvePeriodId, getTahunAjaran } from "../lib/period";
import type { AppEnv } from "../types";

const MODULE = "pelanggaran";

async function extractUploadedFile(c: {
  req: { parseBody: () => Promise<Record<string, unknown>> };
}): Promise<File> {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) {
    throw new Error("NO_FILE");
  }
  return file;
}

export const pelanggaranRoutes = new Hono<AppEnv>()
  .get("/jenis", requirePermission(MODULE, "tambah"), async (c) => {
    const items = await listPelanggaranJenisAktif(c.get("db"));
    return c.json({ items });
  })

  .get("/rekap-siswa/:id", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const periodId = await resolvePeriodId(c);
    const tahunAjaran = await getTahunAjaran(db, periodId);
    const item = await getRekapPoinSatuSiswa(db, id, tahunAjaran);
    return c.json({ item });
  })

  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const scope = c.get("permissionScope")!;
    const periodId = await resolvePeriodId(c);

    const result = await listPelanggaran(
      db,
      {
        cursor: c.req.query("cursor") || undefined,
        limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
        siswaId: c.req.query("siswa") || undefined,
        tanggalMulai: c.req.query("tanggalMulai") || undefined,
        tanggalSelesai: c.req.query("tanggalSelesai") || undefined,
        rombelId: c.req.query("rombel") || undefined,
        kategoriId: c.req.query("kategori") || undefined,
        jenisId: c.req.query("jenis") || undefined,
        pelaporUserId: c.req.query("pelapor") || undefined,
      },
      periodId,
      { isMilikSendiri: scope === "milik_sendiri", userId: user.id, guruId: user.guruId ?? null },
    );
    return c.json(result);
  })

  .post("/foto", requirePermission(MODULE, "tambah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;

    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }

    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "pelanggaran",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });

    return c.json({ fileId: uploaded.id, url: `/api/files/${uploaded.id}` });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createPelanggaranSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const periodId = await resolvePeriodId(c);

    const result = await createPelanggaran(db, input, periodId, actor.id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: null,
      after: { jenisId: input.jenisId, jumlahSiswa: result.count, tanggal: input.tanggal },
    });

    return c.json(result, 201);
  })

  .put(
    "/:id/batalkan",
    requirePermission(MODULE, "hapus"),
    zValidator("json", batalkanPelanggaranSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id");
      const { alasanBatal } = c.req.valid("json");

      await batalkanPelanggaran(db, id, alasanBatal, actor.id);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        after: { status: "dibatalkan", alasanBatal },
      });

      return c.json({ ok: true });
    },
  );
