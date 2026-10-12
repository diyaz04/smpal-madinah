import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreateTujuanPembelajaranInput,
  UpdateTujuanPembelajaranInput,
  UpdateUrutanTujuanPembelajaranInput,
  SalinTujuanPembelajaranInput,
} from "@shared/schemas/tujuanPembelajaran.schema";
import type { TujuanPembelajaranItem } from "@shared/types";
import type { Tingkat } from "@shared/constants";

export interface PilihanMapelTingkat {
  mapelId: string;
  mapelNama: string;
  tingkat: Tingkat;
}

export function usePilihanMapelTingkatQuery() {
  return useQuery({
    queryKey: ["tujuan-pembelajaran", "pilihan"],
    queryFn: () => api.get<{ items: PilihanMapelTingkat[] }>("/tujuan-pembelajaran/pilihan"),
  });
}

export function useTujuanPembelajaranQuery(mapelId: string | null, tingkat: Tingkat | null) {
  const params = new URLSearchParams();
  if (mapelId) params.set("mapelId", mapelId);
  if (tingkat) params.set("tingkat", tingkat);

  return useQuery({
    queryKey: ["tujuan-pembelajaran", "list", mapelId, tingkat],
    queryFn: () => api.get<{ items: TujuanPembelajaranItem[] }>(`/tujuan-pembelajaran?${params.toString()}`),
    enabled: !!mapelId && !!tingkat,
  });
}

function useInvalidateTujuanPembelajaran() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tujuan-pembelajaran"] });
}

export function useCreateTujuanPembelajaran() {
  const invalidate = useInvalidateTujuanPembelajaran();
  return useMutation({
    mutationFn: (input: CreateTujuanPembelajaranInput) => api.post<{ id: string }>("/tujuan-pembelajaran", input),
    onSuccess: invalidate,
  });
}

export function useUpdateTujuanPembelajaran(id: string) {
  const invalidate = useInvalidateTujuanPembelajaran();
  return useMutation({
    mutationFn: (input: UpdateTujuanPembelajaranInput) => api.put<{ ok: true }>(`/tujuan-pembelajaran/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTujuanPembelajaran() {
  const invalidate = useInvalidateTujuanPembelajaran();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/tujuan-pembelajaran/${id}`),
    onSuccess: invalidate,
  });
}

export function useUpdateUrutanTujuanPembelajaran() {
  const invalidate = useInvalidateTujuanPembelajaran();
  return useMutation({
    mutationFn: (input: UpdateUrutanTujuanPembelajaranInput) => api.put<{ ok: true }>("/tujuan-pembelajaran/urutan", input),
    onSuccess: invalidate,
  });
}

export function useSalinTujuanPembelajaran() {
  const invalidate = useInvalidateTujuanPembelajaran();
  return useMutation({
    mutationFn: (input: SalinTujuanPembelajaranInput) => api.post<{ count: number }>("/tujuan-pembelajaran/salin", input),
    onSuccess: invalidate,
  });
}
