import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HARI_LIST } from "@shared/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePiket, useSetPiket } from "@/hooks/useJadwal";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { ApiError } from "@/lib/api";
import type { Hari } from "@shared/constants";

interface PiketManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versiId: string | null;
}

export function PiketManagerDialog({ open, onOpenChange, versiId }: PiketManagerDialogProps) {
  const { data: piketData } = usePiket(versiId);
  const { data: guruData } = useGuruSimple();
  const setPiket = useSetPiket(versiId ?? "");

  const [hari, setHari] = useState<Hari>("SENIN");
  const [guruIds, setGuruIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      const existing = piketData?.items.find((p) => p.hari === hari);
      setGuruIds(new Set(existing?.guru.map((g) => g.id) ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hari, piketData]);

  function toggleGuru(id: string, checked: boolean) {
    setGuruIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSubmit() {
    setPiket.mutate(
      { hari, guruIds: [...guruIds] },
      {
        onSuccess: () => toast.success(`Piket hari ${hari} berhasil disimpan.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Guru Piket</DialogTitle>
          <DialogDescription>Pilih guru piket per hari.</DialogDescription>
        </DialogHeader>

        <Select value={hari} onValueChange={(v) => setHari(v as Hari)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HARI_LIST.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-border p-3">
          {(guruData?.items ?? []).map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={guruIds.has(g.id)}
                onCheckedChange={(checked) => toggleGuru(g.id, checked === true)}
              />
              {g.namaLengkap}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={handleSubmit} disabled={setPiket.isPending}>
            {setPiket.isPending && <Loader2 className="animate-spin" />}
            Simpan Hari {hari}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
