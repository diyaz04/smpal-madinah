import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeneratePairingCode } from "@/hooks/useKioskDevices";
import { ApiError } from "@/lib/api";

interface TambahPerangkatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TambahPerangkatDialog({ open, onOpenChange }: TambahPerangkatDialogProps) {
  const generate = useGeneratePairingCode();
  const [nama, setNama] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null);

  function handleClose(open: boolean) {
    if (!open) {
      setNama("");
      setLokasi("");
      setResult(null);
    }
    onOpenChange(open);
  }

  function handleSubmit() {
    if (!nama.trim()) {
      toast.error("Nama perangkat wajib diisi.");
      return;
    }
    generate.mutate(
      { nama, lokasi },
      {
        onSuccess: (res) => setResult(res),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal membuat kode pairing."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Perangkat Kiosk</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Masukkan kode ini di tablet pada halaman <code>/kiosk</code>. Berlaku 10 menit.
            </p>
            <p className="text-5xl font-bold tracking-widest text-foreground">{result.code}</p>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Selesai
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nama Perangkat</label>
                <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Tablet Kantor" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Lokasi (opsional)</label>
                <Input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Meja resepsionis" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Batal
              </Button>
              <Button type="button" disabled={generate.isPending} onClick={handleSubmit}>
                {generate.isPending && <Loader2 className="animate-spin" />}
                Buat Kode
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
