import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ABSENSI_HARIAN_STATUS_LIST, ABSENSI_HARIAN_STATUS_LABELS } from "@shared/constants";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKoreksiAbsensiHarian } from "@/hooks/useRekapAbsensi";
import { ApiError } from "@/lib/api";

interface KoreksiAbsensiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siswaId: string;
  siswaNama: string;
  tanggal: string;
  statusSaatIni: string | null;
}

export function KoreksiAbsensiDialog({
  open,
  onOpenChange,
  siswaId,
  siswaNama,
  tanggal,
  statusSaatIni,
}: KoreksiAbsensiDialogProps) {
  const koreksi = useKoreksiAbsensiHarian();
  const [status, setStatus] = useState(statusSaatIni ?? "H");
  const [keterangan, setKeterangan] = useState("");

  function handleSubmit() {
    koreksi.mutate(
      { siswaId, tanggal, status: status as "H" | "S" | "I" | "A", keterangan },
      {
        onSuccess: () => {
          toast.success("Koreksi tersimpan.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan koreksi."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Koreksi Kehadiran</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {siswaNama} · {tanggal}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="H">Hadir</SelectItem>
                {ABSENSI_HARIAN_STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ABSENSI_HARIAN_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Keterangan (opsional)</label>
            <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" disabled={koreksi.isPending} onClick={handleSubmit}>
            {koreksi.isPending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
