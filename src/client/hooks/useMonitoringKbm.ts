import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PapanKbmCell, MonitoringBelumDiisiItem } from "@shared/types";

const REFRESH_MS = 60_000;

function refetchIntervalWhenVisible(): number | false {
  return typeof document !== "undefined" && document.visibilityState === "visible" ? REFRESH_MS : false;
}

export function useMonitoringGrid(tanggal: string) {
  return useQuery({
    queryKey: ["monitoring-kbm", "grid", tanggal],
    queryFn: () => api.get<{ items: PapanKbmCell[]; tanggal: string }>(`/monitoring/grid-hari-ini?tanggal=${tanggal}`),
    refetchInterval: refetchIntervalWhenVisible,
  });
}

export function useMonitoringBelumDiisi() {
  return useQuery({
    queryKey: ["monitoring-kbm", "belum-diisi"],
    queryFn: () => api.get<{ items: MonitoringBelumDiisiItem[] }>("/monitoring/belum-diisi"),
    refetchInterval: refetchIntervalWhenVisible,
  });
}
