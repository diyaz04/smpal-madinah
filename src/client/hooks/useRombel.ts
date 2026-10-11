import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreateRombelInput,
  UpdateRombelInput,
  CopyRombelFromPeriodInput,
  UpdateNomorAbsenInput,
} from "@shared/schemas/rombel.schema";
import type { RombelListItem } from "@shared/types";

const rombelQueryKey = (periodId?: string) => ["rombel", "list", periodId ?? "active"] as const;

export function useRombelQuery(periodId?: string) {
  const params = periodId ? `?periodId=${periodId}` : "";
  return useQuery({
    queryKey: rombelQueryKey(periodId),
    queryFn: () => api.get<{ items: RombelListItem[]; periodId: string }>(`/rombel${params}`),
  });
}

function useInvalidateRombel() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["rombel"] });
}

export function useCreateRombel() {
  const invalidate = useInvalidateRombel();
  return useMutation({
    mutationFn: (input: CreateRombelInput) =>
      api.post<{ item: RombelListItem; warning: string | null }>("/rombel", input),
    onSuccess: invalidate,
  });
}

export function useUpdateRombel(id: string) {
  const invalidate = useInvalidateRombel();
  return useMutation({
    mutationFn: (input: UpdateRombelInput) =>
      api.put<{ item: RombelListItem; warning: string | null }>(`/rombel/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteRombel() {
  const invalidate = useInvalidateRombel();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/rombel/${id}`),
    onSuccess: invalidate,
  });
}

export function useCopyRombelFromPeriod() {
  const invalidate = useInvalidateRombel();
  return useMutation({
    mutationFn: (input: CopyRombelFromPeriodInput) =>
      api.post<{ count: number }>("/rombel/copy-from-period", input),
    onSuccess: invalidate,
  });
}

export function useSiswaInRombel(rombelId: string | null) {
  return useQuery({
    queryKey: ["rombel", "siswa", rombelId],
    queryFn: () =>
      api.get<{ items: { id: string; namaLengkap: string; nomorAbsen: number | null }[] }>(
        `/rombel/${rombelId}/siswa`,
      ),
    enabled: !!rombelId,
  });
}

export function useUpdateNomorAbsen(rombelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNomorAbsenInput) =>
      api.put<{ ok: true }>(`/rombel/${rombelId}/nomor-absen`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rombel", "siswa", rombelId] }),
  });
}
