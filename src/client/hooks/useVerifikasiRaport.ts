import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { VerifikasiRaportResult } from "@shared/types";

export function useVerifikasiRaportQuery(kode: string | null) {
  return useQuery({
    queryKey: ["public", "verifikasi-raport", kode],
    queryFn: () => api.get<{ item: VerifikasiRaportResult | null }>(`/public/verifikasi/${kode}`),
    enabled: !!kode,
    retry: false,
  });
}
