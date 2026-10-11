import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreateSiswaInput,
  UpdateSiswaInput,
  BulkPindahRombelInput,
  BulkUbahStatusInput,
} from "@shared/schemas/siswa.schema";
import type { OffsetPaginatedResult, SiswaListItem, SiswaDetail } from "@shared/types";
import type { SiswaStatus } from "@shared/constants";

export interface SiswaQueryParams {
  page: number;
  search: string;
  status: SiswaStatus | null;
  rombelId: string | null;
  pageSize?: number;
}

export function useSiswaQuery(params: SiswaQueryParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.rombelId) searchParams.set("rombelId", params.rombelId);

  return useQuery({
    queryKey: ["siswa", "list", params],
    queryFn: () => api.get<OffsetPaginatedResult<SiswaListItem>>(`/siswa?${searchParams.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useSiswaDetail(siswaId: string | null) {
  return useQuery({
    queryKey: ["siswa", "detail", siswaId],
    queryFn: () => api.get<{ item: SiswaDetail }>(`/siswa/${siswaId}`),
    enabled: !!siswaId,
  });
}

function useInvalidateSiswa() {
  const queryClient = useQueryClient();
  return (siswaId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["siswa", "list"] });
    if (siswaId) queryClient.invalidateQueries({ queryKey: ["siswa", "detail", siswaId] });
  };
}

export function useCreateSiswa() {
  const invalidate = useInvalidateSiswa();
  return useMutation({
    mutationFn: (input: CreateSiswaInput) => api.post<{ item: SiswaDetail }>("/siswa", input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateSiswa(id: string) {
  const invalidate = useInvalidateSiswa();
  return useMutation({
    mutationFn: (input: UpdateSiswaInput) => api.put<{ item: SiswaDetail }>(`/siswa/${id}`, input),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteSiswa() {
  const invalidate = useInvalidateSiswa();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/siswa/${id}`),
    onSuccess: () => invalidate(),
  });
}

export function useBulkPindahRombel() {
  const invalidate = useInvalidateSiswa();
  return useMutation({
    mutationFn: (input: BulkPindahRombelInput) =>
      api.post<{ count: number }>("/siswa/bulk/pindah-rombel", input),
    onSuccess: () => invalidate(),
  });
}

export function useBulkUbahStatus() {
  const invalidate = useInvalidateSiswa();
  return useMutation({
    mutationFn: (input: BulkUbahStatusInput) =>
      api.post<{ count: number }>("/siswa/bulk/ubah-status", input),
    onSuccess: () => invalidate(),
  });
}

export function useExportSiswa() {
  return useMutation({
    mutationFn: () => api.get<{ items: SiswaDetail[] }>("/siswa/export"),
  });
}

export function useImportSiswaCommit() {
  const invalidate = useInvalidateSiswa();
  return useMutation({
    mutationFn: (rows: CreateSiswaInput[]) =>
      api.post<{ count: number }>("/siswa/import/commit", { rows }),
    onSuccess: () => invalidate(),
  });
}
