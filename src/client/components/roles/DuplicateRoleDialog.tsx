import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { RoleListItem } from "@shared/types";
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
import { Label } from "@/components/ui/label";
import { useDuplicateRole } from "@/hooks/useRoleMutations";
import { ApiError } from "@/lib/api";

interface DuplicateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleListItem | null;
}

export function DuplicateRoleDialog({ open, onOpenChange, role }: DuplicateRoleDialogProps) {
  const [name, setName] = useState("");
  const duplicate = useDuplicateRole();

  useEffect(() => {
    if (open && role) setName(`${role.name} (Salinan)`);
  }, [open, role]);

  function handleSubmit() {
    if (!role) return;
    duplicate.mutate(
      { roleId: role.id, input: { name } },
      {
        onSuccess: () => {
          toast.success("Role berhasil diduplikasi.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menduplikasi role."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplikat Role</DialogTitle>
          <DialogDescription>
            Membuat role baru dengan izin yang sama persis seperti "{role?.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="duplicate-role-name">Nama role baru</Label>
          <Input id="duplicate-role-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={duplicate.isPending || !name.trim()}>
            {duplicate.isPending && <Loader2 className="animate-spin" />}
            Duplikat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
