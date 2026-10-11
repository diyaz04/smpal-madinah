import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { GuruRef } from "@shared/types";

export function useGuruSimple() {
  return useQuery({
    queryKey: ["guru", "simple"],
    queryFn: () => api.get<{ items: GuruRef[] }>("/guru/simple"),
    staleTime: 60_000,
  });
}
