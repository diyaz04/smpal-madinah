import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { HARI_LIST, JENIS_SLOT_LIST, JENIS_SLOT_LABELS } from "@shared/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJadwalSlots, useCreateSlot, useDeleteSlot } from "@/hooks/useJadwal";
import { ApiError } from "@/lib/api";
import type { Hari, JenisSlot } from "@shared/constants";

interface SlotManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versiId: string | null;
}

export function SlotManagerDialog({ open, onOpenChange, versiId }: SlotManagerDialogProps) {
  const { data } = useJadwalSlots(versiId);
  const createSlot = useCreateSlot(versiId ?? "");
  const deleteSlot = useDeleteSlot();

  const [hari, setHari] = useState<Hari>("SENIN");
  const [jamMulai, setJamMulai] = useState("07:00");
  const [jamSelesai, setJamSelesai] = useState("07:40");
  const [jamKe, setJamKe] = useState("1");
  const [jenisSlot, setJenisSlot] = useState<JenisSlot>("kbm");

  const slotsByHari = HARI_LIST.map((h) => ({
    hari: h,
    slots: (data?.items ?? []).filter((s) => s.hari === h),
  }));

  function handleAdd() {
    const existingForHari = (data?.items ?? []).filter((s) => s.hari === hari);
    const urutan = existingForHari.length > 0 ? Math.max(...existingForHari.map((s) => s.urutan)) + 1 : 1;
    createSlot.mutate(
      {
        hari,
        urutan,
        jamMulai,
        jamSelesai,
        jamKe: jenisSlot === "kbm" ? Number(jamKe) || null : null,
        jenisSlot,
      },
      {
        onSuccess: () => toast.success("Jam pelajaran ditambahkan."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menambahkan."),
      },
    );
  }

  function handleDelete(id: string) {
    deleteSlot.mutate(id, {
      onSuccess: () => toast.success("Jam pelajaran dihapus."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kelola Jam Pelajaran</DialogTitle>
          <DialogDescription>Susunan slot waktu per hari untuk versi jadwal ini.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
          <Select value={hari} onValueChange={(v) => setHari(v as Hari)}>
            <SelectTrigger>
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
          <Input value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} placeholder="07:00" />
          <Input value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} placeholder="07:40" />
          <Select value={jenisSlot} onValueChange={(v) => setJenisSlot(v as JenisSlot)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JENIS_SLOT_LIST.map((j) => (
                <SelectItem key={j} value={j}>
                  {JENIS_SLOT_LABELS[j]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {jenisSlot === "kbm" ? (
            <Input
              type="number"
              min={1}
              value={jamKe}
              onChange={(e) => setJamKe(e.target.value)}
              placeholder="Jam ke-"
            />
          ) : (
            <Button type="button" onClick={handleAdd} disabled={createSlot.isPending}>
              {createSlot.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            </Button>
          )}
          {jenisSlot === "kbm" && (
            <Button type="button" onClick={handleAdd} disabled={createSlot.isPending} className="col-span-2">
              {createSlot.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Tambah
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {slotsByHari
            .filter((g) => g.slots.length > 0)
            .map((group) => (
              <div key={group.hari}>
                <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{group.hari}</p>
                <div className="space-y-1">
                  {group.slots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
                    >
                      <span>
                        {s.jamMulai}–{s.jamSelesai}
                        {s.jamKe ? ` (Jam ke-${s.jamKe})` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{JENIS_SLOT_LABELS[s.jenisSlot]}</Badge>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          {(data?.items.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada jam pelajaran.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
