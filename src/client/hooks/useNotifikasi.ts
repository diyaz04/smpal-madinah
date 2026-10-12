import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "@/hooks/useSession";
import type { NotifikasiItem, CursorPaginatedResult } from "@shared/types";

export function useNotifikasiList(cursor: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  return useQuery({
    queryKey: ["notifikasi", "list", cursor],
    queryFn: () => api.get<CursorPaginatedResult<NotifikasiItem>>(`/notifikasi?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateNotifikasi() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["notifikasi"] });
    queryClient.invalidateQueries({ queryKey: meQueryKey });
  };
}

export function useMarkNotifikasiDibaca() {
  const invalidate = useInvalidateNotifikasi();
  return useMutation({
    mutationFn: (id: string) => api.put<{ ok: true }>(`/notifikasi/${id}/baca`),
    onSuccess: invalidate,
  });
}

export function useMarkSemuaNotifikasiDibaca() {
  const invalidate = useInvalidateNotifikasi();
  return useMutation({
    mutationFn: () => api.put<{ ok: true }>("/notifikasi/baca-semua"),
    onSuccess: invalidate,
  });
}
