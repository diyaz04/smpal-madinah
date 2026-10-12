import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { KirimPengingatInput } from "@shared/schemas/deskripsiNilai.schema";
import type { MonitoringKelengkapanCell, LegerKelas } from "@shared/types";

export function useMonitoringKelengkapanQuery() {
  return useQuery({
    queryKey: ["leger", "monitoring"],
    queryFn: () => api.get<{ items: MonitoringKelengkapanCell[] }>("/leger/monitoring"),
  });
}

export function useKirimPengingat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KirimPengingatInput) => api.post<{ ok: true }>("/leger/pengingat", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leger", "monitoring"] }),
  });
}

export function useLegerQuery(rombelId: string | null) {
  return useQuery({
    queryKey: ["leger", "detail", rombelId],
    queryFn: () => api.get<{ item: LegerKelas }>(`/leger/${rombelId}`),
    enabled: !!rombelId,
  });
}
