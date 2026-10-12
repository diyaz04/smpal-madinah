import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { SimpanNilaiInput } from "@shared/schemas/nilai.schema";
import type { AmpuanItem, InputNilaiKonteks } from "@shared/types";

export function usePilihanAmpuanQuery() {
  return useQuery({
    queryKey: ["nilai", "pilihan"],
    queryFn: () => api.get<{ items: AmpuanItem[] }>("/nilai/pilihan"),
  });
}

export function useInputNilaiKonteks(rombelId: string | null, mapelId: string | null) {
  return useQuery({
    queryKey: ["nilai", "konteks", rombelId, mapelId],
    queryFn: () => api.get<{ item: InputNilaiKonteks }>(`/nilai/konteks?rombelId=${rombelId}&mapelId=${mapelId}`),
    enabled: !!rombelId && !!mapelId,
  });
}

export function useSimpanNilai() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SimpanNilaiInput) => api.put<{ count: number }>("/nilai/simpan", input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["nilai", "konteks", variables.rombelId, variables.mapelId] }),
  });
}
