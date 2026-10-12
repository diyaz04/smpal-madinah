import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreateCatatanTemplateInput, UpdateCatatanTemplateInput } from "@shared/schemas/catatanTemplate.schema";
import type { CatatanTemplateItem } from "@shared/types";

export function useCatatanTemplateQuery() {
  return useQuery({
    queryKey: ["catatan-template", "list"],
    queryFn: () => api.get<{ items: CatatanTemplateItem[] }>("/catatan-template"),
  });
}

function useInvalidateCatatanTemplate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["catatan-template"] });
}

export function useCreateCatatanTemplate() {
  const invalidate = useInvalidateCatatanTemplate();
  return useMutation({
    mutationFn: (input: CreateCatatanTemplateInput) => api.post<{ id: string }>("/catatan-template", input),
    onSuccess: invalidate,
  });
}

export function useUpdateCatatanTemplate(id: string) {
  const invalidate = useInvalidateCatatanTemplate();
  return useMutation({
    mutationFn: (input: UpdateCatatanTemplateInput) => api.put<{ ok: true }>(`/catatan-template/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCatatanTemplate() {
  const invalidate = useInvalidateCatatanTemplate();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/catatan-template/${id}`),
    onSuccess: invalidate,
  });
}
