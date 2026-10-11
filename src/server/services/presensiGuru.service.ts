import { and, eq, desc, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { guru, presensiGuru, rekapPresensiGuruHarian, izinGuru } from "../db/schema";
import { getPertemuanUntukTanggal } from "./pertemuan.service";
import { tambahDescriptorOtomatis } from "./wajahGuru.service";
import { getSetting, setSetting } from "./settings.service";
import { generateId } from "../lib/id";
import { nowWib } from "../lib/waktu";
import { hashPassword, verifyPassword, DEFAULT_PBKDF2_ITERATIONS } from "../lib/pbkdf2";
import { getHariFromTanggal } from "../../shared/tanggal";
import { computeStatusDatang, computeStatusPulang, computeStatusHarianPresensi, subtractMinutes } from "../../shared/presensiGuru";
import { MAX_FAILED_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS } from "./auth.service";
import { DEFAULT_PENGATURAN_PRESENSI, DEFAULT_RETENSI_FOTO_HARI, DEFAULT_AMBANG_KEMIRIPAN_WAJAH } from "../../shared/constants";
import type { PresensiJenis, PresensiMetode, PresensiSumber, Hari, RekapPresensiStatus } from "../../shared/constants";
import type { PengaturanPresensi } from "../../shared/types";

export async function getPengaturanPresensi(db: Database): Promise<PengaturanPresensi> {
  const [stored, retensi, ambang, descriptorOtomatis] = await Promise.all([
    getSetting<Partial<PengaturanPresensi>>(db, "pengaturan_presensi"),
    getSetting<number>(db, "retensi_foto_hari"),
    getSetting<number>(db, "ambang_kemiripan_wajah"),
    getSetting<boolean>(db, "descriptor_otomatis_aktif"),
  ]);

  return {
    modeJamMasuk: stored?.modeJamMasuk ?? DEFAULT_PENGATURAN_PRESENSI.modeJamMasuk,
    toleransiTerlambatMenit: stored?.toleransiTerlambatMenit ?? DEFAULT_PENGATURAN_PRESENSI.toleransiTerlambatMenit,
    offsetJadwalMengajarMenit: stored?.offsetJadwalMengajarMenit ?? DEFAULT_PENGATURAN_PRESENSI.offsetJadwalMengajarMenit,
    jamKerja: stored?.jamKerja ?? DEFAULT_PENGATURAN_PRESENSI.jamKerja,
    retensiFotoHari: retensi ?? DEFAULT_RETENSI_FOTO_HARI,
    ambangKemiripanWajah: ambang ?? DEFAULT_AMBANG_KEMIRIPAN_WAJAH,
    descriptorOtomatisAktif: descriptorOtomatis ?? true,
  };
}

export async function updatePengaturanPresensi(db: Database, input: PengaturanPresensi): Promise<void> {
  const { retensiFotoHari, ambangKemiripanWajah, descriptorOtomatisAktif, ...jamKerjaBagian } = input;
  await Promise.all([
    setSetting(db, "pengaturan_presensi", jamKerjaBagian),
    setSetting(db, "retensi_foto_hari", retensiFotoHari),
    setSetting(db, "ambang_kemiripan_wajah", ambangKemiripanWajah),
    setSetting(db, "descriptor_otomatis_aktif", descriptorOtomatisAktif),
  ]);
}

async function resolveJamKerjaEfektif(
  db: Database,
  guruId: string,
  hari: Hari,
  periodId: string,
  pengaturan: PengaturanPresensi,
): Promise<{ masuk: string; pulang: string } | null> {
  const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, guruId), columns: { hari_wajib_override: true } });
  if (guruRow?.hari_wajib_override) {
    const override = JSON.parse(guruRow.hari_wajib_override) as Hari[];
    if (!override.includes(hari)) return null;
  }

  const jamSekolah = pengaturan.jamKerja[hari] ?? null;

  if (pengaturan.modeJamMasuk === "jadwal_mengajar") {
    const perRombel = await getPertemuanUntukTanggal(db, periodId, hari);
    let earliest: string | null = null;
    for (const { pertemuan } of perRombel) {
      for (const p of pertemuan) {
        if (p.guruIds.includes(guruId) && (!earliest || p.slotMulai < earliest)) earliest = p.slotMulai;
      }
    }
    if (earliest) {
      return { masuk: subtractMinutes(earliest, pengaturan.offsetJadwalMengajarMenit), pulang: jamSekolah?.pulang ?? "15:00" };
    }
  }

  return jamSekolah;
}

export interface VerifikasiPinResult {
  ok: boolean;
  message?: string;
}

export async function verifikasiPin(db: Database, guruId: string, pin: string): Promise<VerifikasiPinResult> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!row || !row.pin_hash) return { ok: false, message: "PIN belum pernah diatur untuk guru ini." };

  const now = Date.now();
  if (row.pin_locked_until && new Date(row.pin_locked_until).getTime() > now) {
    return { ok: false, message: "PIN terkunci sementara karena terlalu sering salah. Coba lagi nanti." };
  }

  const valid = await verifyPassword(pin, {
    hash: row.pin_hash,
    salt: row.pin_salt!,
    iterations: row.pin_iterations!,
  });
  const nowIso = new Date(now).toISOString();

  if (!valid) {
    const attempts = row.pin_failed_attempts + 1;
    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await db
        .update(guru)
        .set({ pin_failed_attempts: 0, pin_locked_until: new Date(now + LOCKOUT_DURATION_MS).toISOString(), updated_at: nowIso })
        .where(eq(guru.id, guruId));
      return { ok: false, message: "PIN salah 5 kali. Terkunci 15 menit." };
    }
    await db.update(guru).set({ pin_failed_attempts: attempts, updated_at: nowIso }).where(eq(guru.id, guruId));
    return { ok: false, message: "PIN salah." };
  }

  await db.update(guru).set({ pin_failed_attempts: 0, pin_locked_until: null, updated_at: nowIso }).where(eq(guru.id, guruId));
  return { ok: true };
}

/** Dipanggil Admin atau pertama kali guru presensi via PIN default (tahun lahir). */
export async function pastikanPinAwal(db: Database, guruId: string): Promise<void> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!row) throw new HTTPException(404, { message: "Guru tidak ditemukan." });
  if (row.pin_hash) return;

  const tahunLahir = row.tanggal_lahir.slice(0, 4);
  const hash = await hashPassword(tahunLahir, DEFAULT_PBKDF2_ITERATIONS);
  await db
    .update(guru)
    .set({
      pin_hash: hash.hash,
      pin_salt: hash.salt,
      pin_iterations: hash.iterations,
      pin_is_default: true,
      updated_at: new Date().toISOString(),
    })
    .where(eq(guru.id, guruId));
}

export async function gantiPinSendiri(db: Database, guruId: string, pinLama: string, pinBaru: string): Promise<{ ok: boolean; message?: string }> {
  await pastikanPinAwal(db, guruId);
  const verifikasi = await verifikasiPin(db, guruId, pinLama);
  if (!verifikasi.ok) return verifikasi;

  const row = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!row) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const tahunLahir = row.tanggal_lahir.slice(0, 4);
  if (pinBaru === tahunLahir) {
    return { ok: false, message: "PIN baru tidak boleh sama dengan tahun lahir." };
  }

  const hash = await hashPassword(pinBaru, DEFAULT_PBKDF2_ITERATIONS);
  await db
    .update(guru)
    .set({
      pin_hash: hash.hash,
      pin_salt: hash.salt,
      pin_iterations: hash.iterations,
      pin_is_default: false,
      updated_at: new Date().toISOString(),
    })
    .where(eq(guru.id, guruId));

  return { ok: true };
}

export interface SubmitPresensiInput {
  guruId: string;
  jenis: PresensiJenis;
  metode: PresensiMetode;
  skorKemiripan: number | null;
  livenessLolos: boolean | null;
  kioskDeviceId: string | null;
  fotoFileId: string;
  sumber: PresensiSumber;
  waktuPerangkat: string | null;
  embeddingUntukBelajar: string | null;
}

export async function submitPresensi(db: Database, input: SubmitPresensiInput, periodId: string): Promise<{ id: string }> {
  const { tanggal, jam: waktu } = nowWib();
  const hari = getHariFromTanggal(tanggal);
  if (!hari) throw new HTTPException(400, { message: "Hari ini bukan hari sekolah." });

  if (input.jenis === "datang") {
    const existing = await db.query.presensiGuru.findFirst({
      where: and(eq(presensiGuru.guru_id, input.guruId), eq(presensiGuru.tanggal, tanggal), eq(presensiGuru.jenis, "datang")),
    });
    if (existing) {
      throw new HTTPException(400, { message: `Anda sudah presensi datang pukul ${existing.waktu}.` });
    }
  }

  const pengaturan = await getPengaturanPresensi(db);
  const jamKerja = await resolveJamKerjaEfektif(db, input.guruId, hari, periodId, pengaturan);
  if (!jamKerja) {
    throw new HTTPException(400, { message: "Anda tidak wajib presensi hari ini." });
  }

  const statusResult =
    input.jenis === "datang"
      ? computeStatusDatang(waktu, jamKerja.masuk, pengaturan.toleransiTerlambatMenit)
      : computeStatusPulang(waktu, jamKerja.pulang);

  const id = generateId();
  const now = new Date().toISOString();

  await db.batch([
    db.insert(presensiGuru).values({
      id,
      guru_id: input.guruId,
      tanggal,
      jenis: input.jenis,
      waktu,
      metode: input.metode,
      skor_kemiripan: input.skorKemiripan !== null ? Math.round(input.skorKemiripan * 1000) : null,
      liveness_lolos: input.livenessLolos,
      kiosk_device_id: input.kioskDeviceId,
      foto_file_id: input.fotoFileId,
      status: statusResult.status,
      sumber: input.sumber,
      waktu_perangkat: input.waktuPerangkat,
      created_at: now,
    }),
  ]);

  await upsertRekapHarian(db, input.guruId, tanggal, periodId);

  if (input.metode === "wajah" && input.livenessLolos && input.embeddingUntukBelajar) {
    await tambahDescriptorOtomatis(db, input.guruId, input.embeddingUntukBelajar);
  }

  return { id };
}

async function upsertRekapHarian(db: Database, guruId: string, tanggal: string, periodId: string): Promise<void> {
  const hari = getHariFromTanggal(tanggal);
  const pengaturan = await getPengaturanPresensi(db);
  const jamKerja = hari ? await resolveJamKerjaEfektif(db, guruId, hari, periodId, pengaturan) : null;

  const rows = await db.query.presensiGuru.findMany({
    where: and(eq(presensiGuru.guru_id, guruId), eq(presensiGuru.tanggal, tanggal)),
    orderBy: (t, { asc }) => [asc(t.created_at)],
  });
  const datangRow = rows.find((r) => r.jenis === "datang") ?? null;
  const pulangRows = rows.filter((r) => r.jenis === "pulang");
  const pulangRow = pulangRows.length > 0 ? pulangRows[pulangRows.length - 1]! : null;

  const datangResult = datangRow && jamKerja ? computeStatusDatang(datangRow.waktu, jamKerja.masuk, pengaturan.toleransiTerlambatMenit) : null;
  const pulangResult = pulangRow && jamKerja ? computeStatusPulang(pulangRow.waktu, jamKerja.pulang) : null;
  const status = computeStatusHarianPresensi(datangResult, pulangResult);

  const existing = await db.query.rekapPresensiGuruHarian.findFirst({
    where: and(eq(rekapPresensiGuruHarian.guru_id, guruId), eq(rekapPresensiGuruHarian.tanggal, tanggal)),
  });
  const now = new Date().toISOString();
  const values = {
    jam_datang: datangRow?.waktu ?? null,
    jam_pulang: pulangRow?.waktu ?? null,
    status,
    menit_terlambat: datangResult?.menitTerlambat ?? 0,
    menit_pulang_cepat: pulangResult?.menitPulangCepat ?? 0,
    metode_datang: datangRow?.metode ?? null,
    metode_pulang: pulangRow?.metode ?? null,
    updated_at: now,
  };

  if (existing) {
    await db.update(rekapPresensiGuruHarian).set(values).where(eq(rekapPresensiGuruHarian.id, existing.id));
  } else {
    await db.insert(rekapPresensiGuruHarian).values({ id: generateId(), guru_id: guruId, tanggal, ...values });
  }
}

export interface RekapHarianRow {
  guruId: string;
  guruNama: string;
  jamDatang: string | null;
  jamPulang: string | null;
  status: string;
  metodeDatang: string | null;
  metodePulang: string | null;
  fotoDatangUrl: string | null;
  fotoPulangUrl: string | null;
}

export async function getRekapHarianSemua(db: Database, tanggal: string): Promise<RekapHarianRow[]> {
  const rekapRows = await db
    .select({
      guruId: rekapPresensiGuruHarian.guru_id,
      guruNama: guru.nama_lengkap,
      jamDatang: rekapPresensiGuruHarian.jam_datang,
      jamPulang: rekapPresensiGuruHarian.jam_pulang,
      status: rekapPresensiGuruHarian.status,
      metodeDatang: rekapPresensiGuruHarian.metode_datang,
      metodePulang: rekapPresensiGuruHarian.metode_pulang,
    })
    .from(rekapPresensiGuruHarian)
    .innerJoin(guru, eq(rekapPresensiGuruHarian.guru_id, guru.id))
    .where(eq(rekapPresensiGuruHarian.tanggal, tanggal));

  const presensiRows = await db
    .select({ guruId: presensiGuru.guru_id, jenis: presensiGuru.jenis, fotoFileId: presensiGuru.foto_file_id, createdAt: presensiGuru.created_at })
    .from(presensiGuru)
    .where(eq(presensiGuru.tanggal, tanggal))
    .orderBy(desc(presensiGuru.created_at));

  const fotoByGuruJenis = new Map<string, string>();
  for (const r of presensiRows) {
    const key = `${r.guruId}|${r.jenis}`;
    if (r.fotoFileId && !fotoByGuruJenis.has(key)) fotoByGuruJenis.set(key, r.fotoFileId);
  }

  return rekapRows.map((r) => ({
    guruId: r.guruId,
    guruNama: r.guruNama,
    jamDatang: r.jamDatang,
    jamPulang: r.jamPulang,
    status: r.status,
    metodeDatang: r.metodeDatang,
    metodePulang: r.metodePulang,
    fotoDatangUrl: fotoByGuruJenis.has(`${r.guruId}|datang`) ? `/api/files/${fotoByGuruJenis.get(`${r.guruId}|datang`)}` : null,
    fotoPulangUrl: fotoByGuruJenis.has(`${r.guruId}|pulang`) ? `/api/files/${fotoByGuruJenis.get(`${r.guruId}|pulang`)}` : null,
  }));
}

export interface RekapBulananGuruRow {
  guruId: string;
  guruNama: string;
  cells: { tanggal: string; status: string; menitTerlambat: number; menitPulangCepat: number }[];
  totalHadir: number;
  totalTerlambat: number;
  totalMenitTerlambat: number;
  totalPulangCepat: number;
  totalTidakHadir: number;
  totalIzin: number;
}

export async function getRekapBulananGuru(db: Database, guruId: string, bulan: string): Promise<RekapBulananGuruRow | null> {
  const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!guruRow) return null;

  const tanggalAwal = `${bulan}-01`;
  const tanggalAkhir = `${bulan}-31`;
  const rows = await db
    .select()
    .from(rekapPresensiGuruHarian)
    .where(
      and(
        eq(rekapPresensiGuruHarian.guru_id, guruId),
        sql`${rekapPresensiGuruHarian.tanggal} >= ${tanggalAwal}`,
        sql`${rekapPresensiGuruHarian.tanggal} <= ${tanggalAkhir}`,
      ),
    )
    .orderBy(rekapPresensiGuruHarian.tanggal);

  const cells = rows.map((r) => ({
    tanggal: r.tanggal,
    status: r.status,
    menitTerlambat: r.menit_terlambat,
    menitPulangCepat: r.menit_pulang_cepat,
  }));

  return {
    guruId,
    guruNama: guruRow.nama_lengkap,
    cells,
    totalHadir: rows.filter((r) => r.status === "tepat_waktu").length,
    totalTerlambat: rows.filter((r) => r.status === "terlambat").length,
    totalMenitTerlambat: rows.reduce((s, r) => s + r.menit_terlambat, 0),
    totalPulangCepat: rows.filter((r) => r.status === "pulang_cepat").length,
    totalTidakHadir: rows.filter((r) => r.status === "tidak_hadir").length,
    totalIzin: rows.filter((r) => ["izin", "sakit", "dinas_luar", "cuti"].includes(r.status)).length,
  };
}

export async function getRekapBulananSemuaGuru(db: Database, bulan: string): Promise<RekapBulananGuruRow[]> {
  const guruRows = await db.query.guru.findMany({ where: eq(guru.is_active, true) });
  const results: RekapBulananGuruRow[] = [];
  for (const g of guruRows) {
    const rekap = await getRekapBulananGuru(db, g.id, bulan);
    if (rekap) results.push(rekap);
  }
  return results;
}

/** Backfill harian (dipanggil cron): tandai guru tanpa presensi & tanpa izin sebagai tidak_hadir. */
export async function backfillTidakHadir(db: Database, tanggal: string, periodId: string): Promise<number> {
  const hari = getHariFromTanggal(tanggal);
  if (!hari) return 0;

  const pengaturan = await getPengaturanPresensi(db);
  const guruRows = await db.query.guru.findMany({ where: eq(guru.is_active, true) });
  const existingRekap = await db.query.rekapPresensiGuruHarian.findMany({ where: eq(rekapPresensiGuruHarian.tanggal, tanggal) });
  const existingGuruIds = new Set(existingRekap.map((r) => r.guru_id));

  const izinRows = await db.query.izinGuru.findMany({
    where: and(sql`${izinGuru.tanggal_mulai} <= ${tanggal}`, sql`${izinGuru.tanggal_selesai} >= ${tanggal}`, eq(izinGuru.status, "disetujui")),
  });
  const izinByGuru = new Map(izinRows.map((r) => [r.guru_id, r.jenis]));

  const now = new Date().toISOString();
  const rowsToInsert: { guruId: string; status: RekapPresensiStatus }[] = [];

  for (const g of guruRows) {
    if (existingGuruIds.has(g.id)) continue;
    const jamKerja = await resolveJamKerjaEfektif(db, g.id, hari, periodId, pengaturan);
    if (!jamKerja) continue;
    rowsToInsert.push({ guruId: g.id, status: izinByGuru.get(g.id) ?? "tidak_hadir" });
  }
  if (rowsToInsert.length === 0) return 0;

  const [first, ...rest] = rowsToInsert.map((r) =>
    db.insert(rekapPresensiGuruHarian).values({
      id: generateId(),
      guru_id: r.guruId,
      tanggal,
      status: r.status,
      menit_terlambat: 0,
      menit_pulang_cepat: 0,
      updated_at: now,
    }),
  );
  await db.batch([first!, ...rest]);

  return rowsToInsert.length;
}
