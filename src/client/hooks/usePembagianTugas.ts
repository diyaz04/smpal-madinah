import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AssignPembagianTugasInput,
  CopyPembagianTugasFromPeriodInput,
} from "@shared/schemas/pembagianTugas.schema";
import type { PembagianTugasMatrix, RingkasanGuruItem } from "@shared/types";

export function usePembagianTugasMatrix() {
  return useQuery({
    queryKey: ["pembagian-tugas", "matrix"],
    queryFn: () => api.get<PembagianTugasMatrix>("/pembagian-tugas/matrix"),
  });
}

export function useRingkasanGuru() {
  return useQuery({
    queryKey: ["pembagian-tugas", "ringkasan-guru"],
    queryFn: () => api.get<{ items: RingkasanGuruItem[] }>("/pembagian-tugas/ringkasan-guru"),
  });
}

export interface GuruAssignmentItem {
  id: string;
  rombelId: string;
  rombelNama: string;
  mapelId: string;
  mapelNama: string;
  isTeamTeaching: boolean;
}

export function useGuruAssignments(guruId: string | null) {
  return useQuery({
    queryKey: ["pembagian-tugas", "guru", guruId],
    queryFn: () => api.get<{ items: GuruAssignmentItem[] }>(`/pembagian-tugas/guru/${guruId}`),
    enabled: !!guruId,
  });
}

function useInvalidatePembagianTugas() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["pembagian-tugas"] });
}

export function useAssignPembagianTugas() {
  const invalidate = useInvalidatePembagianTugas();
  return useMutation({
    mutationFn: (input: AssignPembagianTugasInput) =>
      api.post<{ assigned: number; skipped: { rombelId: string; reason: string }[] }>(
        "/pembagian-tugas",
        input,
      ),
    onSuccess: invalidate,
  });
}

export function useRemovePembagianTugas() {
  const invalidate = useInvalidatePembagianTugas();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/pembagian-tugas/${id}`),
    onSuccess: invalidate,
  });
}

export function useCopyPembagianTugasFromPeriod() {
  const invalidate = useInvalidatePembagianTugas();
  return useMutation({
    mutationFn: (input: CopyPembagianTugasFromPeriodInput) =>
      api.post<{ count: number }>("/pembagian-tugas/copy-from-period", input),
    onSuccess: invalidate,
  });
}
