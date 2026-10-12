import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { RekapPeringkatPoinItem, RekapKategoriRombelItem, RekapJenisBulananItem } from "@shared/types";
import type { Tingkat } from "@shared/constants";

export interface RekapKesiswaanFilters {
  tahunAjaran?: string;
  tingkat?: Tingkat;
  rombelId?: string;
}

export function usePeringkatPoinQuery(filters: RekapKesiswaanFilters) {
  const params = new URLSearchParams();
  if (filters.tahunAjaran) params.set("tahunAjaran", filters.tahunAjaran);
  if (filters.tingkat) params.set("tingkat", filters.tingkat);
  if (filters.rombelId) params.set("rombel", filters.rombelId);

  return useQuery({
    queryKey: ["rekap-kesiswaan", "peringkat", filters],
    queryFn: () => api.get<{ items: RekapPeringkatPoinItem[]; tahunAjaran: string }>(`/rekap-kesiswaan/peringkat?${params.toString()}`),
  });
}

export function useRekapKategoriRombelQuery(tahunAjaran?: string) {
  const params = tahunAjaran ? `?tahunAjaran=${encodeURIComponent(tahunAjaran)}` : "";
  return useQuery({
    queryKey: ["rekap-kesiswaan", "kategori-rombel", tahunAjaran],
    queryFn: () =>
      api.get<{ items: RekapKategoriRombelItem[]; tahunAjaran: string }>(`/rekap-kesiswaan/kategori-rombel${params}`),
  });
}

export function useRekapJenisBulananQuery(tahunAjaran?: string) {
  const params = tahunAjaran ? `?tahunAjaran=${encodeURIComponent(tahunAjaran)}` : "";
  return useQuery({
    queryKey: ["rekap-kesiswaan", "jenis-bulanan", tahunAjaran],
    queryFn: () =>
      api.get<{ items: RekapJenisBulananItem[]; tahunAjaran: string }>(`/rekap-kesiswaan/jenis-bulanan${params}`),
  });
}
