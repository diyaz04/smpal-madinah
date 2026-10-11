import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api";
import type { MeResponse } from "@shared/types";

export const meQueryKey = ["auth", "me"] as const;

export function useSession() {
  return useQuery<MeResponse, ApiError>({
    queryKey: meQueryKey,
    queryFn: () => api.get<MeResponse>("/auth/me"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
