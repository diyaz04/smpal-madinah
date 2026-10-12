import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreatePrestasiInput, UpdatePrestasiInput } from "@shared/schemas/prestasi.schema";
import type { PrestasiItem, CursorPaginatedResult } from "@shared/types";
import type { PrestasiBidang, PrestasiTingkat } from "@shared/constants";

export interface PrestasiFilters {
  siswaId?: string;
  periodId?: string;
  tingkat?: PrestasiTingkat;
  bidang?: PrestasiBidang;
  rombelId?: string;
}

export function usePrestasiList(cursor: string | null, filters: PrestasiFilters, enabled = true) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.siswaId) params.set("siswa", filters.siswaId);
  if (filters.periodId) params.set("periodId", filters.periodId);
  if (filters.tingkat) params.set("tingkat", filters.tingkat);
  if (filters.bidang) params.set("bidang", filters.bidang);
  if (filters.rombelId) params.set("rombel", filters.rombelId);

  return useQuery({
    queryKey: ["prestasi", "list", cursor, filters],
    queryFn: () => api.get<CursorPaginatedResult<PrestasiItem>>(`/prestasi?${params.toString()}`),
    placeholderData: (prev) => prev,
    enabled,
  });
}

function useInvalidatePrestasi() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["prestasi"] });
}

export function useCreatePrestasi() {
  const invalidate = useInvalidatePrestasi();
  return useMutation({
    mutationFn: (input: CreatePrestasiInput) => api.post<{ count: number }>("/prestasi", input),
    onSuccess: invalidate,
  });
}

export function useUpdatePrestasi(id: string) {
  const invalidate = useInvalidatePrestasi();
  return useMutation({
    mutationFn: (input: UpdatePrestasiInput) => api.put<{ ok: true }>(`/prestasi/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeletePrestasi() {
  const invalidate = useInvalidatePrestasi();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/prestasi/${id}`),
    onSuccess: invalidate,
  });
}

export function useUploadPrestasiSertifikat() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/prestasi/sertifikat", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await res.json()) as { fileId?: string; url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah sertifikat.");
      return body as { fileId: string; url: string };
    },
  });
}
