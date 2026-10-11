import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateIzinSiswaInput, UpdateIzinSiswaInput } from "@shared/schemas/izinSiswa.schema";
import type { IzinHarianSiswaItem, CursorPaginatedResult } from "@shared/types";

export interface IzinSiswaFilters {
  siswaId?: string;
  rombelId?: string;
}

export function useIzinSiswaList(cursor: string | null, filters: IzinSiswaFilters) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.siswaId) params.set("siswa", filters.siswaId);
  if (filters.rombelId) params.set("rombel", filters.rombelId);

  return useQuery({
    queryKey: ["izin-siswa", "list", cursor, filters],
    queryFn: () => api.get<CursorPaginatedResult<IzinHarianSiswaItem>>(`/izin-siswa?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateIzinSiswa() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["izin-siswa"] });
}

export function useCreateIzinSiswa() {
  const invalidate = useInvalidateIzinSiswa();
  return useMutation({
    mutationFn: (input: CreateIzinSiswaInput) => api.post<{ id: string }>("/izin-siswa", input),
    onSuccess: invalidate,
  });
}

export function useUpdateIzinSiswa(id: string) {
  const invalidate = useInvalidateIzinSiswa();
  return useMutation({
    mutationFn: (input: UpdateIzinSiswaInput) => api.put<{ ok: true }>(`/izin-siswa/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useUploadIzinLampiran() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/izin-siswa/lampiran", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await res.json()) as { fileId?: string; url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah lampiran.");
      return body as { fileId: string; url: string };
    },
  });
}
