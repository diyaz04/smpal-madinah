import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createRoleSchema,
  updateRoleSchema,
  updateRolePermissionsSchema,
  duplicateRoleSchema,
} from "../../shared/schemas/role.schema";
import {
  listRoles,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole,
  duplicateRole,
  updateRolePermissions,
  listUsersForRole,
} from "../services/roles.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "manajemen_fitur";

export const roleRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const rolesList = await listRoles(c.get("db"));
    return c.json({ roles: rolesList });
  })

  .get("/:id", requirePermission(MODULE, "lihat"), async (c) => {
    const role = await getRoleDetail(c.get("db"), c.req.param("id")!);
    if (!role) return c.json({ error: "Role tidak ditemukan." }, 404);
    return c.json({ role });
  })

  .get("/:id/users", requirePermission(MODULE, "lihat"), async (c) => {
    const roleUsers = await listUsersForRole(c.get("db"), c.req.param("id")!);
    return c.json({ users: roleUsers });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createRoleSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");
    const role = await createRole(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: role.id,
      after: { name: role.name, description: role.description },
    });

    return c.json({ role }, 201);
  })

  .post(
    "/:id/duplicate",
    requirePermission(MODULE, "tambah"),
    zValidator("json", duplicateRoleSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id")!;
      const { name } = c.req.valid("json");
      const role = await duplicateRole(db, id, name);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "create",
        recordId: role.id,
        after: { name: role.name, duplicatedFrom: id },
      });

      return c.json({ role }, 201);
    },
  )

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateRoleSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");

    const before = await getRoleDetail(db, id);
    const role = await updateRole(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      before: { name: before?.name, description: before?.description },
      after: { name: role.name, description: role.description },
    });

    return c.json({ role });
  })

  .put(
    "/:id/permissions",
    requirePermission(MODULE, "ubah"),
    zValidator("json", updateRolePermissionsSchema),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("user")!;
      const id = c.req.param("id")!;
      const input = c.req.valid("json");

      const before = await getRoleDetail(db, id);
      const role = await updateRolePermissions(db, id, input);

      await logActivity(db, {
        userId: actor.id,
        usernameSnapshot: actor.username,
        moduleKey: MODULE,
        action: "update",
        recordId: id,
        before: { permissionCount: before?.permissions.length ?? 0 },
        after: { permissionCount: role.permissions.length },
      });

      return c.json({ role });
    },
  )

  .delete("/:id", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;

    const before = await getRoleDetail(db, id);
    await deleteRole(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "delete",
      recordId: id,
      before: { name: before?.name },
    });

    return c.json({ ok: true });
  });
