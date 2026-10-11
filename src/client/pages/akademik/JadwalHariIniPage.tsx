import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Circle, Clock, CheckCircle2, AlertCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useJadwalHariIni } from "@/hooks/useAgenda";
import { todayWibIso } from "@/lib/dateFormat";
import { addDays } from "@shared/tanggal";
import type { JadwalHariIniItem, JadwalHariIniStatus } from "@shared/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<JadwalHariIniStatus, { label: string; icon: typeof Circle; className: string }> = {
  belum_waktunya: { label: "Belum waktunya", icon: Circle, className: "text-muted-foreground" },
  bisa_diisi: { label: "Bisa diisi", icon: Clock, className: "text-amber-600" },
  belum_diisi: { label: "Belum diisi", icon: AlertCircle, className: "text-destructive" },
  sudah_diisi: { label: "Sudah diisi", icon: CheckCircle2, className: "text-success" },
};

export function JadwalHariIniPage() {
  const navigate = useNavigate();
  const [tanggal, setTanggal] = useState(todayWibIso());
  const { data, isLoading } = useJadwalHariIni(tanggal);

  const belumDiisiCount = (data?.items ?? []).filter((i) => i.status === "belum_diisi").length;

  function openIsiAgenda(item: JadwalHariIniItem) {
    const params = new URLSearchParams({
      rombel: item.rombelId,
      mapel: item.mapelId ?? "",
      tanggal,
      slot: item.slotMulai,
    });
    if (item.agendaId) params.set("agendaId", item.agendaId);
    navigate(`/akademik/agenda/isi?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Jadwal Hari Ini</h1>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setTanggal((t) => addDays(t, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="flex-1" />
        <Button variant="outline" size="icon" onClick={() => setTanggal((t) => addDays(t, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {tanggal !== todayWibIso() && (
        <Button variant="ghost" size="sm" onClick={() => setTanggal(todayWibIso())}>
          Kembali ke hari ini
        </Button>
      )}

      {belumDiisiCount > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {belumDiisiCount} agenda belum diisi
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">Tidak ada pertemuan</p>
          <p className="text-sm text-muted-foreground">
            Tidak ada jadwal mengajar Anda pada tanggal ini.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data!.items.map((item) => {
            const config = STATUS_CONFIG[item.status];
            const Icon = config.icon;
            const clickable = item.status === "bisa_diisi" || item.status === "belum_diisi" || item.status === "sudah_diisi";
            return (
              <button
                key={`${item.rombelId}-${item.slotMulai}`}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && openIsiAgenda(item)}
                className={cn(
                  "w-full rounded-xl border border-border bg-card p-4 text-left",
                  clickable && "cursor-pointer hover:bg-accent",
                  !clickable && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.slotMulai}–{item.slotSelesai}
                      {item.jamKeMulai && ` (Jam ke-${item.jamKeMulai}${item.jamKeSelesai && item.jamKeSelesai !== item.jamKeMulai ? `–${item.jamKeSelesai}` : ""})`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.rombelNama} · {item.mapelNama ?? "—"}
                    </p>
                    {item.isPengganti && (
                      <Badge variant="secondary" className="mt-1">
                        Pengganti untuk {item.guruAsliNama}
                      </Badge>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-1.5 text-sm", config.className)}>
                    <Icon className="h-4 w-4" />
                    <span>{config.label}</span>
                  </div>
                </div>
                {item.status === "sudah_diisi" && item.jumlahTidakHadir !== null && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {item.jumlahTidakHadir} siswa tidak hadir
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
