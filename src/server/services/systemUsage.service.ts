import { isNull, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import type { Database } from "../db/client";
import {
  users,
  roles,
  academicPeriods,
  activityLogs,
  activityLogArchives,
  files,
} from "../db/schema";

export interface TableUsage {
  table: string;
  label: string;
  rowCount: number;
}

export interface FilePrefixUsage {
  prefix: string;
  fileCount: number;
  totalBytes: number;
}

export interface SystemUsage {
  tables: TableUsage[];
  filesByPrefix: FilePrefixUsage[];
}

async function countRows(db: Database, table: SQLiteTable): Promise<number> {
  const row = await db.select({ count: sql<number>`COUNT(*)` }).from(table);
  return Number(row[0]?.count ?? 0);
}

/**
 * Jumlah baris per tabel utama + ukuran R2 per prefix — dihitung dari tabel
 * `files` (metadata), BUKAN dengan me-list bucket R2 (hemat request & CPU).
 */
export async function getSystemUsage(db: Database): Promise<SystemUsage> {
  const [usersCount, rolesCount, periodsCount, logsCount, archivesCount, filesCount] =
    await Promise.all([
      countRows(db, users),
      countRows(db, roles),
      countRows(db, academicPeriods),
      countRows(db, activityLogs),
      countRows(db, activityLogArchives),
      countRows(db, files),
    ]);

  const prefixRows = await db
    .select({
      prefix: files.prefix,
      totalBytes: sql<number>`COALESCE(SUM(${files.size_bytes}), 0)`,
      fileCount: sql<number>`COUNT(*)`,
    })
    .from(files)
    .where(isNull(files.deleted_at))
    .groupBy(files.prefix);

  return {
    tables: [
      { table: "users", label: "Pengguna", rowCount: usersCount },
      { table: "roles", label: "Role", rowCount: rolesCount },
      { table: "academic_periods", label: "Tahun Ajaran", rowCount: periodsCount },
      { table: "activity_logs", label: "Log Aktivitas (aktif)", rowCount: logsCount },
      { table: "activity_log_archives", label: "Arsip Log", rowCount: archivesCount },
      { table: "files", label: "File Terunggah", rowCount: filesCount },
    ],
    filesByPrefix: prefixRows.map((r) => ({
      prefix: r.prefix,
      fileCount: Number(r.fileCount),
      totalBytes: Number(r.totalBytes),
    })),
  };
}
