import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { RaportCetakKonteks } from "@shared/types";

export function useCetakRaportQuery(rombelId: string | null) {
  return useQuery({
    queryKey: ["cetak-raport", rombelId],
    queryFn: () => api.get<{ item: RaportCetakKonteks }>(`/cetak-raport/${rombelId}`),
    enabled: !!rombelId,
  });
}
