import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateMapelInput, UpdateMapelInput, UpdateUrutanMapelInput } from "@shared/schemas/mapel.schema";
import type { MapelListItem } from "@shared/types";

export interface RaportPreviewGroup {
  induk: MapelListItem | null;
  anak: MapelListItem[];
}

export function useMapelQuery() {
  return useQuery({
    queryKey: ["mapel", "list"],
    queryFn: () => api.get<{ items: MapelListItem[] }>("/mapel"),
  });
}

export function useRaportPreviewQuery() {
  return useQuery({
    queryKey: ["mapel", "raport-preview"],
    queryFn: () => api.get<{ groups: RaportPreviewGroup[] }>("/mapel/raport-preview"),
  });
}

function useInvalidateMapel() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["mapel"] });
}

export function useCreateMapel() {
  const invalidate = useInvalidateMapel();
  return useMutation({
    mutationFn: (input: CreateMapelInput) => api.post<{ item: MapelListItem }>("/mapel", input),
    onSuccess: invalidate,
  });
}

export function useUpdateMapel(id: string) {
  const invalidate = useInvalidateMapel();
  return useMutation({
    mutationFn: (input: UpdateMapelInput) => api.put<{ item: MapelListItem }>(`/mapel/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteMapel() {
  const invalidate = useInvalidateMapel();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/mapel/${id}`),
    onSuccess: invalidate,
  });
}

export function useUpdateUrutanMapel() {
  const invalidate = useInvalidateMapel();
  return useMutation({
    mutationFn: (input: UpdateUrutanMapelInput) => api.put<{ ok: true }>("/mapel/urutan", input),
    onSuccess: invalidate,
  });
}
