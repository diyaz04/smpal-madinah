import { useState } from "react";
import { UserX, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePapanKbm } from "@/hooks/usePapanKbm";
import { AssignPenggantiDialog } from "@/components/papanKbm/AssignPenggantiDialog";
import { todayWibIso } from "@/lib/dateFormat";
import type { PapanKbmCell } from "@shared/types";

export function PapanKbmPage() {
  const [tanggal, setTanggal] = useState(todayWibIso());
  const { data, isLoading } = usePapanKbm(tanggal);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<PapanKbmCell | null>(null);

  function openAssign(cell: PapanKbmCell) {
    setActiveCell(cell);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Papan KBM Hari Ini</h1>

      <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">Tidak ada jadwal pada tanggal ini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data!.items.map((cell) => (
            <div key={`${cell.rombelId}-${cell.slotMulai}`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    {cell.slotMulai}–{cell.slotSelesai}
                    {cell.jamKeMulai && ` (Jam ke-${cell.jamKeMulai})`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cell.rombelNama} · {cell.mapelNama ?? "Kegiatan"}
                  </p>
                  <p className="text-sm text-muted-foreground">Guru: {cell.guruAsliNama ?? "—"}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openAssign(cell)}>
                  {cell.pengganti ? "Ubah" : "Atur"}
                </Button>
              </div>
              {cell.izinInfo && !cell.pengganti && (
                <Badge variant="destructive" className="mt-2">
                  Guru izin ({cell.izinInfo.jenis}) — perlu pengganti
                </Badge>
              )}
              {cell.pengganti && (
                <div className="mt-2">
                  {cell.pengganti.status === "jam_kosong" ? (
                    <Badge variant="secondary" className="gap-1">
                      <UserX className="h-3.5 w-3.5" /> Jam Kosong
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <UserCheck className="h-3.5 w-3.5" /> Diganti: {cell.pengganti.guruPenggantiNama}
                    </Badge>
                  )}
                  {cell.pengganti.alasan && (
                    <span className="ml-2 text-xs text-muted-foreground">{cell.pengganti.alasan}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AssignPenggantiDialog open={dialogOpen} onOpenChange={setDialogOpen} cell={activeCell} tanggal={tanggal} />
    </div>
  );
}
