import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createRoleSchema, type CreateRoleInput } from "@shared/schemas/role.schema";
import type { RoleListItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateRole, useUpdateRole } from "@/hooks/useRoleMutations";
import { ApiError } from "@/lib/api";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleListItem;
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEdit = !!role;
  const createRole = useCreateRole();
  const updateRole = useUpdateRole(role?.id ?? "");
  const mutation = isEdit ? updateRole : createRole;

  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: role?.name ?? "", description: role?.description ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role?.id]);

  function onSubmit(values: CreateRoleInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan role.");
    const onSuccess = () => {
      toast.success(isEdit ? "Role berhasil diperbarui." : "Role berhasil dibuat.");
      onOpenChange(false);
    };

    if (isEdit) {
      updateRole.mutate(values, { onSuccess, onError });
    } else {
      createRole.mutate(values, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Role" : "Buat Role Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Role</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="contoh: TU Persuratan" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
