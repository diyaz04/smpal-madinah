import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateSanksiAmbangInput, UpdateSanksiAmbangInput } from "@shared/schemas/sanksiAmbang.schema";
import type { SanksiAmbangItem } from "@shared/types";

export function useSanksiAmbangQuery() {
  return useQuery({
    queryKey: ["sanksi-ambang", "list"],
    queryFn: () => api.get<{ items: SanksiAmbangItem[] }>("/sanksi-ambang"),
  });
}

function useInvalidateSanksiAmbang() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["sanksi-ambang"] });
}

export function useCreateSanksiAmbang() {
  const invalidate = useInvalidateSanksiAmbang();
  return useMutation({
    mutationFn: (input: CreateSanksiAmbangInput) => api.post<{ item: SanksiAmbangItem }>("/sanksi-ambang", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSanksiAmbang(id: string) {
  const invalidate = useInvalidateSanksiAmbang();
  return useMutation({
    mutationFn: (input: UpdateSanksiAmbangInput) => api.put<{ item: SanksiAmbangItem }>(`/sanksi-ambang/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSanksiAmbang() {
  const invalidate = useInvalidateSanksiAmbang();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/sanksi-ambang/${id}`),
    onSuccess: invalidate,
  });
}
