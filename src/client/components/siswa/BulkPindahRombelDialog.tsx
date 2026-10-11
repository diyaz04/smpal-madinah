import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRombelQuery } from "@/hooks/useRombel";
import { useBulkPindahRombel } from "@/hooks/useSiswa";
import { ApiError } from "@/lib/api";

interface BulkPindahRombelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siswaIds: string[];
  onDone: () => void;
}

export function BulkPindahRombelDialog({ open, onOpenChange, siswaIds, onDone }: BulkPindahRombelDialogProps) {
  const { data: rombelData } = useRombelQuery();
  const [rombelId, setRombelId] = useState("");
  const bulkPindah = useBulkPindahRombel();

  function handleSubmit() {
    if (!rombelId) return;
    bulkPindah.mutate(
      { siswaIds, rombelId },
      {
        onSuccess: ({ count }) => {
          toast.success(`${count} siswa dipindahkan.`);
          setRombelId("");
          onOpenChange(false);
          onDone();
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal memindahkan."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pindah Rombel</DialogTitle>
          <DialogDescription>{siswaIds.length} siswa akan dipindahkan ke rombel tujuan.</DialogDescription>
        </DialogHeader>
        <Select value={rombelId} onValueChange={setRombelId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pilih rombel tujuan" />
          </SelectTrigger>
          <SelectContent>
            {(rombelData?.items ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.tingkat} {r.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!rombelId || bulkPindah.isPending}>
            {bulkPindah.isPending && <Loader2 className="animate-spin" />}
            Pindahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
