import { z } from "zod";

import { PERMISSION_ACTIONS, PERMISSION_SCOPES } from "../constants";

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Nama role wajib diisi").max(64, "Maksimal 64 karakter"),
  description: z.string().trim(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const permissionEntrySchema = z.object({
  moduleKey: z.string(),
  action: z.enum(PERMISSION_ACTIONS),
  scope: z.enum(PERMISSION_SCOPES),
});
export type PermissionEntry = z.infer<typeof permissionEntrySchema>;

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(permissionEntrySchema),
});
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

export const duplicateRoleSchema = z.object({
  name: z.string().trim().min(1, "Nama role wajib diisi").max(64, "Maksimal 64 karakter"),
});
export type DuplicateRoleInput = z.infer<typeof duplicateRoleSchema>;
