import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  CreatePelanggaranKategoriInput,
  UpdatePelanggaranKategoriInput,
  UpdateUrutanPelanggaranKategoriInput,
} from "@shared/schemas/pelanggaranKategori.schema";
import type { PelanggaranKategoriItem } from "@shared/types";

export function usePelanggaranKategoriQuery() {
  return useQuery({
    queryKey: ["pelanggaran-kategori", "list"],
    queryFn: () => api.get<{ items: PelanggaranKategoriItem[] }>("/pelanggaran-kategori"),
  });
}

function useInvalidatePelanggaranKategori() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["pelanggaran-kategori"] });
    queryClient.invalidateQueries({ queryKey: ["pelanggaran-jenis"] });
  };
}

export function useCreatePelanggaranKategori() {
  const invalidate = useInvalidatePelanggaranKategori();
  return useMutation({
    mutationFn: (input: CreatePelanggaranKategoriInput) =>
      api.post<{ item: PelanggaranKategoriItem }>("/pelanggaran-kategori", input),
    onSuccess: invalidate,
  });
}

export function useUpdatePelanggaranKategori(id: string) {
  const invalidate = useInvalidatePelanggaranKategori();
  return useMutation({
    mutationFn: (input: UpdatePelanggaranKategoriInput) =>
      api.put<{ item: PelanggaranKategoriItem }>(`/pelanggaran-kategori/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeletePelanggaranKategori() {
  const invalidate = useInvalidatePelanggaranKategori();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/pelanggaran-kategori/${id}`),
    onSuccess: invalidate,
  });
}

export function useUpdateUrutanPelanggaranKategori() {
  const invalidate = useInvalidatePelanggaranKategori();
  return useMutation({
    mutationFn: (input: UpdateUrutanPelanggaranKategoriInput) =>
      api.put<{ ok: true }>("/pelanggaran-kategori/urutan", input),
    onSuccess: invalidate,
  });
}
