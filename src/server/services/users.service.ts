import { and, asc, eq, inArray, isNull, like, ne, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { users, roles, userRoles } from "../db/schema";
import { generateId } from "../lib/id";
import { paginate, type OffsetPaginatedResult } from "../lib/paginate";
import { hashPassword, generateTempPassword, DEFAULT_PBKDF2_ITERATIONS } from "../lib/pbkdf2";
import { nullIfEmpty } from "../lib/text";
import { revokeAllSessionsForUser } from "./session.service";
import { SYSTEM_ROLE_NAMES } from "../../shared/constants";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "../../shared/schemas/user.schema";
import type { RoleRef, UserListItem, UserDetail } from "../../shared/types";

export type { RoleRef, UserListItem, UserDetail } from "../../shared/types";

async function getRolesForUsers(db: Database, userIds: string[]): Promise<Map<string, RoleRef[]>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ userId: userRoles.user_id, roleId: roles.id, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(inArray(userRoles.user_id, userIds));

  const map = new Map<string, RoleRef[]>();
  for (const row of rows) {
    const list = map.get(row.userId) ?? [];
    list.push({ id: row.roleId, name: row.roleName });
    map.set(row.userId, list);
  }
  return map;
}

export async function listActiveRoles(db: Database): Promise<RoleRef[]> {
  const rows = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(isNull(roles.deleted_at))
    .orderBy(asc(roles.name));
  return rows;
}

export async function listUsers(
  db: Database,
  query: UserListQuery,
): Promise<OffsetPaginatedResult<UserListItem>> {
  const conditions = [isNull(users.deleted_at)];
  if (query.status) conditions.push(eq(users.status, query.status));
  if (query.search) {
    const prefix = `${query.search}%`;
    conditions.push(or(like(users.username, prefix), like(users.full_name, prefix))!);
  }
  if (query.roleId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${userRoles} WHERE ${userRoles.user_id} = ${users.id} AND ${userRoles.role_id} = ${query.roleId})`,
    );
  }

  const result = await paginate(
    (limit, offset) =>
      db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.full_name,
          email: users.email,
          status: users.status,
          lastLoginAt: users.last_login_at,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.full_name))
        .limit(limit)
        .offset(offset),
    { page: query.page, pageSize: query.pageSize },
  );

  const rolesByUser = await getRolesForUsers(
    db,
    result.items.map((u) => u.id),
  );

  return {
    ...result,
    items: result.items.map((u) => ({ ...u, roles: rolesByUser.get(u.id) ?? [] })),
  };
}

export async function getUserDetail(db: Database, userId: string): Promise<UserDetail | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!row || row.deleted_at) return null;
  const rolesByUser = await getRolesForUsers(db, [userId]);
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    lastLoginAt: row.last_login_at,
    mustChangePassword: row.must_change_password,
    roles: rolesByUser.get(userId) ?? [],
  };
}

export async function assertRoleIdsExist(db: Database, roleIds: string[]): Promise<void> {
  if (roleIds.length === 0) return;
  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(inArray(roles.id, roleIds), isNull(roles.deleted_at)));
  if (rows.length !== new Set(roleIds).size) {
    throw new HTTPException(400, { message: "Salah satu role yang dipilih tidak valid." });
  }
}

async function getAdminRoleId(db: Database): Promise<string | null> {
  const row = await db.query.roles.findFirst({ where: eq(roles.name, SYSTEM_ROLE_NAMES.ADMIN) });
  return row?.id ?? null;
}

async function countOtherActiveAdmins(
  db: Database,
  adminRoleId: string,
  excludeUserId: string,
): Promise<number> {
  const rows = await db
    .select({ userId: userRoles.user_id })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.user_id, users.id))
    .where(
      and(
        eq(userRoles.role_id, adminRoleId),
        eq(users.status, "ACTIVE"),
        isNull(users.deleted_at),
        ne(users.id, excludeUserId),
      ),
    );
  return rows.length;
}

/** Tolak kalau perubahan role akan mencabut role Admin dari satu-satunya Admin aktif. */
async function assertRoleChangeKeepsAdmin(
  db: Database,
  userId: string,
  newRoleIds: string[],
): Promise<void> {
  const adminRoleId = await getAdminRoleId(db);
  if (!adminRoleId || newRoleIds.includes(adminRoleId)) return;

  const current = await db
    .select({ roleId: userRoles.role_id })
    .from(userRoles)
    .where(eq(userRoles.user_id, userId));
  const wasAdmin = current.some((r) => r.roleId === adminRoleId);
  if (!wasAdmin) return;

  const others = await countOtherActiveAdmins(db, adminRoleId, userId);
  if (others === 0) {
    throw new HTTPException(400, {
      message: "Tidak bisa mencabut role Admin dari satu-satunya Admin aktif.",
    });
  }
}

/** Tolak kalau menonaktifkan user ini akan menyisakan nol Admin aktif. */
async function assertDeactivateKeepsAdmin(db: Database, userId: string): Promise<void> {
  const adminRoleId = await getAdminRoleId(db);
  if (!adminRoleId) return;

  const current = await db
    .select({ roleId: userRoles.role_id })
    .from(userRoles)
    .where(eq(userRoles.user_id, userId));
  const isAdmin = current.some((r) => r.roleId === adminRoleId);
  if (!isAdmin) return;

  const others = await countOtherActiveAdmins(db, adminRoleId, userId);
  if (others === 0) {
    throw new HTTPException(400, { message: "Tidak bisa menonaktifkan Admin terakhir." });
  }
}

async function setUserRoles(db: Database, userId: string, roleIds: string[]): Promise<void> {
  await db.delete(userRoles).where(eq(userRoles.user_id, userId));
  if (roleIds.length === 0) return;
  const now = new Date().toISOString();
  await db.insert(userRoles).values(
    roleIds.map((roleId) => ({
      id: generateId(),
      user_id: userId,
      role_id: roleId,
      created_at: now,
    })),
  );
}

export async function createUser(
  db: Database,
  input: CreateUserInput,
): Promise<{ user: UserDetail; tempPassword: string }> {
  await assertRoleIdsExist(db, input.roleIds);

  const existing = await db.query.users.findFirst({ where: eq(users.username, input.username) });
  if (existing) {
    throw new HTTPException(409, { message: "Username sudah dipakai." });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword, DEFAULT_PBKDF2_ITERATIONS);
  const now = new Date().toISOString();
  const userId = generateId();

  await db.insert(users).values({
    id: userId,
    username: input.username,
    password_hash: passwordHash.hash,
    password_salt: passwordHash.salt,
    password_iterations: passwordHash.iterations,
    must_change_password: true,
    full_name: input.fullName,
    email: nullIfEmpty(input.email),
    phone: nullIfEmpty(input.phone),
    account_type: "STAFF",
    status: input.status,
    created_at: now,
    updated_at: now,
  });

  await setUserRoles(db, userId, input.roleIds);

  const detail = await getUserDetail(db, userId);
  return { user: detail!, tempPassword };
}

export async function updateUser(
  db: Database,
  userId: string,
  input: UpdateUserInput,
): Promise<UserDetail> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing || existing.deleted_at) {
    throw new HTTPException(404, { message: "User tidak ditemukan." });
  }

  await assertRoleIdsExist(db, input.roleIds);

  if (input.username !== existing.username) {
    const clash = await db.query.users.findFirst({ where: eq(users.username, input.username) });
    if (clash) throw new HTTPException(409, { message: "Username sudah dipakai." });
  }

  if (input.status === "INACTIVE" && existing.status === "ACTIVE") {
    await assertDeactivateKeepsAdmin(db, userId);
  }
  await assertRoleChangeKeepsAdmin(db, userId, input.roleIds);

  const now = new Date().toISOString();
  await db
    .update(users)
    .set({
      username: input.username,
      full_name: input.fullName,
      email: nullIfEmpty(input.email),
      phone: nullIfEmpty(input.phone),
      status: input.status,
      updated_at: now,
    })
    .where(eq(users.id, userId));

  await setUserRoles(db, userId, input.roleIds);

  if (input.status === "INACTIVE" && existing.status === "ACTIVE") {
    await revokeAllSessionsForUser(db, userId);
  }

  return (await getUserDetail(db, userId))!;
}

export async function deactivateUser(db: Database, userId: string): Promise<void> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "User tidak ditemukan." });
  if (existing.status === "INACTIVE") return;

  await assertDeactivateKeepsAdmin(db, userId);

  await db
    .update(users)
    .set({ status: "INACTIVE", updated_at: new Date().toISOString() })
    .where(eq(users.id, userId));
  await revokeAllSessionsForUser(db, userId);
}

export async function reactivateUser(db: Database, userId: string): Promise<void> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "User tidak ditemukan." });

  await db
    .update(users)
    .set({ status: "ACTIVE", updated_at: new Date().toISOString() })
    .where(eq(users.id, userId));
}

export async function resetUserPassword(db: Database, userId: string): Promise<string> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "User tidak ditemukan." });

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword, DEFAULT_PBKDF2_ITERATIONS);

  await db
    .update(users)
    .set({
      password_hash: passwordHash.hash,
      password_salt: passwordHash.salt,
      password_iterations: passwordHash.iterations,
      must_change_password: true,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  await revokeAllSessionsForUser(db, userId);
  return tempPassword;
}
