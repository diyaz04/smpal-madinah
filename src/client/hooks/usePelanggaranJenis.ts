import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreatePelanggaranJenisInput,
  UpdatePelanggaranJenisInput,
} from "@shared/schemas/pelanggaranJenis.schema";
import type { PelanggaranJenisItem } from "@shared/types";

export function usePelanggaranJenisQuery() {
  return useQuery({
    queryKey: ["pelanggaran-jenis", "list"],
    queryFn: () => api.get<{ items: PelanggaranJenisItem[] }>("/pelanggaran-jenis"),
  });
}

function useInvalidatePelanggaranJenis() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["pelanggaran-jenis"] });
}

export function useCreatePelanggaranJenis() {
  const invalidate = useInvalidatePelanggaranJenis();
  return useMutation({
    mutationFn: (input: CreatePelanggaranJenisInput) => api.post<{ id: string }>("/pelanggaran-jenis", input),
    onSuccess: invalidate,
  });
}

export function useUpdatePelanggaranJenis(id: string) {
  const invalidate = useInvalidatePelanggaranJenis();
  return useMutation({
    mutationFn: (input: UpdatePelanggaranJenisInput) => api.put<{ ok: true }>(`/pelanggaran-jenis/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeletePelanggaranJenis() {
  const invalidate = useInvalidatePelanggaranJenis();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/pelanggaran-jenis/${id}`),
    onSuccess: invalidate,
  });
}
