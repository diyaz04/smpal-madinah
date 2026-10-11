import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createUserSchema, type CreateUserInput } from "@shared/schemas/user.schema";
import { USER_STATUSES } from "@shared/constants";
import type { UserDetail } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAvailableRoles } from "@/hooks/useUsers";
import { useCreateUser, useUpdateUser } from "@/hooks/useUserMutations";
import { ApiError } from "@/lib/api";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDetail;
  onCreated?: (username: string, tempPassword: string) => void;
}

export function UserFormDialog({ open, onOpenChange, user, onCreated }: UserFormDialogProps) {
  const isEdit = !!user;
  const { data: rolesData } = useAvailableRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id ?? "");
  const mutation = isEdit ? updateUser : createUser;

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      phone: "",
      roleIds: [],
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        username: user?.username ?? "",
        fullName: user?.fullName ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        roleIds: user?.roles.map((r) => r.id) ?? [],
        status: user?.status ?? "ACTIVE",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  function onSubmit(values: CreateUserInput) {
    if (isEdit) {
      updateUser.mutate(values, {
        onSuccess: () => {
          toast.success("User berhasil diperbarui.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      });
    } else {
      createUser.mutate(values, {
        onSuccess: ({ tempPassword }) => {
          onOpenChange(false);
          onCreated?.(values.username, tempPassword);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Pengguna" : "Tambah Pengguna"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} autoCapitalize="none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opsional)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No. HP (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "ACTIVE" ? "Aktif" : "Nonaktif"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    {(rolesData?.roles ?? []).map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(role.id)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, role.id]
                                : field.value.filter((id) => id !== role.id),
                            );
                          }}
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
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
