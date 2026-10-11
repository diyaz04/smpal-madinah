import { Share, SquarePlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IosInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IosInstallDialog({ open, onOpenChange }: IosInstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instal Aplikasi di iPhone/iPad</DialogTitle>
          <DialogDescription>Safari belum mendukung instal otomatis. Ikuti langkah berikut:</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Share className="h-3.5 w-3.5" />
            </span>
            Ketuk tombol <strong>Share</strong> (bagikan) di bilah bawah Safari.
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <SquarePlus className="h-3.5 w-3.5" />
            </span>
            Pilih <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
