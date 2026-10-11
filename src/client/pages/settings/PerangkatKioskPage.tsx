import { useState } from "react";
import { Plus, Tablet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useKioskDevices, useRevokeKioskDevice } from "@/hooks/useKioskDevices";
import { TambahPerangkatDialog } from "@/components/kiosk/TambahPerangkatDialog";
import { ApiError } from "@/lib/api";

export function PerangkatKioskPage() {
  const { data, isLoading } = useKioskDevices();
  const revoke = useRevokeKioskDevice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cabutId, setCabutId] = useState<string | null>(null);

  function handleCabut() {
    if (!cabutId) return;
    revoke.mutate(cabutId, {
      onSuccess: () => {
        toast.success("Perangkat dicabut.");
        setCabutId(null);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mencabut perangkat."),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Perangkat Kiosk</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Tambah Perangkat
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Tablet className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada perangkat kiosk terdaftar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data!.items.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <p className="font-medium text-foreground">{d.nama}</p>
                <p className="text-sm text-muted-foreground">{d.lokasi ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Dipasang {d.pairedAt.slice(0, 10)}
                  {d.lastActiveAt && ` · Terakhir aktif ${d.lastActiveAt.slice(0, 16).replace("T", " ")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={d.status === "aktif" ? "secondary" : "destructive"}>
                  {d.status === "aktif" ? "Aktif" : "Dicabut"}
                </Badge>
                {d.status === "aktif" && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCabutId(d.id)}>
                    Cabut
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TambahPerangkatDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={!!cabutId} onOpenChange={(open) => !open && setCabutId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut Perangkat?</AlertDialogTitle>
            <AlertDialogDescription>
              Perangkat ini akan langsung kehilangan akses. Tablet perlu dipasangkan ulang lewat kode baru untuk dipakai lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCabut}>Cabut</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
