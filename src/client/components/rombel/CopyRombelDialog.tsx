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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicPeriodsQuery } from "@/hooks/useAcademicPeriods";
import { useCopyRombelFromPeriod } from "@/hooks/useRombel";
import { ApiError } from "@/lib/api";
import { SEMESTER_LABELS } from "@shared/constants";

interface CopyRombelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPeriodId: string;
}

export function CopyRombelDialog({ open, onOpenChange, currentPeriodId }: CopyRombelDialogProps) {
  const { data } = useAcademicPeriodsQuery();
  const [sourcePeriodId, setSourcePeriodId] = useState<string>("");
  const [keepWaliKelas, setKeepWaliKelas] = useState(false);
  const copyRombel = useCopyRombelFromPeriod();

  const otherPeriods = (data?.periods ?? []).filter((p) => p.id !== currentPeriodId);

  function handleSubmit() {
    if (!sourcePeriodId) return;
    copyRombel.mutate(
      { sourcePeriodId, keepWaliKelas },
      {
        onSuccess: (res) => {
          toast.success(`${res.count} rombel berhasil disalin.`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyalin rombel."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salin Rombel dari Periode Lain</DialogTitle>
          <DialogDescription>
            Rombel dengan nama yang sudah ada di periode ini tidak akan disalin ulang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={sourcePeriodId} onValueChange={setSourcePeriodId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih periode sumber" />
            </SelectTrigger>
            <SelectContent>
              {otherPeriods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.yearLabel} — {SEMESTER_LABELS[p.semester]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={keepWaliKelas} onCheckedChange={(v) => setKeepWaliKelas(v === true)} />
            Ikut salin wali kelas
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!sourcePeriodId || copyRombel.isPending}>
            {copyRombel.isPending && <Loader2 className="animate-spin" />}
            Salin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
