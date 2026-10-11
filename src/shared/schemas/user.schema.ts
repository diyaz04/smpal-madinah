import { z } from "zod";

import { USER_STATUSES } from "../constants";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter")
  .max(32, "Username maksimal 32 karakter")
  .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, strip");

// Sengaja tidak pakai .transform() di sini — tipe input/output zod yang
// berbeda bikin react-hook-form + zodResolver konflik tipe. Normalisasi
// "" -> null dilakukan di server/services/users.service.ts saat menulis ke DB.
export const createUserSchema = z.object({
  username: usernameSchema,
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  email: z.union([z.string().trim().email("Format email tidak valid"), z.literal("")]),
  phone: z.string().trim(),
  roleIds: z.array(z.string()).min(1, "Pilih minimal satu role"),
  status: z.enum(USER_STATUSES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  roleId: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
