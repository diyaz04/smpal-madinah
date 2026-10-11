import type { Database } from "../db/client";
import { activityLogs } from "../db/schema";
import { generateId } from "../lib/id";
import type { ActivityAction } from "../../shared/constants";

export interface LogActivityInput {
  userId: string | null;
  usernameSnapshot: string | null;
  moduleKey: string;
  action: ActivityAction;
  recordId?: string | null;
  /** Data sebelum & sesudah — hanya kolom yang berubah yang disimpan (diff). */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export type FieldDiff = Record<string, { before: unknown; after: unknown }>;

export function diffChangedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): FieldDiff | null {
  if (!before && !after) return null;
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const result: FieldDiff = {};
  for (const key of keys) {
    const beforeValue = before?.[key] ?? null;
    const afterValue = after?.[key] ?? null;
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      result[key] = { before: beforeValue, after: afterValue };
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export async function logActivity(db: Database, input: LogActivityInput): Promise<void> {
  const changes = diffChangedFields(input.before, input.after);
  await db.insert(activityLogs).values({
    id: generateId(),
    created_at: new Date().toISOString(),
    user_id: input.userId,
    username_snapshot: input.usernameSnapshot,
    module_key: input.moduleKey,
    action: input.action,
    record_id: input.recordId ?? null,
    changes: changes ? JSON.stringify(changes) : null,
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });
}
