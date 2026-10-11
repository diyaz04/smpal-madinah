import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { SubmitAgendaInput } from "@shared/schemas/agenda.schema";
import type {
  JadwalHariIniItem,
  AgendaFormContext,
  RiwayatMateriItem,
  CursorPaginatedResult,
  RekapMengajarGuruItem,
} from "@shared/types";

export function useJadwalHariIni(tanggal: string) {
  return useQuery({
    queryKey: ["agenda", "hari-ini", tanggal],
    queryFn: () =>
      api.get<{ items: JadwalHariIniItem[]; tanggal: string }>(`/agenda/hari-ini?tanggal=${tanggal}`),
  });
}

export interface AgendaFormParams {
  rombelId: string;
  mapelId: string | null;
  tanggal: string;
  slotMulai: string;
}

export function useAgendaFormContext(params: AgendaFormParams | null) {
  return useQuery({
    queryKey: ["agenda", "form-context", params],
    queryFn: () => {
      const search = new URLSearchParams({
        rombel: params!.rombelId,
        mapel: params!.mapelId ?? "",
        tanggal: params!.tanggal,
        slot: params!.slotMulai,
      });
      return api.get<{ item: AgendaFormContext }>(`/agenda/form-context?${search.toString()}`);
    },
    enabled: !!params,
  });
}

export interface RiwayatMateriFilters {
  rombelId?: string;
  mapelId?: string;
  guruId?: string;
}

export function useRiwayatMateri(cursor: string | null, filters: RiwayatMateriFilters) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.rombelId) params.set("rombel", filters.rombelId);
  if (filters.mapelId) params.set("mapel", filters.mapelId);
  if (filters.guruId) params.set("guru", filters.guruId);

  return useQuery({
    queryKey: ["agenda", "riwayat-materi", cursor, filters],
    queryFn: () => api.get<CursorPaginatedResult<RiwayatMateriItem>>(`/agenda/riwayat-materi?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useRekapMengajar(bulan: string, guruId?: string) {
  const params = new URLSearchParams({ bulan });
  if (guruId) params.set("guru", guruId);

  return useQuery({
    queryKey: ["agenda", "rekap-mengajar", bulan, guruId],
    queryFn: () => api.get<{ items: RekapMengajarGuruItem[] }>(`/agenda/rekap-mengajar?${params.toString()}`),
  });
}

export function useSubmitAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitAgendaInput) => api.post<{ agendaId: string }>("/agenda/submit", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}
