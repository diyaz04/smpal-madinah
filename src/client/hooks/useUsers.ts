import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { OffsetPaginatedResult, RoleRef, UserDetail, UserListItem } from "@shared/types";
import type { UserStatus } from "@shared/constants";

export interface UsersQueryParams {
  page: number;
  search: string;
  roleId: string | null;
  status: UserStatus | null;
  pageSize?: number;
}

export function useUsersQuery(params: UsersQueryParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.roleId) searchParams.set("roleId", params.roleId);
  if (params.status) searchParams.set("status", params.status);

  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: () =>
      api.get<OffsetPaginatedResult<UserListItem>>(`/users?${searchParams.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ["users", "detail", userId],
    queryFn: () => api.get<{ user: UserDetail }>(`/users/${userId}`),
    enabled: !!userId,
  });
}

export function useAvailableRoles() {
  return useQuery({
    queryKey: ["users", "available-roles"],
    queryFn: () => api.get<{ roles: RoleRef[] }>("/users/available-roles"),
    staleTime: 5 * 60 * 1000,
  });
}
