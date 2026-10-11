import { and, eq, isNull, lte, gte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { kalenderEntri, rombel, jadwalVersi, jadwalSlot } from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { getSetting, setSetting } from "./settings.service";
import { getHariFromTanggal } from "../../shared/tanggal";
import { DEFAULT_AGENDA_BATAS_EDIT, DEFAULT_SISWA_ALPA_AMBANG } from "../../shared/constants";
import type {
  CreateKalenderEntriInput,
  UpdateKalenderEntriInput,
  UpdatePengaturanAkademikInput,
} from "../../shared/schemas/kalenderAkademik.schema";
import type { KalenderEntriItem, PengaturanAkademik } from "../../shared/types";
import type { Tingkat } from "../../shared/constants";

function toItem(row: typeof kalenderEntri.$inferSelect): KalenderEntriItem {
  return {
    id: row.id,
    periodId: row.period_id,
    nama: row.nama,
    tanggalMulai: row.tanggal_mulai,
    tanggalSelesai: row.tanggal_selesai,
    jenis: row.jenis,
    kbmDitiadakan: row.kbm_ditiadakan,
    cakupan: row.cakupan,
    tingkatBerlaku: JSON.parse(row.tingkat_berlaku) as Tingkat[],
    keterangan: row.keterangan,
  };
}

export async function listKalenderEntri(db: Database, periodId: string): Promise<KalenderEntriItem[]> {
  const rows = await db.query.kalenderEntri.findMany({
    where: and(eq(kalenderEntri.period_id, periodId), isNull(kalenderEntri.deleted_at)),
    orderBy: (t, { asc }) => [asc(t.tanggal_mulai)],
  });
  return rows.map(toItem);
}

export async function createKalenderEntri(
  db: Database,
  periodId: string,
  input: CreateKalenderEntriInput,
): Promise<KalenderEntriItem> {
  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(kalenderEntri).values({
    id,
    period_id: periodId,
    nama: input.nama,
    tanggal_mulai: input.tanggalMulai,
    tanggal_selesai: input.tanggalSelesai,
    jenis: input.jenis,
    kbm_ditiadakan: input.kbmDitiadakan,
    cakupan: input.cakupan,
    tingkat_berlaku: JSON.stringify(input.tingkatBerlaku),
    keterangan: nullIfEmpty(input.keterangan),
    created_at: now,
    updated_at: now,
  });
  const row = await db.query.kalenderEntri.findFirst({ where: eq(kalenderEntri.id, id) });
  return toItem(row!);
}

export async function updateKalenderEntri(
  db: Database,
  id: string,
  input: UpdateKalenderEntriInput,
): Promise<KalenderEntriItem> {
  const existing = await db.query.kalenderEntri.findFirst({ where: eq(kalenderEntri.id, id) });
  if (!existing || existing.deleted_at) {
    throw new HTTPException(404, { message: "Entri kalender tidak ditemukan." });
  }
  await db
    .update(kalenderEntri)
    .set({
      nama: input.nama,
      tanggal_mulai: input.tanggalMulai,
      tanggal_selesai: input.tanggalSelesai,
      jenis: input.jenis,
      kbm_ditiadakan: input.kbmDitiadakan,
      cakupan: input.cakupan,
      tingkat_berlaku: JSON.stringify(input.tingkatBerlaku),
      keterangan: nullIfEmpty(input.keterangan),
      updated_at: new Date().toISOString(),
    })
    .where(eq(kalenderEntri.id, id));
  const row = await db.query.kalenderEntri.findFirst({ where: eq(kalenderEntri.id, id) });
  return toItem(row!);
}

export async function deleteKalenderEntri(db: Database, id: string): Promise<void> {
  const existing = await db.query.kalenderEntri.findFirst({ where: eq(kalenderEntri.id, id) });
  if (!existing || existing.deleted_at) {
    throw new HTTPException(404, { message: "Entri kalender tidak ditemukan." });
  }
  await db
    .update(kalenderEntri)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(kalenderEntri.id, id));
}

/**
 * Hari efektif = hari-of-week tanggal itu punya jadwal_slot di versi jadwal
 * aktif periode ini, DAN tidak ada entri kalender ber-kbm_ditiadakan=true
 * yang mencakup tanggal & rombel (lewat tingkat) itu.
 */
export async function isHariEfektif(
  db: Database,
  tanggal: string,
  rombelId: string,
  periodId: string,
): Promise<boolean> {
  const hari = getHariFromTanggal(tanggal);
  if (!hari) return false;

  const versiAktif = await db.query.jadwalVersi.findFirst({
    where: and(eq(jadwalVersi.period_id, periodId), eq(jadwalVersi.status, "aktif")),
  });
  if (!versiAktif) return false;

  const slotHariIni = await db.query.jadwalSlot.findFirst({
    where: and(eq(jadwalSlot.jadwal_versi_id, versiAktif.id), eq(jadwalSlot.hari, hari)),
  });
  if (!slotHariIni) return false;

  const rombelRow = await db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) });
  if (!rombelRow) return false;

  const entriMenghalangi = await db.query.kalenderEntri.findMany({
    where: and(
      eq(kalenderEntri.period_id, periodId),
      eq(kalenderEntri.kbm_ditiadakan, true),
      isNull(kalenderEntri.deleted_at),
      lte(kalenderEntri.tanggal_mulai, tanggal),
      gte(kalenderEntri.tanggal_selesai, tanggal),
    ),
  });
  const terhalang = entriMenghalangi.some((e) => {
    if (e.cakupan === "SEMUA") return true;
    const tingkatBerlaku = JSON.parse(e.tingkat_berlaku) as Tingkat[];
    return tingkatBerlaku.includes(rombelRow.tingkat);
  });

  return !terhalang;
}

export async function getPengaturanAkademik(db: Database): Promise<PengaturanAkademik> {
  const batasEdit = await getSetting<typeof DEFAULT_AGENDA_BATAS_EDIT>(db, "agenda_batas_edit");
  const ambangAlpa = await getSetting<number>(db, "siswa_alpa_ambang");
  return {
    agendaBatasEditHariSetelah: batasEdit?.hariSetelah ?? DEFAULT_AGENDA_BATAS_EDIT.hariSetelah,
    agendaBatasEditJam: batasEdit?.jam ?? DEFAULT_AGENDA_BATAS_EDIT.jam,
    siswaAlpaAmbang: ambangAlpa ?? DEFAULT_SISWA_ALPA_AMBANG,
  };
}

export async function updatePengaturanAkademik(
  db: Database,
  input: UpdatePengaturanAkademikInput,
): Promise<void> {
  await setSetting(db, "agenda_batas_edit", {
    hariSetelah: input.agendaBatasEditHariSetelah,
    jam: input.agendaBatasEditJam,
  });
  await setSetting(db, "siswa_alpa_ambang", input.siswaAlpaAmbang);
}
