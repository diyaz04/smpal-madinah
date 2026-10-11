import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreateJadwalVersiInput,
  CreateJadwalSlotInput,
  UpdateJadwalSlotInput,
  UpdateJadwalIsiInput,
  SetPiketInput,
} from "@shared/schemas/jadwal.schema";
import type { JadwalVersiItem, JadwalSlotItem, JadwalGridResponse, JadwalPiketItem } from "@shared/types";

export function useJadwalVersiList() {
  return useQuery({
    queryKey: ["jadwal", "versi"],
    queryFn: () => api.get<{ items: JadwalVersiItem[] }>("/jadwal/versi"),
  });
}

export function useJadwalSlots(versiId: string | null) {
  return useQuery({
    queryKey: ["jadwal", "slots", versiId],
    queryFn: () => api.get<{ items: JadwalSlotItem[] }>(`/jadwal/versi/${versiId}/slots`),
    enabled: !!versiId,
  });
}

export function useGridRombel(versiId: string | null, rombelId: string | null) {
  return useQuery({
    queryKey: ["jadwal", "grid", "rombel", versiId, rombelId],
    queryFn: () => api.get<JadwalGridResponse>(`/jadwal/versi/${versiId}/grid/rombel/${rombelId}`),
    enabled: !!versiId && !!rombelId,
  });
}

export function useGridGuru(versiId: string | null, guruId: string | null) {
  return useQuery({
    queryKey: ["jadwal", "grid", "guru", versiId, guruId],
    queryFn: () => api.get<JadwalGridResponse>(`/jadwal/versi/${versiId}/grid/guru/${guruId}`),
    enabled: !!versiId && !!guruId,
  });
}

export function usePiket(versiId: string | null) {
  return useQuery({
    queryKey: ["jadwal", "piket", versiId],
    queryFn: () => api.get<{ items: JadwalPiketItem[] }>(`/jadwal/versi/${versiId}/piket`),
    enabled: !!versiId,
  });
}

function useInvalidateJadwal() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["jadwal"] });
}

export function useCreateVersi() {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (input: CreateJadwalVersiInput) => api.post<{ item: JadwalVersiItem }>("/jadwal/versi", input),
    onSuccess: invalidate,
  });
}

export function useActivateVersi() {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (id: string) => api.put<{ ok: true }>(`/jadwal/versi/${id}/aktifkan`),
    onSuccess: invalidate,
  });
}

export function useDeleteVersi() {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/jadwal/versi/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateSlot(versiId: string) {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (input: CreateJadwalSlotInput) =>
      api.post<{ item: JadwalSlotItem }>(`/jadwal/versi/${versiId}/slots`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateSlot(id: string) {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (input: UpdateJadwalSlotInput) => api.put<{ item: JadwalSlotItem }>(`/jadwal/slots/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSlot() {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/jadwal/slots/${id}`),
    onSuccess: invalidate,
  });
}

export function useUpdateJadwalIsi(slotId: string, rombelId: string) {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (input: UpdateJadwalIsiInput) =>
      api.put<{ ok: true }>(`/jadwal/slots/${slotId}/isi/${rombelId}`, input),
    onSuccess: invalidate,
  });
}

export function useSetPiket(versiId: string) {
  const invalidate = useInvalidateJadwal();
  return useMutation({
    mutationFn: (input: SetPiketInput) => api.put<{ ok: true }>(`/jadwal/versi/${versiId}/piket`, input),
    onSuccess: invalidate,
  });
}
