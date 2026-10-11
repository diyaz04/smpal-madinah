import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CatatKunjunganInput } from "@shared/schemas/tamu.schema";

export function useUploadTamuFoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/kiosk/tamu/foto", { method: "POST", credentials: "include", body: formData });
      const body = (await res.json()) as { fileId?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah foto.");
      return body as { fileId: string };
    },
  });
}

export function useCatatKunjungan() {
  return useMutation({
    mutationFn: (input: CatatKunjunganInput) => api.post<{ id: string }>("/kiosk/tamu", input),
  });
}
