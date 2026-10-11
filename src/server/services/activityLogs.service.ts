import { and, desc, eq, gte, lt, lte, or } from "drizzle-orm";

import type { Database } from "../db/client";
import { activityLogs, activityLogArchives } from "../db/schema";
import {
  normalizeCursorLimit,
  buildCursorResult,
  decodeCursor,
  type CursorPaginatedResult,
} from "../lib/paginate";
import type { ActivityAction } from "../../shared/constants";
import type { ActivityLogListItem, ActivityLogDetail, ActivityLogArchiveItem } from "../../shared/types";

export interface ActivityLogQuery {
  cursor?: string;
  limit?: number;
  userId?: string;
  moduleKey?: string;
  action?: ActivityAction;
  dateFrom?: string;
  dateTo?: string;
}

export async function listActivityLogs(
  db: Database,
  query: ActivityLogQuery,
): Promise<CursorPaginatedResult<ActivityLogListItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions = [];

  if (query.userId) conditions.push(eq(activityLogs.user_id, query.userId));
  if (query.moduleKey) conditions.push(eq(activityLogs.module_key, query.moduleKey));
  if (query.action) conditions.push(eq(activityLogs.action, query.action));
  if (query.dateFrom) conditions.push(gte(activityLogs.created_at, query.dateFrom));
  if (query.dateTo) conditions.push(lte(activityLogs.created_at, query.dateTo));

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(activityLogs.created_at, decoded.createdAt),
          and(eq(activityLogs.created_at, decoded.createdAt), lt(activityLogs.id, decoded.id)),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: activityLogs.id,
      created_at: activityLogs.created_at,
      user_id: activityLogs.user_id,
      username_snapshot: activityLogs.username_snapshot,
      module_key: activityLogs.module_key,
      action: activityLogs.action,
      record_id: activityLogs.record_id,
    })
    .from(activityLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activityLogs.created_at), desc(activityLogs.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(rows, limit);

  return {
    nextCursor,
    items: items.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      userId: r.user_id,
      usernameSnapshot: r.username_snapshot,
      moduleKey: r.module_key,
      action: r.action,
      recordId: r.record_id,
    })),
  };
}

export async function getActivityLogDetail(
  db: Database,
  id: string,
): Promise<ActivityLogDetail | null> {
  const row = await db.query.activityLogs.findFirst({ where: eq(activityLogs.id, id) });
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    usernameSnapshot: row.username_snapshot,
    moduleKey: row.module_key,
    action: row.action,
    recordId: row.record_id,
    changes: row.changes ? JSON.parse(row.changes) : null,
    ip: row.ip,
    userAgent: row.user_agent,
  };
}

export async function listActivityLogArchives(db: Database): Promise<ActivityLogArchiveItem[]> {
  const rows = await db.query.activityLogArchives.findMany({
    orderBy: [desc(activityLogArchives.year_month)],
  });
  return rows.map((r) => ({
    id: r.id,
    yearMonth: r.year_month,
    rowCount: r.row_count,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  }));
}

export async function getActivityLogArchive(db: Database, id: string) {
  return db.query.activityLogArchives.findFirst({ where: eq(activityLogArchives.id, id) });
}
