import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CreatePelanggaranInput, BatalkanPelanggaranInput } from "@shared/schemas/pelanggaran.schema";
import type { PelanggaranItem, PelanggaranJenisAktifItem, RekapPoinSingkat, CursorPaginatedResult } from "@shared/types";

export interface PelanggaranFilters {
  siswaId?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  rombelId?: string;
  kategoriId?: string;
  jenisId?: string;
  pelaporUserId?: string;
}

export function usePelanggaranJenisAktifQuery() {
  return useQuery({
    queryKey: ["pelanggaran", "jenis-aktif"],
    queryFn: () => api.get<{ items: PelanggaranJenisAktifItem[] }>("/pelanggaran/jenis"),
  });
}

export function useRekapPoinSatuSiswa(siswaId: string | null) {
  return useQuery({
    queryKey: ["pelanggaran", "rekap-siswa", siswaId],
    queryFn: () => api.get<{ item: RekapPoinSingkat }>(`/pelanggaran/rekap-siswa/${siswaId}`),
    enabled: !!siswaId,
  });
}

export function usePelanggaranList(cursor: string | null, filters: PelanggaranFilters, enabled = true) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.siswaId) params.set("siswa", filters.siswaId);
  if (filters.tanggalMulai) params.set("tanggalMulai", filters.tanggalMulai);
  if (filters.tanggalSelesai) params.set("tanggalSelesai", filters.tanggalSelesai);
  if (filters.rombelId) params.set("rombel", filters.rombelId);
  if (filters.kategoriId) params.set("kategori", filters.kategoriId);
  if (filters.jenisId) params.set("jenis", filters.jenisId);
  if (filters.pelaporUserId) params.set("pelapor", filters.pelaporUserId);

  return useQuery({
    queryKey: ["pelanggaran", "list", cursor, filters],
    queryFn: () => api.get<CursorPaginatedResult<PelanggaranItem>>(`/pelanggaran?${params.toString()}`),
    placeholderData: (prev) => prev,
    enabled,
  });
}

function useInvalidatePelanggaran() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["pelanggaran"] });
}

export function useCreatePelanggaran() {
  const invalidate = useInvalidatePelanggaran();
  return useMutation({
    mutationFn: (input: CreatePelanggaranInput) => api.post<{ count: number }>("/pelanggaran", input),
    onSuccess: invalidate,
  });
}

export function useBatalkanPelanggaran(id: string) {
  const invalidate = useInvalidatePelanggaran();
  return useMutation({
    mutationFn: (input: BatalkanPelanggaranInput) => api.put<{ ok: true }>(`/pelanggaran/${id}/batalkan`, input),
    onSuccess: invalidate,
  });
}

export function useUploadPelanggaranFoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/pelanggaran/foto", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await res.json()) as { fileId?: string; url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah foto.");
      return body as { fileId: string; url: string };
    },
  });
}
