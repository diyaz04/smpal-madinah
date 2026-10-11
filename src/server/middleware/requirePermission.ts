import type { Context, Next } from "hono";

import { getEffectivePermissions, canAccess } from "../services/permission.service";
import type { PermissionAction } from "../../shared/constants";
import type { AppEnv } from "../types";

/**
 * Sumber kebenaran utama RBAC: dipasang di setiap endpoint yang butuh izin
 * modul tertentu. Pasang setelah requireAuth (butuh c.get("user")).
 */
export function requirePermission(moduleKey: string, action: PermissionAction) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Sesi tidak valid atau sudah berakhir. Silakan login kembali." }, 401);
    }

    const db = c.get("db");
    const permissions = await getEffectivePermissions(db, user.id);
    const scope = canAccess(permissions, moduleKey, action);
    if (!scope) {
      return c.json({ error: "Anda tidak punya akses untuk melakukan aksi ini." }, 403);
    }

    c.set("permissionScope", scope);
    await next();
  };
}
