import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { RekapPresensiHarianItem, RekapPresensiBulananGuruRow } from "@shared/types";

export function useRekapPresensiHarian(tanggal: string) {
  return useQuery({
    queryKey: ["presensi-guru", "harian", tanggal],
    queryFn: () => api.get<{ items: RekapPresensiHarianItem[]; tanggal: string }>(`/presensi-guru/harian?tanggal=${tanggal}`),
  });
}

export function useRekapPresensiBulananGuru(guruId: string | null, bulan: string) {
  return useQuery({
    queryKey: ["presensi-guru", "bulanan", guruId, bulan],
    queryFn: () => api.get<{ item: RekapPresensiBulananGuruRow | null }>(`/presensi-guru/bulanan?guru=${guruId}&bulan=${bulan}`),
    enabled: !!guruId,
  });
}

export function useRekapPresensiBulananSemua(bulan: string) {
  return useQuery({
    queryKey: ["presensi-guru", "bulanan-semua", bulan],
    queryFn: () => api.get<{ items: RekapPresensiBulananGuruRow[] }>(`/presensi-guru/bulanan-semua?bulan=${bulan}`),
  });
}
