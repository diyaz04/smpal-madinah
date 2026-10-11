import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
} from "../../shared/schemas/user.schema";
import {
  listUsers,
  getUserDetail,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  listActiveRoles,
} from "../services/users.service";
import { logActivity } from "../services/activityLog.service";
import { requirePermission } from "../middleware/requirePermission";
import type { AppEnv } from "../types";

const MODULE = "manajemen_pengguna";

export const userRoutes = new Hono<AppEnv>()
  .get("/", requirePermission(MODULE, "lihat"), async (c) => {
    const query = userListQuerySchema.parse(c.req.query());
    const result = await listUsers(c.get("db"), query);
    return c.json(result);
  })

  .get("/available-roles", requirePermission(MODULE, "lihat"), async (c) => {
    const rolesList = await listActiveRoles(c.get("db"));
    return c.json({ roles: rolesList });
  })

  .get("/:id", requirePermission(MODULE, "lihat"), async (c) => {
    const detail = await getUserDetail(c.get("db"), c.req.param("id")!);
    if (!detail) return c.json({ error: "User tidak ditemukan." }, 404);
    return c.json({ user: detail });
  })

  .post("/", requirePermission(MODULE, "tambah"), zValidator("json", createUserSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const input = c.req.valid("json");

    const { user, tempPassword } = await createUser(db, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "create",
      recordId: user.id,
      after: {
        username: user.username,
        full_name: user.fullName,
        email: user.email,
        status: user.status,
        roles: user.roles.map((r) => r.name),
      },
    });

    return c.json({ user, tempPassword }, 201);
  })

  .put("/:id", requirePermission(MODULE, "ubah"), zValidator("json", updateUserSchema), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;
    const input = c.req.valid("json");

    const before = await getUserDetail(db, id);
    if (!before) return c.json({ error: "User tidak ditemukan." }, 404);

    const after = await updateUser(db, id, input);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      before: {
        username: before.username,
        full_name: before.fullName,
        email: before.email,
        phone: before.phone,
        status: before.status,
        roles: before.roles.map((r) => r.name).sort(),
      },
      after: {
        username: after.username,
        full_name: after.fullName,
        email: after.email,
        phone: after.phone,
        status: after.status,
        roles: after.roles.map((r) => r.name).sort(),
      },
    });

    return c.json({ user: after });
  })

  .post("/:id/deactivate", requirePermission(MODULE, "hapus"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;

    await deactivateUser(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      before: { status: "ACTIVE" },
      after: { status: "INACTIVE" },
    });

    return c.json({ ok: true });
  })

  .post("/:id/reactivate", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;

    await reactivateUser(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "update",
      recordId: id,
      before: { status: "INACTIVE" },
      after: { status: "ACTIVE" },
    });

    return c.json({ ok: true });
  })

  .post("/:id/reset-password", requirePermission(MODULE, "ubah"), async (c) => {
    const db = c.get("db");
    const actor = c.get("user")!;
    const id = c.req.param("id")!;

    const tempPassword = await resetUserPassword(db, id);

    await logActivity(db, {
      userId: actor.id,
      usernameSnapshot: actor.username,
      moduleKey: MODULE,
      action: "password_reset",
      recordId: id,
    });

    return c.json({ tempPassword });
  });
