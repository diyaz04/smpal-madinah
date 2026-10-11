import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AssignPenggantiInput, HapusPenggantiInput } from "@shared/schemas/penggantiKbm.schema";
import type { PapanKbmCell } from "@shared/types";

export function usePapanKbm(tanggal: string) {
  return useQuery({
    queryKey: ["papan-kbm", tanggal],
    queryFn: () => api.get<{ items: PapanKbmCell[]; tanggal: string }>(`/papan-kbm?tanggal=${tanggal}`),
  });
}

function useInvalidatePapanKbm() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["papan-kbm"] });
}

export function useAssignPengganti() {
  const invalidate = useInvalidatePapanKbm();
  return useMutation({
    mutationFn: (input: AssignPenggantiInput) => api.post<{ ok: true }>("/papan-kbm/assign", input),
    onSuccess: invalidate,
  });
}

export function useHapusPengganti() {
  const invalidate = useInvalidatePapanKbm();
  return useMutation({
    mutationFn: (input: HapusPenggantiInput) => api.post<{ ok: true }>("/papan-kbm/hapus", input),
    onSuccess: invalidate,
  });
}
