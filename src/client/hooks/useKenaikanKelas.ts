import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PromoteInput } from "@shared/schemas/kenaikanKelas.schema";
import type { RombelPromotionOverviewItem, PromoteResult } from "@shared/types";

export function usePromotionOverview() {
  return useQuery({
    queryKey: ["kenaikan-kelas", "overview"],
    queryFn: () => api.get<{ items: RombelPromotionOverviewItem[] }>("/kenaikan-kelas/overview"),
  });
}

export function usePromoteSiswa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PromoteInput) => api.post<PromoteResult>("/kenaikan-kelas/promote", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siswa"] });
      queryClient.invalidateQueries({ queryKey: ["rombel"] });
    },
  });
}
