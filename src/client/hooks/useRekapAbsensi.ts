import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { KoreksiAbsensiHarianInput } from "@shared/schemas/rekapAbsensi.schema";
import type { RekapBulananSiswaRow, RekapSemesterSiswaItem } from "@shared/types";

export interface RekapBulananResponse {
  hariEfektif: string[];
  rows: RekapBulananSiswaRow[];
}

export function useRekapBulanan(rombelId: string | null, bulan: string) {
  return useQuery({
    queryKey: ["rekap-absensi", "bulanan", rombelId, bulan],
    queryFn: () => api.get<RekapBulananResponse>(`/rekap-absensi/bulanan?rombel=${rombelId}&bulan=${bulan}`),
    enabled: !!rombelId,
  });
}

export function useRekapSemester(rombelId: string | null) {
  return useQuery({
    queryKey: ["rekap-absensi", "semester", rombelId],
    queryFn: () => api.get<{ items: RekapSemesterSiswaItem[] }>(`/rekap-absensi/semester?rombel=${rombelId}`),
    enabled: !!rombelId,
  });
}

export interface RekapSiswaDetail {
  totalS: number;
  totalI: number;
  totalA: number;
  persenHadir: number;
  totalHariEfektif: number;
  riwayat: { tanggal: string; status: string; sumber: string; keterangan: string | null }[];
}

export function useRekapSiswaDetail(siswaId: string | null) {
  return useQuery({
    queryKey: ["rekap-absensi", "siswa", siswaId],
    queryFn: () => api.get<{ item: RekapSiswaDetail }>(`/rekap-absensi/siswa/${siswaId}`),
    enabled: !!siswaId,
  });
}

export function useKoreksiAbsensiHarian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KoreksiAbsensiHarianInput) => api.put<{ ok: true }>("/rekap-absensi/koreksi", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rekap-absensi"] }),
  });
}
