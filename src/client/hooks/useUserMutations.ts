import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateUserInput, UpdateUserInput } from "@shared/schemas/user.schema";
import type { UserDetail } from "@shared/types";

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["users"] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      api.post<{ user: UserDetail; tempPassword: string }>("/users", input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser(userId: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => api.put<{ user: UserDetail }>(`/users/${userId}`, input),
    onSuccess: invalidate,
  });
}

export function useDeactivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => api.post<{ ok: true }>(`/users/${userId}/deactivate`),
    onSuccess: invalidate,
  });
}

export function useReactivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => api.post<{ ok: true }>(`/users/${userId}/reactivate`),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => api.post<{ tempPassword: string }>(`/users/${userId}/reset-password`),
    onSuccess: invalidate,
  });
}
