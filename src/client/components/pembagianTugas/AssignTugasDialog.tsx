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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignPembagianTugas } from "@/hooks/usePembagianTugas";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { useMapelQuery } from "@/hooks/useMapel";
import { useRombelQuery } from "@/hooks/useRombel";
import { ApiError } from "@/lib/api";

interface AssignTugasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRombelId?: string;
  initialMapelId?: string;
  initialGuruId?: string;
}

export function AssignTugasDialog({
  open,
  onOpenChange,
  initialRombelId,
  initialMapelId,
  initialGuruId,
}: AssignTugasDialogProps) {
  const { data: guruData } = useGuruSimple();
  const { data: mapelData } = useMapelQuery();
  const { data: rombelData } = useRombelQuery();
  const assign = useAssignPembagianTugas();

  const [guruId, setGuruId] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [rombelIds, setRombelIds] = useState<Set<string>>(new Set());
  const [isTeamTeaching, setIsTeamTeaching] = useState(false);

  useEffect(() => {
    if (open) {
      setGuruId(initialGuruId ?? "");
      setMapelId(initialMapelId ?? "");
      setRombelIds(new Set(initialRombelId ? [initialRombelId] : []));
      setIsTeamTeaching(false);
    }
  }, [open, initialRombelId, initialMapelId, initialGuruId]);

  function toggleRombel(id: string, checked: boolean) {
    setRombelIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!guruId || !mapelId || rombelIds.size === 0) return;
    assign.mutate(
      { guruId, mapelId, rombelIds: [...rombelIds], isTeamTeaching },
      {
        onSuccess: (res) => {
          if (res.assigned > 0) toast.success(`${res.assigned} penugasan berhasil ditambahkan.`);
          if (res.skipped.length > 0) {
            toast.warning(`${res.skipped.length} rombel dilewati: ${res.skipped[0]!.reason}`);
          }
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menugaskan."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Penugasan Mengajar</DialogTitle>
          <DialogDescription>
            Satu guru + satu mapel bisa ditugaskan ke banyak rombel sekaligus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Guru</Label>
            <Select value={guruId} onValueChange={setGuruId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih guru" />
              </SelectTrigger>
              <SelectContent>
                {(guruData?.items ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.namaLengkap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Mata Pelajaran</Label>
            <Select value={mapelId} onValueChange={setMapelId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih mapel" />
              </SelectTrigger>
              <SelectContent>
                {(mapelData?.items ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Rombel</Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border p-3">
              {(rombelData?.items ?? []).map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={rombelIds.has(r.id)}
                    onCheckedChange={(checked) => toggleRombel(r.id, checked === true)}
                  />
                  {r.tingkat} {r.nama}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="font-normal">Team Teaching (lebih dari 1 guru)</Label>
            <Switch checked={isTeamTeaching} onCheckedChange={setIsTeamTeaching} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!guruId || !mapelId || rombelIds.size === 0 || assign.isPending}
          >
            {assign.isPending && <Loader2 className="animate-spin" />}
            Tugaskan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
