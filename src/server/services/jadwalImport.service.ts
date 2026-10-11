import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "../db/client";
import { mapel, rombel, guru, jadwalVersi, jadwalSlot, jadwalIsi, jadwalIsiGuru, jadwalPiket } from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import type { MatchImportRequest, CommitImportInput } from "../../shared/schemas/jadwalImport.schema";
import type { JadwalImportMatchResult, JadwalImportWarning } from "../../shared/types";
import type { Hari } from "../../shared/constants";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findClosest(target: string, candidates: { id: string; label: string }[]): string | null {
  const normTarget = normalize(target);
  if (!normTarget) return null;
  let best: { label: string; score: number } | null = null;
  for (const c of candidates) {
    const normLabel = normalize(c.label);
    if (!normLabel) continue;
    let score = 0;
    if (normLabel === normTarget) score = 100;
    else if (normLabel.startsWith(normTarget) || normTarget.startsWith(normLabel)) score = 70;
    else if (normLabel.includes(normTarget) || normTarget.includes(normLabel)) score = 50;
    if (score > 0 && (!best || score > best.score)) best = { label: c.label, score };
  }
  return best ? best.label : null;
}

export async function matchImportData(
  db: Database,
  input: MatchImportRequest,
  periodId: string,
): Promise<JadwalImportMatchResult> {
  const mapelRows = await db.query.mapel.findMany({ where: and(isNull(mapel.deleted_at), eq(mapel.is_active, true)) });
  const mapelByCode = new Map<string, string>();
  for (const m of mapelRows) {
    mapelByCode.set(normalize(m.kode_jadwal), m.id);
    const aliases = JSON.parse(m.alias_kode) as string[];
    for (const a of aliases) mapelByCode.set(normalize(a), m.id);
  }
  const mapelCandidates = mapelRows.map((m) => ({ id: m.id, label: m.kode_jadwal }));

  const rombelRows = await db.query.rombel.findMany({ where: and(eq(rombel.period_id, periodId), isNull(rombel.deleted_at)) });
  const rombelByNama = new Map(rombelRows.map((r) => [normalize(r.nama), r.id]));

  const guruRows = await db.query.guru.findMany({ where: and(isNull(guru.deleted_at), eq(guru.is_active, true)) });
  const aliasRows = await db.query.guruAlias.findMany();
  const guruByNama = new Map<string, string>();
  for (const g of guruRows) {
    guruByNama.set(normalize(g.nama_lengkap), g.id);
    guruByNama.set(normalize(g.nama_tanpa_gelar), g.id);
  }
  for (const a of aliasRows) guruByNama.set(normalize(a.alias_nama), a.guru_id);
  const guruCandidates = guruRows.map((g) => ({ id: g.id, label: g.nama_tanpa_gelar }));

  return {
    mapel: input.mapelCodes.map((kodeAsli) => {
      const matchedMapelId = mapelByCode.get(normalize(kodeAsli)) ?? null;
      return {
        kodeAsli,
        matchedMapelId,
        suggestion: matchedMapelId ? null : findClosest(kodeAsli, mapelCandidates),
      };
    }),
    rombel: input.rombelNames.map((namaAsli) => ({
      namaAsli,
      matchedRombelId: rombelByNama.get(normalize(namaAsli)) ?? null,
    })),
    guru: input.guruNames.map((namaAsli) => {
      const matchedGuruId = guruByNama.get(normalize(namaAsli)) ?? null;
      return {
        namaAsli,
        matchedGuruId,
        suggestion: matchedGuruId ? null : findClosest(namaAsli, guruCandidates),
      };
    }),
  };
}

export async function commitImport(
  db: Database,
  periodId: string,
  input: CommitImportInput,
): Promise<{ versiId: string; slotCount: number; isiCount: number; warnings: JadwalImportWarning[] }> {
  const now = new Date().toISOString();
  const warnings: JadwalImportWarning[] = [];

  const versiId = generateId();
  await db.insert(jadwalVersi).values({
    id: versiId,
    period_id: periodId,
    nama: input.versiName,
    status: "draf",
    tanggal_mulai_berlaku: null,
    created_at: now,
    updated_at: now,
  });

  // Dedupe slot waktu (banyak baris entries bisa berbagi hari+jam yang sama).
  const slotKey = (e: { hari: Hari; jamMulai: string; jamSelesai: string; jamKe: number | null; jenisSlot: string }) =>
    `${e.hari}|${e.jamMulai}|${e.jamSelesai}|${e.jamKe ?? ""}|${e.jenisSlot}`;
  const slotMap = new Map<string, { id: string; hari: Hari; jamMulai: string; jamSelesai: string; jamKe: number | null; jenisSlot: (typeof input.entries)[number]["jenisSlot"] }>();
  for (const e of input.entries) {
    const key = slotKey(e);
    if (slotMap.has(key)) continue;
    slotMap.set(key, { id: generateId(), hari: e.hari, jamMulai: e.jamMulai, jamSelesai: e.jamSelesai, jamKe: e.jamKe, jenisSlot: e.jenisSlot });
  }

  const slotRows = [...slotMap.values()].map((s) => ({
    id: s.id,
    jadwal_versi_id: versiId,
    hari: s.hari,
    urutan: 0,
    jam_mulai: s.jamMulai,
    jam_selesai: s.jamSelesai,
    jam_ke: s.jamKe,
    jenis_slot: s.jenisSlot,
    created_at: now,
    updated_at: now,
  }));
  // urutan dihitung ulang per hari berdasarkan jam mulai supaya konsisten.
  const byHari = new Map<Hari, typeof slotRows>();
  for (const s of slotRows) {
    const arr = byHari.get(s.hari as Hari) ?? [];
    arr.push(s);
    byHari.set(s.hari as Hari, arr);
  }
  for (const [, arr] of byHari) {
    arr.sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
    arr.forEach((s, i) => (s.urutan = i + 1));
  }

  if (slotRows.length > 0) {
    const chunks = chunkArray(slotRows, 40);
    await db.batch([
      db.insert(jadwalSlot).values(chunks[0]!),
      ...chunks.slice(1).map((chunk) => db.insert(jadwalSlot).values(chunk)),
    ]);
  }

  // jadwal_isi + jadwal_isi_guru hanya untuk entri kbm/kegiatan dengan rombel yang berhasil dicocokkan.
  const isiRows: (typeof jadwalIsi.$inferInsert)[] = [];
  const isiGuruRows: (typeof jadwalIsiGuru.$inferInsert)[] = [];
  const guruAtSlotRombel = new Map<string, string>();

  for (const e of input.entries) {
    if (e.jenisSlot !== "kbm" && e.jenisSlot !== "kegiatan") continue;
    if (!e.rombelId) {
      warnings.push({ level: "warning", message: `Baris untuk "${e.keterangan || "(tanpa nama)"}" dilewati karena rombel tidak dikenali.`, hari: e.hari });
      continue;
    }
    const slot = slotMap.get(slotKey(e));
    if (!slot) continue;

    const isiId = generateId();
    isiRows.push({
      id: isiId,
      jadwal_slot_id: slot.id,
      rombel_id: e.rombelId,
      mapel_id: e.mapelId,
      keterangan: e.keterangan || null,
      created_at: now,
      updated_at: now,
    });
    for (const guruId of e.guruIds) {
      isiGuruRows.push({ id: generateId(), jadwal_isi_id: isiId, guru_id: guruId, created_at: now });

      const conflictKey = `${slot.id}|${guruId}`;
      const existingRombelId = guruAtSlotRombel.get(conflictKey);
      if (existingRombelId && existingRombelId !== e.rombelId) {
        warnings.push({
          level: "warning",
          message: `Guru mengajar di lebih dari satu rombel pada ${e.hari} ${e.jamMulai}–${e.jamSelesai}. Periksa kembali di editor jadwal.`,
          hari: e.hari,
        });
      }
      guruAtSlotRombel.set(conflictKey, e.rombelId);
    }
  }

  if (isiRows.length > 0) {
    const chunks = chunkArray(isiRows, 40);
    await db.batch([
      db.insert(jadwalIsi).values(chunks[0]!),
      ...chunks.slice(1).map((chunk) => db.insert(jadwalIsi).values(chunk)),
    ]);
  }
  if (isiGuruRows.length > 0) {
    const chunks = chunkArray(isiGuruRows, 60);
    await db.batch([
      db.insert(jadwalIsiGuru).values(chunks[0]!),
      ...chunks.slice(1).map((chunk) => db.insert(jadwalIsiGuru).values(chunk)),
    ]);
  }

  const piketRows = input.piket.flatMap((p) =>
    p.guruIds.map((guruId) => ({
      id: generateId(),
      jadwal_versi_id: versiId,
      hari: p.hari,
      guru_id: guruId,
      created_at: now,
    })),
  );
  if (piketRows.length > 0) {
    const chunks = chunkArray(piketRows, 60);
    await db.batch([
      db.insert(jadwalPiket).values(chunks[0]!),
      ...chunks.slice(1).map((chunk) => db.insert(jadwalPiket).values(chunk)),
    ]);
  }

  return { versiId, slotCount: slotRows.length, isiCount: isiRows.length, warnings };
}
