import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateJadwalIsi } from "@/hooks/useJadwal";
import { useMapelQuery } from "@/hooks/useMapel";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { ApiError } from "@/lib/api";
import type { JadwalIsiItem } from "@shared/types";

const NONE_VALUE = "__none__";

interface UbahIsiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: string | null;
  rombelId: string | null;
  label: string;
  existing?: JadwalIsiItem;
}

export function UbahIsiDialog({ open, onOpenChange, slotId, rombelId, label, existing }: UbahIsiDialogProps) {
  const { data: mapelData } = useMapelQuery();
  const { data: guruData } = useGuruSimple();
  const updateIsi = useUpdateJadwalIsi(slotId ?? "", rombelId ?? "");

  const [mapelId, setMapelId] = useState<string | null>(null);
  const [guruIds, setGuruIds] = useState<Set<string>>(new Set());
  const [keterangan, setKeterangan] = useState("");

  useEffect(() => {
    if (open) {
      setMapelId(existing?.mapelId ?? null);
      setGuruIds(new Set(existing?.guru.map((g) => g.id) ?? []));
      setKeterangan(existing?.keterangan ?? "");
    }
  }, [open, existing]);

  function toggleGuru(id: string, checked: boolean) {
    setGuruIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSubmit() {
    updateIsi.mutate(
      { mapelId, keterangan, guruIds: [...guruIds] },
      {
        onSuccess: () => {
          toast.success("Jadwal berhasil diperbarui.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Jadwal</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mata Pelajaran</Label>
            <Select
              value={mapelId ?? NONE_VALUE}
              onValueChange={(v) => setMapelId(v === NONE_VALUE ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kosong" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Kosong</SelectItem>
                {(mapelData?.items ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Guru</Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border p-3">
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
          </div>

          <div className="space-y-1.5">
            <Label>Keterangan (opsional)</Label>
            <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={updateIsi.isPending}>
            {updateIsi.isPending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
