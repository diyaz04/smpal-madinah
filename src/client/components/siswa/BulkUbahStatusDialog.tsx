import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SISWA_STATUSES, SISWA_STATUS_LABELS } from "@shared/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBulkUbahStatus } from "@/hooks/useSiswa";
import { ApiError } from "@/lib/api";
import type { SiswaStatus } from "@shared/constants";

interface BulkUbahStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siswaIds: string[];
  onDone: () => void;
}

export function BulkUbahStatusDialog({ open, onOpenChange, siswaIds, onDone }: BulkUbahStatusDialogProps) {
  const [status, setStatus] = useState<SiswaStatus>("PINDAH");
  const [keterangan, setKeterangan] = useState("");
  const bulkUbahStatus = useBulkUbahStatus();

  function handleSubmit() {
    bulkUbahStatus.mutate(
      { siswaIds, status, statusKeterangan: keterangan },
      {
        onSuccess: ({ count }) => {
          toast.success(`Status ${count} siswa diperbarui.`);
          setKeterangan("");
          onOpenChange(false);
          onDone();
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengubah status."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Status Siswa</DialogTitle>
          <DialogDescription>Status {siswaIds.length} siswa akan diperbarui sekaligus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={status} onValueChange={(v) => setStatus(v as SiswaStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SISWA_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SISWA_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Keterangan (opsional)"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={bulkUbahStatus.isPending}>
            {bulkUbahStatus.isPending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
