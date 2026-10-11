import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PengaturanPresensi } from "@shared/types";

export function usePengaturanPresensi() {
  return useQuery({
    queryKey: ["presensi-guru", "pengaturan"],
    queryFn: () => api.get<{ item: PengaturanPresensi }>("/presensi-guru/pengaturan"),
  });
}

export function useUpdatePengaturanPresensi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PengaturanPresensi) => api.put<{ ok: true }>("/presensi-guru/pengaturan", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presensi-guru", "pengaturan"] }),
  });
}
