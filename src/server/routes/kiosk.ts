import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";

import { pairDeviceSchema } from "../../shared/schemas/kiosk.schema";
import { submitPresensiWajahSchema, submitPresensiPinSchema } from "../../shared/schemas/presensiGuru.schema";
import { catatKunjunganSchema } from "../../shared/schemas/tamu.schema";
import { pairDevice, getKioskKonteks } from "../services/kiosk.service";
import { getSemuaDescriptorAktif } from "../services/wajahGuru.service";
import { submitPresensi, verifikasiPin, pastikanPinAwal } from "../services/presensiGuru.service";
import { catatKunjungan } from "../services/tamu.service";
import { uploadFile } from "../services/r2.service";
import { setSessionCookie, KIOSK_SESSION_TTL_MS } from "../services/session.service";
import { requireKioskDevice } from "../middleware/requireKioskDevice";
import { resolvePeriodId } from "../lib/period";
import { guru } from "../db/schema";
import type { AppEnv } from "../types";

async function extractUploadedFile(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }): Promise<File> {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) throw new Error("NO_FILE");
  return file;
}

function requestMeta(c: { req: { header: (k: string) => string | undefined } }) {
  return {
    ip: c.req.header("CF-Connecting-IP") ?? null,
    userAgent: c.req.header("User-Agent") ?? null,
  };
}

export const kioskRoutes = new Hono<AppEnv>()
  // Publik — dipanggil dari tablet sebelum punya sesi apa pun.
  .post("/pair", zValidator("json", pairDeviceSchema), async (c) => {
    const db = c.get("db");
    const { code } = c.req.valid("json");

    const result = await pairDevice(db, code, requestMeta(c));
    setSessionCookie(c, result.token, KIOSK_SESSION_TTL_MS);

    return c.json({ nama: result.nama, lokasi: result.lokasi });
  })

  .get("/konteks", requireKioskDevice, async (c) => {
    const db = c.get("db");
    const periodId = await resolvePeriodId(c);
    const konteks = await getKioskKonteks(db, periodId);
    return c.json({ item: konteks });
  })

  .get("/wajah-descriptors", requireKioskDevice, async (c) => {
    const db = c.get("db");
    const items = await getSemuaDescriptorAktif(db);
    return c.json({ items });
  })

  .get("/daftar-guru", requireKioskDevice, async (c) => {
    const db = c.get("db");
    const rows = await db
      .select({ id: guru.id, nama: guru.nama_lengkap, fotoFileId: guru.foto_file_id })
      .from(guru)
      .where(eq(guru.is_active, true));
    return c.json({
      items: rows.map((r) => ({ id: r.id, nama: r.nama, fotoUrl: r.fotoFileId ? `/api/files/${r.fotoFileId}` : null })),
    });
  })

  .post("/presensi/foto", requireKioskDevice, async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }
    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "selfie",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });
    return c.json({ fileId: uploaded.id });
  })

  .post("/presensi/wajah", requireKioskDevice, zValidator("json", submitPresensiWajahSchema), async (c) => {
    const db = c.get("db");
    const session = c.get("session")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    const result = await submitPresensi(
      db,
      {
        guruId: input.guruId,
        jenis: input.jenis,
        metode: "wajah",
        skorKemiripan: input.skorKemiripan,
        livenessLolos: input.livenessLolos,
        kioskDeviceId: session.id,
        fotoFileId: input.fotoFileId,
        sumber: input.sumber,
        waktuPerangkat: input.waktuPerangkat,
        embeddingUntukBelajar: input.embeddingUntukBelajar,
      },
      periodId,
    );
    return c.json(result, 201);
  })

  .post("/presensi/pin", requireKioskDevice, zValidator("json", submitPresensiPinSchema), async (c) => {
    const db = c.get("db");
    const session = c.get("session")!;
    const periodId = await resolvePeriodId(c);
    const input = c.req.valid("json");

    await pastikanPinAwal(db, input.guruId);
    const pinResult = await verifikasiPin(db, input.guruId, input.pin);
    if (!pinResult.ok) {
      return c.json({ error: pinResult.message ?? "PIN salah." }, 400);
    }

    const result = await submitPresensi(
      db,
      {
        guruId: input.guruId,
        jenis: input.jenis,
        metode: "pin",
        skorKemiripan: null,
        livenessLolos: null,
        kioskDeviceId: session.id,
        fotoFileId: input.fotoFileId,
        sumber: input.sumber,
        waktuPerangkat: input.waktuPerangkat,
        embeddingUntukBelajar: null,
      },
      periodId,
    );
    return c.json(result, 201);
  })

  .post("/tamu/foto", requireKioskDevice, async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    let file: File;
    try {
      file = await extractUploadedFile(c);
    } catch {
      return c.json({ error: "File tidak ditemukan." }, 400);
    }
    const uploaded = await uploadFile(db, c.env.FILES, {
      prefix: "tamu",
      data: await file.arrayBuffer(),
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: actor.id,
    });
    return c.json({ fileId: uploaded.id });
  })

  .post("/tamu", requireKioskDevice, zValidator("json", catatKunjunganSchema), async (c) => {
    const db = c.get("db");
    const session = c.get("session")!;
    const input = c.req.valid("json");

    const result = await catatKunjungan(db, input, session.id);
    return c.json(result, 201);
  });
