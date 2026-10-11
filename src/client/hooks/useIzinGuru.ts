import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateIzinGuruInput, UpdateIzinGuruInput } from "@shared/schemas/izinGuru.schema";
import type { IzinGuruItem, CursorPaginatedResult } from "@shared/types";

export function useIzinGuruList(cursor: string | null, guruId?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (guruId) params.set("guru", guruId);

  return useQuery({
    queryKey: ["izin-guru", "list", cursor, guruId],
    queryFn: () => api.get<CursorPaginatedResult<IzinGuruItem>>(`/izin-guru?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateIzinGuru() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["izin-guru"] });
}

export function useCreateIzinGuru() {
  const invalidate = useInvalidateIzinGuru();
  return useMutation({
    mutationFn: (input: CreateIzinGuruInput) => api.post<{ id: string }>("/izin-guru", input),
    onSuccess: invalidate,
  });
}

export function useUpdateIzinGuru(id: string) {
  const invalidate = useInvalidateIzinGuru();
  return useMutation({
    mutationFn: (input: UpdateIzinGuruInput) => api.put<{ ok: true }>(`/izin-guru/${id}`, input),
    onSuccess: invalidate,
  });
}
