import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { rolePermissions, userRoles, settings } from "../db/schema";
import type { PermissionAction, PermissionScope } from "../../shared/constants";
import type { EffectivePermissions } from "../../shared/types";

export type { EffectivePermissions } from "../../shared/types";

const ROLES_VERSION_KEY = "roles_version";
const ROLES_VERSION_TTL_MS = 5_000;
const PERMISSION_CACHE_TTL_MS = 60_000;

// Cache per-isolate (module-level, bertahan selama isolate Worker hidup).
let rolesVersionCache: { value: number; expiresAt: number } | null = null;
const permissionCache = new Map<
  string,
  { permissions: EffectivePermissions; rolesVersion: number; expiresAt: number }
>();

async function getRolesVersionCached(db: Database): Promise<number> {
  const now = Date.now();
  if (rolesVersionCache && rolesVersionCache.expiresAt > now) {
    return rolesVersionCache.value;
  }
  const row = await db.query.settings.findFirst({ where: eq(settings.key, ROLES_VERSION_KEY) });
  const value = row ? (JSON.parse(row.value) as number) : 1;
  rolesVersionCache = { value, expiresAt: now + ROLES_VERSION_TTL_MS };
  return value;
}

/**
 * Dipanggil setelah role/izin role diubah (Manajemen Fitur) supaya cache izin
 * semua user di-refresh dalam hitungan detik, bukan menunggu TTL 60s penuh.
 */
export async function bumpRolesVersion(db: Database): Promise<void> {
  const current = await getRolesVersionCached(db);
  const next = current + 1;
  await db
    .update(settings)
    .set({ value: JSON.stringify(next), updated_at: new Date().toISOString() })
    .where(eq(settings.key, ROLES_VERSION_KEY));
  rolesVersionCache = { value: next, expiresAt: Date.now() + ROLES_VERSION_TTL_MS };
}

function isBroaderScope(candidate: PermissionScope, current: PermissionScope): boolean {
  return candidate === "semua" && current !== "semua";
}

async function computeEffectivePermissions(
  db: Database,
  userId: string,
): Promise<EffectivePermissions> {
  const rows = await db
    .select({
      moduleKey: rolePermissions.module_key,
      action: rolePermissions.action,
      scope: rolePermissions.scope,
    })
    .from(rolePermissions)
    .innerJoin(userRoles, eq(rolePermissions.role_id, userRoles.role_id))
    .where(eq(userRoles.user_id, userId));

  const grants: EffectivePermissions["grants"] = {};
  for (const row of rows) {
    const moduleGrants = (grants[row.moduleKey] ??= {});
    const existing = moduleGrants[row.action];
    if (!existing || isBroaderScope(row.scope, existing)) {
      moduleGrants[row.action] = row.scope;
    }
  }
  return { grants };
}

export async function getEffectivePermissions(
  db: Database,
  userId: string,
): Promise<EffectivePermissions> {
  const now = Date.now();
  const rolesVersion = await getRolesVersionCached(db);
  const cached = permissionCache.get(userId);
  if (cached && cached.rolesVersion === rolesVersion && cached.expiresAt > now) {
    return cached.permissions;
  }
  const computed = await computeEffectivePermissions(db, userId);
  permissionCache.set(userId, {
    permissions: computed,
    rolesVersion,
    expiresAt: now + PERMISSION_CACHE_TTL_MS,
  });
  return computed;
}

export function canAccess(
  permissions: EffectivePermissions,
  moduleKey: string,
  action: PermissionAction,
): PermissionScope | null {
  return permissions.grants[moduleKey]?.[action] ?? null;
}

export function hasAnyAccessToModule(permissions: EffectivePermissions, moduleKey: string): boolean {
  return Object.keys(permissions.grants[moduleKey] ?? {}).length > 0;
}
