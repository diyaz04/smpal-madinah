import { and, eq, asc, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { roles, rolePermissions, userRoles, users } from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import { bumpRolesVersion } from "./permission.service";

// role_permissions punya 7 kolom; D1 membatasi ~100 bound variable/statement,
// jadi insert banyak baris dipecah per 10 baris (70 variable) lalu dikirim
// sekaligus lewat db.batch() — lihat src/server/lib/chunk.ts.
const ROLE_PERMISSIONS_INSERT_CHUNK_SIZE = 10;
import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "../../shared/schemas/role.schema";
import type { RoleListItem, RoleDetail, RolePermissionEntry } from "../../shared/types";

export async function listRoles(db: Database): Promise<RoleListItem[]> {
  const [roleRows, countRows] = await Promise.all([
    db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        isLocked: roles.is_locked,
        isSystem: roles.is_system,
      })
      .from(roles)
      .orderBy(asc(roles.name)),
    db
      .select({ roleId: userRoles.role_id, count: sql<number>`COUNT(*)` })
      .from(userRoles)
      .groupBy(userRoles.role_id),
  ]);

  const countByRole = new Map(countRows.map((r) => [r.roleId, Number(r.count)]));
  return roleRows.map((r) => ({ ...r, userCount: countByRole.get(r.id) ?? 0 }));
}

export async function getRoleDetail(db: Database, roleId: string): Promise<RoleDetail | null> {
  const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
  if (!role) return null;

  const permissionRows = await db
    .select({ moduleKey: rolePermissions.module_key, action: rolePermissions.action, scope: rolePermissions.scope })
    .from(rolePermissions)
    .where(eq(rolePermissions.role_id, roleId));

  const userCountRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userRoles)
    .where(eq(userRoles.role_id, roleId));

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isLocked: role.is_locked,
    isSystem: role.is_system,
    userCount: Number(userCountRow[0]?.count ?? 0),
    permissions: permissionRows as RolePermissionEntry[],
  };
}

interface RolePermissionRow {
  id: string;
  role_id: string;
  module_key: string;
  action: RolePermissionEntry["action"];
  scope: RolePermissionEntry["scope"];
  created_at: string;
  updated_at: string;
}

async function insertRolePermissionsChunked(db: Database, rows: RolePermissionRow[]): Promise<void> {
  const chunks = chunkArray(rows, ROLE_PERMISSIONS_INSERT_CHUNK_SIZE);
  if (chunks.length === 0) return;
  const [first, ...rest] = chunks;
  await db.batch([
    db.insert(rolePermissions).values(first!),
    ...rest.map((chunk) => db.insert(rolePermissions).values(chunk)),
  ]);
}

/**
 * Hapus semua izin lama role ini dan tulis ulang dengan yang baru, dalam SATU
 * db.batch() (= satu transaksi implisit D1) — supaya kalau insert gagal
 * (mis. kena limit variable), delete-nya ikut dibatalkan juga. Sebelumnya
 * delete & insert dipanggil terpisah dan insert yang gagal membuat role
 * kehilangan semua izinnya (lihat DECISIONS.md).
 */
async function replaceRolePermissions(
  db: Database,
  roleId: string,
  rows: RolePermissionRow[],
): Promise<void> {
  const chunks = chunkArray(rows, ROLE_PERMISSIONS_INSERT_CHUNK_SIZE);
  const deleteStmt = db.delete(rolePermissions).where(eq(rolePermissions.role_id, roleId));
  if (chunks.length === 0) {
    await deleteStmt;
    return;
  }
  await db.batch([deleteStmt, ...chunks.map((chunk) => db.insert(rolePermissions).values(chunk))]);
}

async function assertNameAvailable(db: Database, name: string, excludeRoleId?: string) {
  const existing = await db.query.roles.findFirst({ where: eq(roles.name, name) });
  if (existing && existing.id !== excludeRoleId) {
    throw new HTTPException(409, { message: "Nama role sudah dipakai." });
  }
}

export async function createRole(db: Database, input: CreateRoleInput): Promise<RoleDetail> {
  await assertNameAvailable(db, input.name);
  const now = new Date().toISOString();
  const roleId = generateId();

  await db.insert(roles).values({
    id: roleId,
    name: input.name,
    description: input.description || null,
    is_locked: false,
    is_system: false,
    created_at: now,
    updated_at: now,
  });

  return (await getRoleDetail(db, roleId))!;
}

async function assertNotLocked(db: Database, roleId: string): Promise<typeof roles.$inferSelect> {
  const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
  if (!role) throw new HTTPException(404, { message: "Role tidak ditemukan." });
  if (role.is_locked) {
    throw new HTTPException(400, { message: "Role Admin terkunci dan tidak bisa diubah." });
  }
  return role;
}

export async function updateRole(
  db: Database,
  roleId: string,
  input: UpdateRoleInput,
): Promise<RoleDetail> {
  await assertNotLocked(db, roleId);
  await assertNameAvailable(db, input.name, roleId);

  await db
    .update(roles)
    .set({ name: input.name, description: input.description || null, updated_at: new Date().toISOString() })
    .where(eq(roles.id, roleId));

  return (await getRoleDetail(db, roleId))!;
}

export async function deleteRole(db: Database, roleId: string): Promise<void> {
  await assertNotLocked(db, roleId);

  const userCountRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userRoles)
    .where(eq(userRoles.role_id, roleId));
  if (Number(userCountRow[0]?.count ?? 0) > 0) {
    throw new HTTPException(400, {
      message: "Role masih dipakai oleh user. Pindahkan user-nya terlebih dahulu.",
    });
  }

  await db
    .update(roles)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(roles.id, roleId));
  await db.delete(rolePermissions).where(eq(rolePermissions.role_id, roleId));
}

export async function duplicateRole(
  db: Database,
  sourceRoleId: string,
  newName: string,
): Promise<RoleDetail> {
  const source = await getRoleDetail(db, sourceRoleId);
  if (!source) throw new HTTPException(404, { message: "Role sumber tidak ditemukan." });
  await assertNameAvailable(db, newName);

  const now = new Date().toISOString();
  const newRoleId = generateId();
  await db.insert(roles).values({
    id: newRoleId,
    name: newName,
    description: source.description,
    is_locked: false,
    is_system: false,
    created_at: now,
    updated_at: now,
  });

  await insertRolePermissionsChunked(
    db,
    source.permissions.map((p) => ({
      id: generateId(),
      role_id: newRoleId,
      module_key: p.moduleKey,
      action: p.action,
      scope: p.scope,
      created_at: now,
      updated_at: now,
    })),
  );

  return (await getRoleDetail(db, newRoleId))!;
}

export async function updateRolePermissions(
  db: Database,
  roleId: string,
  input: UpdateRolePermissionsInput,
): Promise<RoleDetail> {
  await assertNotLocked(db, roleId);

  const now = new Date().toISOString();
  await replaceRolePermissions(
    db,
    roleId,
    input.permissions.map((p) => ({
      id: generateId(),
      role_id: roleId,
      module_key: p.moduleKey,
      action: p.action,
      scope: p.scope,
      created_at: now,
      updated_at: now,
    })),
  );

  await bumpRolesVersion(db);
  return (await getRoleDetail(db, roleId))!;
}

export interface RoleUserRef {
  id: string;
  fullName: string;
  username: string;
}

export async function listUsersForRole(db: Database, roleId: string): Promise<RoleUserRef[]> {
  return db
    .select({ id: users.id, fullName: users.full_name, username: users.username })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.user_id, users.id))
    .where(and(eq(userRoles.role_id, roleId)))
    .orderBy(asc(users.full_name));
}
