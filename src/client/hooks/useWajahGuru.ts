import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { WajahGuruStatus } from "@shared/types";

export function useWajahGuruStatus(guruId: string) {
  return useQuery({
    queryKey: ["wajah-guru", guruId],
    queryFn: () => api.get<{ item: WajahGuruStatus }>(`/guru-wajah/${guruId}`),
  });
}

function useInvalidateWajahGuru(guruId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["wajah-guru", guruId] });
}

export function useSetujuiBiometrik(guruId: string) {
  const invalidate = useInvalidateWajahGuru(guruId);
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>(`/guru-wajah/${guruId}/setuju`, { versi: 1 }),
    onSuccess: invalidate,
  });
}

export function useTarikPersetujuan(guruId: string) {
  const invalidate = useInvalidateWajahGuru(guruId);
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>(`/guru-wajah/${guruId}/tarik`, {}),
    onSuccess: invalidate,
  });
}

export function useUploadWajahThumbnail() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/guru-wajah/thumbnail", { method: "POST", credentials: "include", body: formData });
      const body = (await res.json()) as { fileId?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah foto.");
      return body as { fileId: string };
    },
  });
}

export function useTambahDescriptor(guruId: string) {
  const invalidate = useInvalidateWajahGuru(guruId);
  return useMutation({
    mutationFn: (input: { descriptor: string; fotoFileId: string | null }) =>
      api.post<{ ok: true }>(`/guru-wajah/${guruId}/descriptor`, input),
    onSuccess: invalidate,
  });
}

export function useHapusDescriptor(guruId: string) {
  const invalidate = useInvalidateWajahGuru(guruId);
  return useMutation({
    mutationFn: (descriptorId: string) => api.post<{ ok: true }>(`/guru-wajah/descriptor/${descriptorId}/hapus`, {}),
    onSuccess: invalidate,
  });
}
