import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateEkskulInput, UpdateEkskulInput } from "@shared/schemas/ekskul.schema";
import type { EkskulItem } from "@shared/types";

export function useEkskulQuery() {
  return useQuery({
    queryKey: ["ekskul", "list"],
    queryFn: () => api.get<{ items: EkskulItem[] }>("/ekskul"),
  });
}

function useInvalidateEkskul() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["ekskul"] });
}

export function useCreateEkskul() {
  const invalidate = useInvalidateEkskul();
  return useMutation({
    mutationFn: (input: CreateEkskulInput) => api.post<{ id: string }>("/ekskul", input),
    onSuccess: invalidate,
  });
}

export function useUpdateEkskul(id: string) {
  const invalidate = useInvalidateEkskul();
  return useMutation({
    mutationFn: (input: UpdateEkskulInput) => api.put<{ ok: true }>(`/ekskul/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteEkskul() {
  const invalidate = useInvalidateEkskul();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/ekskul/${id}`),
    onSuccess: invalidate,
  });
}
