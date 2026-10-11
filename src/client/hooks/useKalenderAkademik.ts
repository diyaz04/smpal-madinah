import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreateKalenderEntriInput,
  UpdateKalenderEntriInput,
  UpdatePengaturanAkademikInput,
} from "@shared/schemas/kalenderAkademik.schema";
import type { KalenderEntriItem, PengaturanAkademik } from "@shared/types";

export function useKalenderEntriList() {
  return useQuery({
    queryKey: ["kalender-akademik", "list"],
    queryFn: () => api.get<{ items: KalenderEntriItem[] }>("/kalender-akademik"),
  });
}

export function usePengaturanAkademik() {
  return useQuery({
    queryKey: ["kalender-akademik", "pengaturan"],
    queryFn: () => api.get<{ item: PengaturanAkademik }>("/kalender-akademik/pengaturan"),
  });
}

function useInvalidateKalender() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["kalender-akademik"] });
}

export function useCreateKalenderEntri() {
  const invalidate = useInvalidateKalender();
  return useMutation({
    mutationFn: (input: CreateKalenderEntriInput) =>
      api.post<{ item: KalenderEntriItem }>("/kalender-akademik", input),
    onSuccess: invalidate,
  });
}

export function useUpdateKalenderEntri(id: string) {
  const invalidate = useInvalidateKalender();
  return useMutation({
    mutationFn: (input: UpdateKalenderEntriInput) =>
      api.put<{ item: KalenderEntriItem }>(`/kalender-akademik/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteKalenderEntri() {
  const invalidate = useInvalidateKalender();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/kalender-akademik/${id}`),
    onSuccess: invalidate,
  });
}

export function useUpdatePengaturanAkademik() {
  const invalidate = useInvalidateKalender();
  return useMutation({
    mutationFn: (input: UpdatePengaturanAkademikInput) =>
      api.put<{ ok: true }>("/kalender-akademik/pengaturan", input),
    onSuccess: invalidate,
  });
}
