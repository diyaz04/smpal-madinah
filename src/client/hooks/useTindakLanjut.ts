import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateTindakLanjutInput } from "@shared/schemas/tindakLanjut.schema";
import type { SanksiSiswaItem, TindakLanjutItem } from "@shared/types";
import type { SanksiSiswaStatus } from "@shared/constants";

export interface SanksiAktifFilters {
  status?: SanksiSiswaStatus;
  rombelId?: string;
}

export function useSanksiAktifQuery(filters: SanksiAktifFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.rombelId) params.set("rombel", filters.rombelId);

  return useQuery({
    queryKey: ["tindak-lanjut", "sanksi", filters],
    queryFn: () => api.get<{ items: SanksiSiswaItem[] }>(`/tindak-lanjut/sanksi?${params.toString()}`),
  });
}

export function useRiwayatTindakLanjut(sanksiSiswaId: string | null) {
  return useQuery({
    queryKey: ["tindak-lanjut", "riwayat", sanksiSiswaId],
    queryFn: () => api.get<{ items: TindakLanjutItem[] }>(`/tindak-lanjut/sanksi/${sanksiSiswaId}/riwayat`),
    enabled: !!sanksiSiswaId,
  });
}

export function useCreateTindakLanjut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTindakLanjutInput) => api.post<{ id: string }>("/tindak-lanjut", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tindak-lanjut"] }),
  });
}

export function useUploadTindakLanjutLampiran() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tindak-lanjut/lampiran", {
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
