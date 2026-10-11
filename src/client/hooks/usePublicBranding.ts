import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PublicBranding } from "@shared/schemas/settings.schema";

export function usePublicBranding() {
  return useQuery({
    queryKey: ["public", "branding"],
    queryFn: () => api.get<PublicBranding>("/public/branding"),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
