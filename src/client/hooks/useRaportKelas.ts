import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  SaveEkskulNilaiInput,
  SaveKehadiranOverrideInput,
  SaveCatatanPendidikInput,
  SaveKenaikanKelasInput,
  BukaKunciRombelInput,
} from "@shared/schemas/raportKelas.schema";
import type { RaportKelasKonteks, KekuranganFinalisasi } from "@shared/types";

export function useRaportKelasQuery(rombelId: string | null) {
  return useQuery({
    queryKey: ["raport-kelas", "detail", rombelId],
    queryFn: () => api.get<{ item: RaportKelasKonteks }>(`/raport-kelas/${rombelId}`),
    enabled: !!rombelId,
  });
}

export function useKekuranganFinalisasi(rombelId: string | null) {
  return useQuery({
    queryKey: ["raport-kelas", "kekurangan", rombelId],
    queryFn: () => api.get<{ items: KekuranganFinalisasi[] }>(`/raport-kelas/${rombelId}/kekurangan`),
    enabled: !!rombelId,
  });
}

function useInvalidateRaportKelas(rombelId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["raport-kelas", "detail", rombelId] });
}

export function useSaveEkskulNilai(rombelId: string) {
  const invalidate = useInvalidateRaportKelas(rombelId);
  return useMutation({
    mutationFn: (input: SaveEkskulNilaiInput) => api.put<{ ok: true }>(`/raport-kelas/${rombelId}/ekskul`, input),
    onSuccess: invalidate,
  });
}

export function useSaveKehadiranOverride(rombelId: string) {
  const invalidate = useInvalidateRaportKelas(rombelId);
  return useMutation({
    mutationFn: (input: SaveKehadiranOverrideInput) => api.put<{ ok: true }>(`/raport-kelas/${rombelId}/kehadiran`, input),
    onSuccess: invalidate,
  });
}

export function useSaveCatatanPendidik(rombelId: string) {
  const invalidate = useInvalidateRaportKelas(rombelId);
  return useMutation({
    mutationFn: (input: SaveCatatanPendidikInput) => api.put<{ ok: true }>(`/raport-kelas/${rombelId}/catatan`, input),
    onSuccess: invalidate,
  });
}

export function useSaveKenaikanKelas(rombelId: string) {
  const invalidate = useInvalidateRaportKelas(rombelId);
  return useMutation({
    mutationFn: (input: SaveKenaikanKelasInput) => api.put<{ ok: true }>(`/raport-kelas/${rombelId}/kenaikan`, input),
    onSuccess: invalidate,
  });
}

export function useFinalisasiRombel(rombelId: string) {
  const invalidate = useInvalidateRaportKelas(rombelId);
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>(`/raport-kelas/${rombelId}/finalisasi`),
    onSuccess: invalidate,
  });
}

export function useBukaKunciRombel(rombelId: string) {
  const invalidate = useInvalidateRaportKelas(rombelId);
  return useMutation({
    mutationFn: (input: BukaKunciRombelInput) => api.post<{ ok: true }>(`/raport-kelas/${rombelId}/buka-kunci`, input),
    onSuccess: invalidate,
  });
}
