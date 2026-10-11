import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { TamuItem, CursorPaginatedResult } from "@shared/types";
import type { TamuStatusKunjungan } from "@shared/constants";

export interface TamuFilters {
  dari?: string;
  sampai?: string;
  jenis?: string;
  search?: string;
}

export function useBukuTamuList(cursor: string | null, filters: TamuFilters) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.dari) params.set("dari", filters.dari);
  if (filters.sampai) params.set("sampai", filters.sampai);
  if (filters.jenis) params.set("jenis", filters.jenis);
  if (filters.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["tamu", "list", cursor, filters],
    queryFn: () => api.get<CursorPaginatedResult<TamuItem>>(`/tamu?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateStatusKunjungan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TamuStatusKunjungan }) =>
      api.put<{ ok: true }>(`/tamu/${id}/status`, { statusKunjungan: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tamu"] }),
  });
}
