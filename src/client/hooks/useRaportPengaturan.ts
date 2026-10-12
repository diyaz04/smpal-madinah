import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { UpdateRaportPengaturanInput } from "@shared/schemas/raportPengaturan.schema";
import type { RaportPengaturan } from "@shared/types";

export function useRaportPengaturanQuery(periodId?: string) {
  const params = periodId ? `?periodId=${periodId}` : "";
  return useQuery({
    queryKey: ["raport-pengaturan", periodId ?? "active"],
    queryFn: () => api.get<{ item: RaportPengaturan }>(`/raport-pengaturan${params}`),
  });
}

export function useUpdateRaportPengaturan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRaportPengaturanInput) => api.put<{ item: RaportPengaturan }>("/raport-pengaturan", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["raport-pengaturan"] }),
  });
}
