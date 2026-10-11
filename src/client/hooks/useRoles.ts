import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { RoleListItem, RoleDetail } from "@shared/types";

export function useRolesQuery() {
  return useQuery({
    queryKey: ["roles", "list"],
    queryFn: () => api.get<{ roles: RoleListItem[] }>("/roles"),
  });
}

export function useRoleDetail(roleId: string | undefined) {
  return useQuery({
    queryKey: ["roles", "detail", roleId],
    queryFn: () => api.get<{ role: RoleDetail }>(`/roles/${roleId}`),
    enabled: !!roleId,
  });
}

export function useRoleUsers(roleId: string | undefined) {
  return useQuery({
    queryKey: ["roles", "users", roleId],
    queryFn: () =>
      api.get<{ users: { id: string; fullName: string; username: string }[] }>(
        `/roles/${roleId}/users`,
      ),
    enabled: !!roleId,
  });
}
