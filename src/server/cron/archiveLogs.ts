import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { activityLogs, activityLogArchives } from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import { getSetting } from "../services/settings.service";

const BATCH_SIZE = 200;
const MAX_PAGES_PER_RUN = 20;
const CAPACITY_PER_RUN = BATCH_SIZE * MAX_PAGES_PER_RUN; // 4000 baris
const DEFAULT_RETENTION_DAYS = 180;
const DELETE_CHUNK_SIZE = 50; // batas aman variable D1 untuk IN (...)

export interface ArchiveResult {
  archived: boolean;
  yearMonth?: string;
  rowCount?: number;
  reason?: string;
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Mengarsipkan SATU bulan log tertua yang sudah lewat masa retensi ke R2
 * (gzip JSON), lalu menghapusnya dari D1. Dipanggil oleh Cron Trigger harian.
 *
 * Asumsi penyederhanaan (lihat DECISIONS.md): bulan hanya diarsipkan kalau
 * seluruh isinya (≤ 4000 baris) habis terbaca dalam SATU kali jalan, supaya
 * tetap di bawah batas 50 subrequest/invocation Free plan. Bulan yang lebih
 * besar dari itu dilewati dan dicoba lagi keesokan harinya — kasus yang
 * realistis sangat jarang terjadi untuk skala data satu sekolah.
 */
export async function runLogArchival(db: Database, bucket: R2Bucket): Promise<ArchiveResult> {
  const retentionDays =
    (await getSetting<number>(db, "activity_log_retention_days")) ?? DEFAULT_RETENTION_DAYS;
  const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const oldest = await db.query.activityLogs.findFirst({
    where: lt(activityLogs.created_at, cutoffIso),
    orderBy: [asc(activityLogs.created_at)],
  });
  if (!oldest) return { archived: false, reason: "no_logs_past_retention" };

  const yearMonth = oldest.created_at.slice(0, 7); // "2026-10"
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-indexed

  const monthStartIso = `${yearMonth}-01T00:00:00.000Z`;
  // Date.UTC bulan 0-indexed, jadi `month` (1-indexed) di sini tepat jadi bulan berikutnya.
  const nextMonthStartIso = new Date(Date.UTC(year, month, 1)).toISOString();
  const upperBoundIso = nextMonthStartIso < cutoffIso ? nextMonthStartIso : cutoffIso;

  const alreadyArchived = await db.query.activityLogArchives.findFirst({
    where: eq(activityLogArchives.year_month, yearMonth),
  });
  if (alreadyArchived) {
    // Seharusnya tidak terjadi (baris yang sudah diarsipkan ikut terhapus),
    // tapi dijaga supaya tidak menimpa arsip yang sama kalau cron sempat
    // berjalan dobel.
    return { archived: false, reason: "already_archived" };
  }

  const countRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(activityLogs)
    .where(and(gte(activityLogs.created_at, monthStartIso), lt(activityLogs.created_at, upperBoundIso)));
  const total = Number(countRow[0]?.count ?? 0);

  if (total === 0) return { archived: false, reason: "empty_range" };
  if (total > CAPACITY_PER_RUN) {
    console.warn(
      `[archiveLogs] Bulan ${yearMonth} punya ${total} baris, melebihi kapasitas satu run ` +
        `(${CAPACITY_PER_RUN}). Dilewati, akan dicoba lagi pada run berikutnya.`,
    );
    return { archived: false, reason: "capacity_exceeded" };
  }

  const rows = await db
    .select()
    .from(activityLogs)
    .where(and(gte(activityLogs.created_at, monthStartIso), lt(activityLogs.created_at, upperBoundIso)))
    .orderBy(asc(activityLogs.created_at));

  const payload = rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    userId: r.user_id,
    usernameSnapshot: r.username_snapshot,
    moduleKey: r.module_key,
    action: r.action,
    recordId: r.record_id,
    changes: r.changes ? JSON.parse(r.changes) : null,
    ip: r.ip,
    userAgent: r.user_agent,
  }));

  const compressed = await gzip(JSON.stringify(payload));
  const r2Key = `arsip-log/${yearMonth}.json.gz`;
  await bucket.put(r2Key, compressed, { httpMetadata: { contentType: "application/gzip" } });

  const now = new Date().toISOString();
  const ids = rows.map((r) => r.id);
  const deleteChunks = chunkArray(ids, DELETE_CHUNK_SIZE);

  await db.batch([
    db.insert(activityLogArchives).values({
      id: generateId(),
      year_month: yearMonth,
      r2_key: r2Key,
      row_count: rows.length,
      size_bytes: compressed.byteLength,
      created_at: now,
    }),
    ...deleteChunks.map((chunk) => db.delete(activityLogs).where(inArray(activityLogs.id, chunk))),
  ]);

  return { archived: true, yearMonth, rowCount: rows.length };
}
