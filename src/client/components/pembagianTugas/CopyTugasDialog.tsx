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
import { useAcademicPeriodsQuery } from "@/hooks/useAcademicPeriods";
import { useCopyPembagianTugasFromPeriod } from "@/hooks/usePembagianTugas";
import { ApiError } from "@/lib/api";
import { SEMESTER_LABELS } from "@shared/constants";

interface CopyTugasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPeriodId: string;
}

export function CopyTugasDialog({ open, onOpenChange, currentPeriodId }: CopyTugasDialogProps) {
  const { data } = useAcademicPeriodsQuery();
  const [sourcePeriodId, setSourcePeriodId] = useState("");
  const copyTugas = useCopyPembagianTugasFromPeriod();

  const otherPeriods = (data?.periods ?? []).filter((p) => p.id !== currentPeriodId);

  function handleSubmit() {
    if (!sourcePeriodId) return;
    copyTugas.mutate(
      { sourcePeriodId },
      {
        onSuccess: (res) => {
          toast.success(`${res.count} penugasan berhasil disalin.`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyalin."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salin Pembagian Tugas dari Periode Lain</DialogTitle>
          <DialogDescription>
            Penugasan yang sudah ada dengan kombinasi rombel+mapel+guru yang sama tidak akan disalin
            ulang.
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!sourcePeriodId || copyTugas.isPending}>
            {copyTugas.isPending && <Loader2 className="animate-spin" />}
            Salin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
