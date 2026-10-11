import { CheckCircle2, AlertCircle, Clock, Circle, UserX, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonitoringGrid, useMonitoringBelumDiisi } from "@/hooks/useMonitoringKbm";
import { todayWibIso } from "@/lib/dateFormat";
import type { JadwalHariIniStatus } from "@shared/types";

const STATUS_CONFIG: Record<JadwalHariIniStatus, { label: string; icon: typeof Circle; className: string }> = {
  belum_waktunya: { label: "Belum waktunya", icon: Circle, className: "text-muted-foreground" },
  bisa_diisi: { label: "Bisa diisi", icon: Clock, className: "text-amber-600" },
  belum_diisi: { label: "Belum diisi", icon: AlertCircle, className: "text-destructive" },
  sudah_diisi: { label: "Sudah diisi", icon: CheckCircle2, className: "text-success" },
};

export function MonitoringKbmPage() {
  const tanggal = todayWibIso();
  const { data: gridData, isLoading: gridLoading } = useMonitoringGrid(tanggal);
  const { data: belumDiisiData, isLoading: belumDiisiLoading } = useMonitoringBelumDiisi();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Monitoring Keterlaksanaan KBM</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Hari Ini ({tanggal})</h2>
        {gridLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (gridData?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada jadwal hari ini.</p>
        ) : (
          <div className="space-y-2">
            {gridData!.items.map((cell) => {
              const config = cell.statusAgenda ? STATUS_CONFIG[cell.statusAgenda] : STATUS_CONFIG.belum_waktunya;
              const Icon = config.icon;
              return (
                <div key={`${cell.rombelId}-${cell.slotMulai}`} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cell.slotMulai}–{cell.slotSelesai} · {cell.rombelNama} · {cell.mapelNama ?? "Kegiatan"}
                      </p>
                      <p className="text-xs text-muted-foreground">Guru: {cell.guruAsliNama ?? "—"}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${config.className}`}>
                      <Icon className="h-3.5 w-3.5" /> {config.label}
                    </div>
                  </div>
                  {cell.pengganti && (
                    <div className="mt-1.5">
                      {cell.pengganti.status === "jam_kosong" ? (
                        <Badge variant="secondary" className="gap-1">
                          <UserX className="h-3.5 w-3.5" /> Jam Kosong
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> Pengganti: {cell.pengganti.guruPenggantiNama}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Belum Diisi (7 Hari Terakhir)</h2>
        {belumDiisiLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (belumDiisiData?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Semua agenda sudah diisi. Mantap!</p>
        ) : (
          <div className="space-y-2">
            {belumDiisiData!.items.map((item, i) => (
              <div key={i} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  {item.tanggal} · {item.slotMulai}–{item.slotSelesai}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.guruNama} · {item.rombelNama} · {item.mapelNama ?? "Kegiatan"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
