import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "./useSession";
import type { LoginInput, ChangePasswordInput } from "@shared/schemas/auth.schema";
import type { AuthUser } from "@shared/types";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ user: AuthUser }>("/auth/login", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>("/auth/logout"),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: meQueryKey });
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.put<{ ok: true }>("/auth/change-password", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}
