import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { PelanggaranItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBatalkanPelanggaran } from "@/hooks/usePelanggaran";
import { ApiError } from "@/lib/api";

interface Props {
  item: PelanggaranItem | null;
  onOpenChange: (open: boolean) => void;
}

export function BatalkanPelanggaranDialog({ item, onOpenChange }: Props) {
  const [alasan, setAlasan] = useState("");
  const batalkan = useBatalkanPelanggaran(item?.id ?? "");

  useEffect(() => {
    if (item) setAlasan("");
  }, [item]);

  function handleSubmit() {
    if (!item) return;
    if (alasan.trim() === "") {
      toast.error("Alasan pembatalan wajib diisi.");
      return;
    }
    batalkan.mutate(
      { alasanBatal: alasan },
      {
        onSuccess: () => {
          toast.success("Pelanggaran dibatalkan, poin direkap ulang.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal membatalkan."),
      },
    );
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Batalkan Catatan Pelanggaran?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {item?.siswaNama} — {item?.jenisNama} ({item?.poin} poin). Poin akan dikurangi dari rekap tahun
          ajaran ini.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Alasan Pembatalan</label>
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} placeholder="Salah catat, dsb." />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" variant="destructive" disabled={batalkan.isPending} onClick={handleSubmit}>
            {batalkan.isPending && <Loader2 className="animate-spin" />}
            Batalkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
