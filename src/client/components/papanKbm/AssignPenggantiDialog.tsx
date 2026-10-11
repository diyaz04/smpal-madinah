import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { PapanKbmCell } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignPengganti, useHapusPengganti } from "@/hooks/usePapanKbm";
import { useGuruQuery } from "@/hooks/useGuru";
import { ApiError } from "@/lib/api";

interface AssignPenggantiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: PapanKbmCell | null;
  tanggal: string;
}

export function AssignPenggantiDialog({ open, onOpenChange, cell, tanggal }: AssignPenggantiDialogProps) {
  const assign = useAssignPengganti();
  const hapus = useHapusPengganti();
  const { data: guruData } = useGuruQuery({ page: 1, pageSize: 100, search: "", status: "active" });

  const [jamKosong, setJamKosong] = useState(false);
  const [guruPenggantiId, setGuruPenggantiId] = useState("");
  const [alasan, setAlasan] = useState("");

  useEffect(() => {
    if (open && cell) {
      setJamKosong(cell.pengganti?.status === "jam_kosong");
      setGuruPenggantiId(cell.pengganti?.guruPenggantiId ?? "");
      setAlasan(cell.pengganti?.alasan ?? "");
    }
  }, [open, cell]);

  if (!cell) return null;

  function handleSubmit() {
    if (!cell) return;
    if (!jamKosong && !guruPenggantiId) {
      toast.error("Pilih guru pengganti, atau tandai jam kosong.");
      return;
    }
    assign.mutate(
      {
        rombelId: cell.rombelId,
        tanggal,
        slotMulai: cell.slotMulai,
        guruPenggantiId: jamKosong ? null : guruPenggantiId,
        alasan,
      },
      {
        onSuccess: () => {
          toast.success("Penugasan berhasil disimpan.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  function handleHapus() {
    if (!cell) return;
    hapus.mutate(
      { rombelId: cell.rombelId, tanggal, slotMulai: cell.slotMulai },
      {
        onSuccess: () => {
          toast.success("Penugasan dibatalkan.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal membatalkan."),
      },
    );
  }

  const guruOptions = (guruData?.items ?? []).filter((g) => g.id !== cell.guruAsliId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guru Pengganti / Jam Kosong</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {cell.rombelNama} · {cell.mapelNama ?? "Kegiatan"} · {cell.slotMulai}–{cell.slotSelesai}
            <br />
            Guru asli: {cell.guruAsliNama ?? "—"}
          </p>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-sm font-medium text-foreground">Jam Kosong (tidak ada pengganti)</span>
            <Switch checked={jamKosong} onCheckedChange={setJamKosong} />
          </div>
          {!jamKosong && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Guru Pengganti</label>
              <Select value={guruPenggantiId} onValueChange={setGuruPenggantiId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih guru pengganti" />
                </SelectTrigger>
                <SelectContent>
                  {guruOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.namaLengkap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Alasan (opsional)</label>
            <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Sakit, dinas luar, dsb." />
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {cell.pengganti ? (
            <Button type="button" variant="ghost" className="text-destructive" disabled={hapus.isPending} onClick={handleHapus}>
              {hapus.isPending && <Loader2 className="animate-spin" />}
              Batalkan Penugasan
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="button" disabled={assign.isPending} onClick={handleSubmit}>
              {assign.isPending && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
