import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateGuruInput, UpdateGuruInput, BuatAkunGuruInput } from "@shared/schemas/guru.schema";
import type { OffsetPaginatedResult, GuruListItem, GuruDetail } from "@shared/types";

export interface GuruQueryParams {
  page: number;
  search: string;
  status: "active" | "inactive" | null;
  pageSize?: number;
}

export function useGuruQuery(params: GuruQueryParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);

  return useQuery({
    queryKey: ["guru", "list", params],
    queryFn: () => api.get<OffsetPaginatedResult<GuruListItem>>(`/guru?${searchParams.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useGuruDetail(guruId: string | null) {
  return useQuery({
    queryKey: ["guru", "detail", guruId],
    queryFn: () => api.get<{ item: GuruDetail }>(`/guru/${guruId}`),
    enabled: !!guruId,
  });
}

function useInvalidateGuru() {
  const queryClient = useQueryClient();
  return (guruId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["guru", "list"] });
    queryClient.invalidateQueries({ queryKey: ["guru", "simple"] });
    if (guruId) queryClient.invalidateQueries({ queryKey: ["guru", "detail", guruId] });
  };
}

export function useCreateGuru() {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (input: CreateGuruInput) => api.post<{ item: GuruListItem }>("/guru", input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateGuru(id: string) {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (input: UpdateGuruInput) => api.put<{ item: GuruListItem }>(`/guru/${id}`, input),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteGuru() {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/guru/${id}`),
    onSuccess: () => invalidate(),
  });
}

export function useSetGuruActive() {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put<{ ok: true }>(`/guru/${id}/status`, { isActive }),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useBuatAkunGuru(id: string) {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (input: BuatAkunGuruInput) =>
      api.post<{ userId: string; username: string; tempPassword: string }>(`/guru/${id}/buat-akun`, input),
    onSuccess: () => invalidate(id),
  });
}

export function useAddGuruAlias(id: string) {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (aliasNama: string) => api.post<{ ok: true }>(`/guru/${id}/alias`, { aliasNama }),
    onSuccess: () => invalidate(id),
  });
}

export function useRemoveGuruAlias(id: string) {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (aliasNama: string) =>
      api.delete<{ ok: true }>(`/guru/${id}/alias/${encodeURIComponent(aliasNama)}`),
    onSuccess: () => invalidate(id),
  });
}

export function useAddTugasTambahan(id: string) {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (input: { namaTugas: string; keterangan: string }) =>
      api.post<{ ok: true }>(`/guru/${id}/tugas-tambahan`, input),
    onSuccess: () => invalidate(id),
  });
}

export function useRemoveTugasTambahan(guruId: string) {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (tugasId: string) => api.delete<{ ok: true }>(`/guru/tugas-tambahan/${tugasId}`),
    onSuccess: () => invalidate(guruId),
  });
}

export function useExportGuru() {
  return useMutation({
    mutationFn: () => api.get<{ items: GuruDetail[] }>("/guru/export"),
  });
}

export function useImportGuruCommit() {
  const invalidate = useInvalidateGuru();
  return useMutation({
    mutationFn: (rows: CreateGuruInput[]) =>
      api.post<{ count: number }>("/guru/import/commit", { rows }),
    onSuccess: () => invalidate(),
  });
}
