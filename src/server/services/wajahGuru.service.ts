import { and, eq, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { guru, wajahGuruDescriptor } from "../db/schema";
import { deleteFile } from "./r2.service";
import { getSetting } from "./settings.service";
import { generateId } from "../lib/id";
import { MAKS_DESCRIPTOR_OTOMATIS_PER_GURU } from "../../shared/constants";
import type { WajahGuruStatus, WajahDescriptorItem } from "../../shared/types";

export async function setujuiBiometrik(db: Database, guruId: string, versi: number): Promise<void> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!row) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  await db
    .update(guru)
    .set({
      persetujuan_biometrik: true,
      persetujuan_versi: versi,
      persetujuan_tanggal: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .where(eq(guru.id, guruId));
}

/** Menarik persetujuan: hapus semua descriptor wajah + foto pendaftaran, dicatat lewat logActivity oleh caller. */
export async function tarikPersetujuan(db: Database, bucket: R2Bucket, guruId: string): Promise<void> {
  const descriptors = await db.query.wajahGuruDescriptor.findMany({ where: eq(wajahGuruDescriptor.guru_id, guruId) });

  for (const d of descriptors) {
    if (d.foto_file_id) await deleteFile(db, bucket, d.foto_file_id);
  }
  await db.delete(wajahGuruDescriptor).where(eq(wajahGuruDescriptor.guru_id, guruId));

  await db
    .update(guru)
    .set({
      persetujuan_biometrik: false,
      persetujuan_versi: null,
      persetujuan_tanggal: null,
      updated_at: new Date().toISOString(),
    })
    .where(eq(guru.id, guruId));
}

export async function tambahDescriptorManual(
  db: Database,
  guruId: string,
  descriptor: string,
  fotoFileId: string | null,
): Promise<void> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!row) throw new HTTPException(404, { message: "Guru tidak ditemukan." });
  if (!row.persetujuan_biometrik) {
    throw new HTTPException(400, { message: "Guru belum menyetujui persetujuan biometrik." });
  }

  await db.insert(wajahGuruDescriptor).values({
    id: generateId(),
    guru_id: guruId,
    descriptor,
    sumber: "manual",
    foto_file_id: fotoFileId,
    created_at: new Date().toISOString(),
  });
}

/** Dipanggil setelah presensi wajah sukses & dikonfirmasi — descriptor baru menggantikan yang paling lama (FIFO, maks N). */
export async function tambahDescriptorOtomatis(db: Database, guruId: string, descriptor: string): Promise<void> {
  const aktif = await getSetting<boolean>(db, "descriptor_otomatis_aktif");
  if (aktif === false) return;

  const existing = await db.query.wajahGuruDescriptor.findMany({
    where: and(eq(wajahGuruDescriptor.guru_id, guruId), eq(wajahGuruDescriptor.sumber, "otomatis")),
    orderBy: (t, { asc: ascOrder }) => [ascOrder(t.created_at)],
  });

  if (existing.length >= MAKS_DESCRIPTOR_OTOMATIS_PER_GURU) {
    const toDelete = existing.slice(0, existing.length - MAKS_DESCRIPTOR_OTOMATIS_PER_GURU + 1);
    for (const d of toDelete) {
      await db.delete(wajahGuruDescriptor).where(eq(wajahGuruDescriptor.id, d.id));
    }
  }

  await db.insert(wajahGuruDescriptor).values({
    id: generateId(),
    guru_id: guruId,
    descriptor,
    sumber: "otomatis",
    foto_file_id: null,
    created_at: new Date().toISOString(),
  });
}

export async function hapusDescriptor(db: Database, bucket: R2Bucket, descriptorId: string): Promise<void> {
  const row = await db.query.wajahGuruDescriptor.findFirst({ where: eq(wajahGuruDescriptor.id, descriptorId) });
  if (!row) throw new HTTPException(404, { message: "Descriptor tidak ditemukan." });
  if (row.foto_file_id) await deleteFile(db, bucket, row.foto_file_id);
  await db.delete(wajahGuruDescriptor).where(eq(wajahGuruDescriptor.id, descriptorId));
}

export async function getWajahStatus(db: Database, guruId: string): Promise<WajahGuruStatus> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!row) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const descriptors = await db.query.wajahGuruDescriptor.findMany({
    where: eq(wajahGuruDescriptor.guru_id, guruId),
    orderBy: (t, { asc: ascOrder }) => [ascOrder(t.created_at)],
  });

  const items: WajahDescriptorItem[] = descriptors.map((d) => ({
    id: d.id,
    sumber: d.sumber,
    fotoUrl: d.foto_file_id ? `/api/files/${d.foto_file_id}` : null,
    createdAt: d.created_at,
  }));

  return {
    persetujuanBiometrik: row.persetujuan_biometrik,
    persetujuanVersi: row.persetujuan_versi,
    persetujuanTanggal: row.persetujuan_tanggal,
    descriptors: items,
  };
}

export interface DescriptorAktif {
  guruId: string;
  descriptor: number[];
}

/** Dipanggil endpoint sinkronisasi kiosk — hanya guru aktif & sudah setuju biometrik. */
export async function getSemuaDescriptorAktif(db: Database): Promise<DescriptorAktif[]> {
  const rows = await db
    .select({ guruId: wajahGuruDescriptor.guru_id, descriptor: wajahGuruDescriptor.descriptor })
    .from(wajahGuruDescriptor)
    .innerJoin(guru, eq(wajahGuruDescriptor.guru_id, guru.id))
    .where(and(eq(guru.is_active, true), eq(guru.persetujuan_biometrik, true)))
    .orderBy(asc(wajahGuruDescriptor.created_at));

  return rows.map((r) => ({ guruId: r.guruId, descriptor: base64ToFloatArray(r.descriptor) }));
}

function base64ToFloatArray(b64: string): number[] {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return Array.from(new Float32Array(bytes.buffer));
}
