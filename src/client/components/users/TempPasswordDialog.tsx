import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TempPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  password: string;
}

export function TempPasswordDialog({ open, onOpenChange, username, password }: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API bisa gagal (izin, konteks tidak aman) — password tetap terlihat di layar.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle>Password Sementara</DialogTitle>
          <DialogDescription>
            Catat password ini sekarang — tidak akan ditampilkan lagi setelah dialog ini ditutup.
            User wajib menggantinya saat login pertama.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
          <div>
            <p className="text-xs text-muted-foreground">Username</p>
            <p className="font-mono text-sm font-medium text-foreground">{username}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Password</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-medium text-foreground">{password}</p>
              <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
