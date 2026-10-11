import { and, eq, isNull, gt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { kioskPairingCodes, kioskDevices, users, guru, jadwalPiket, jadwalVersi } from "../db/schema";
import { generateId } from "../lib/id";
import { createSession, revokeSession, KIOSK_SESSION_TTL_MS } from "./session.service";
import { getSchoolProfile, getBranding } from "./settings.service";
import { nowWib } from "../lib/waktu";
import { getHariFromTanggal } from "../../shared/tanggal";

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 menit

function randomPairingCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(bytes[0]! % 1_000_000).padStart(6, "0");
}

export interface KioskDeviceItem {
  id: string;
  nama: string;
  lokasi: string | null;
  status: "aktif" | "dicabut";
  pairedAt: string;
  lastActiveAt: string | null;
}

export async function generatePairingCode(
  db: Database,
  input: { nama: string; lokasi: string | null },
  actorUserId: string,
): Promise<{ code: string; expiresAt: string }> {
  const code = randomPairingCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAIRING_CODE_TTL_MS);

  await db.insert(kioskPairingCodes).values({
    id: generateId(),
    code,
    nama: input.nama,
    lokasi: input.lokasi,
    expires_at: expiresAt.toISOString(),
    created_by: actorUserId,
    created_at: now.toISOString(),
  });

  return { code, expiresAt: expiresAt.toISOString() };
}

/** Dipanggil dari tablet (publik, tanpa sesi) untuk menukar kode 6 digit jadi sesi kiosk. */
export async function pairDevice(
  db: Database,
  code: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<{ token: string; nama: string; lokasi: string | null }> {
  const now = new Date();
  const pairing = await db.query.kioskPairingCodes.findFirst({
    where: and(eq(kioskPairingCodes.code, code), isNull(kioskPairingCodes.used_at), gt(kioskPairingCodes.expires_at, now.toISOString())),
  });
  if (!pairing) {
    throw new HTTPException(400, { message: "Kode pairing tidak valid atau sudah kedaluwarsa." });
  }

  const userId = generateId();
  await db.insert(users).values({
    id: userId,
    username: `kiosk-${userId}`,
    password_hash: "",
    password_salt: "",
    password_iterations: 0,
    must_change_password: false,
    full_name: `Kiosk - ${pairing.nama}`,
    account_type: "KIOSK",
    status: "ACTIVE",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  const { token } = await createSession(db, userId, meta, KIOSK_SESSION_TTL_MS);

  await db.insert(kioskDevices).values({
    id: generateId(),
    nama: pairing.nama,
    lokasi: pairing.lokasi,
    session_id: token,
    status: "aktif",
    paired_at: now.toISOString(),
    created_by: pairing.created_by,
  });

  await db.update(kioskPairingCodes).set({ used_at: now.toISOString() }).where(eq(kioskPairingCodes.id, pairing.id));

  return { token, nama: pairing.nama, lokasi: pairing.lokasi };
}

export async function listDevices(db: Database): Promise<KioskDeviceItem[]> {
  const rows = await db.query.kioskDevices.findMany({ orderBy: (t, { desc }) => [desc(t.paired_at)] });
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    lokasi: r.lokasi,
    status: r.status,
    pairedAt: r.paired_at,
    lastActiveAt: r.last_active_at,
  }));
}

export async function revokeDevice(db: Database, id: string): Promise<void> {
  const device = await db.query.kioskDevices.findFirst({ where: eq(kioskDevices.id, id) });
  if (!device) throw new HTTPException(404, { message: "Perangkat tidak ditemukan." });

  await db.update(kioskDevices).set({ status: "dicabut" }).where(eq(kioskDevices.id, id));
  await revokeSession(db, device.session_id);
}

export async function touchDeviceActivity(db: Database, sessionId: string): Promise<void> {
  await db.update(kioskDevices).set({ last_active_at: new Date().toISOString() }).where(eq(kioskDevices.session_id, sessionId));
}

export async function isDeviceActive(db: Database, sessionId: string): Promise<boolean> {
  const device = await db.query.kioskDevices.findFirst({
    where: and(eq(kioskDevices.session_id, sessionId), eq(kioskDevices.status, "aktif")),
    columns: { id: true },
  });
  return !!device;
}

export interface KioskKonteks {
  tanggal: string;
  jam: string;
  namaSekolah: string;
  logoUrl: string | null;
  guruPiketHariIni: string[];
}

export async function getKioskKonteks(db: Database, periodId: string): Promise<KioskKonteks> {
  const { tanggal, jam } = nowWib();
  const hari = getHariFromTanggal(tanggal);

  const [schoolProfile, branding] = await Promise.all([getSchoolProfile(db), getBranding(db)]);

  let guruPiketHariIni: string[] = [];
  if (hari) {
    const versiAktif = await db.query.jadwalVersi.findFirst({
      where: and(eq(jadwalVersi.period_id, periodId), eq(jadwalVersi.status, "aktif")),
      columns: { id: true },
    });
    if (versiAktif) {
      const rows = await db
        .select({ namaGuru: guru.nama_lengkap })
        .from(jadwalPiket)
        .innerJoin(guru, eq(jadwalPiket.guru_id, guru.id))
        .where(and(eq(jadwalPiket.jadwal_versi_id, versiAktif.id), eq(jadwalPiket.hari, hari)));
      guruPiketHariIni = rows.map((r) => r.namaGuru);
    }
  }

  return {
    tanggal,
    jam,
    namaSekolah: schoolProfile.nama,
    logoUrl: branding.logo_file_id ? `/api/files/${branding.logo_file_id}` : null,
    guruPiketHariIni,
  };
}
