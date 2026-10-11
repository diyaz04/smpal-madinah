import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "./useSession";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
  DuplicateRoleInput,
} from "@shared/schemas/role.schema";
import type { RoleDetail } from "@shared/types";

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    // Izin efektif bisa berubah (termasuk untuk user yang sedang login).
    queryClient.invalidateQueries({ queryKey: meQueryKey });
  };
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => api.post<{ role: RoleDetail }>("/roles", input),
    onSuccess: invalidate,
  });
}

export function useUpdateRole(roleId: string) {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => api.put<{ role: RoleDetail }>(`/roles/${roleId}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (roleId: string) => api.delete<{ ok: true }>(`/roles/${roleId}`),
    onSuccess: invalidate,
  });
}

export function useDuplicateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ roleId, input }: { roleId: string; input: DuplicateRoleInput }) =>
      api.post<{ role: RoleDetail }>(`/roles/${roleId}/duplicate`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateRolePermissions(roleId: string) {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: UpdateRolePermissionsInput) =>
      api.put<{ role: RoleDetail }>(`/roles/${roleId}/permissions`, input),
    onSuccess: invalidate,
  });
}
