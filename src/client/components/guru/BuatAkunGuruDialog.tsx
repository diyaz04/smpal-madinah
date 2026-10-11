import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { buatAkunGuruSchema, type BuatAkunGuruInput } from "@shared/schemas/guru.schema";
import { SYSTEM_ROLE_NAMES } from "@shared/constants";
import type { GuruDetail } from "@shared/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAvailableRoles } from "@/hooks/useUsers";
import { useBuatAkunGuru } from "@/hooks/useGuru";
import { ApiError } from "@/lib/api";

export function suggestUsername(namaTanpaGelar: string): string {
  return namaTanpaGelar
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
}

interface BuatAkunGuruDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guru: GuruDetail | null;
  onCreated: (username: string, tempPassword: string) => void;
}

export function BuatAkunGuruDialog({ open, onOpenChange, guru, onCreated }: BuatAkunGuruDialogProps) {
  const { data: rolesData } = useAvailableRoles();
  const buatAkun = useBuatAkunGuru(guru?.id ?? "");

  const form = useForm<BuatAkunGuruInput>({
    resolver: zodResolver(buatAkunGuruSchema),
    defaultValues: { username: "", roleIds: [] },
  });

  useEffect(() => {
    if (open && guru) {
      const guruRoleId = rolesData?.roles.find((r) => r.name === SYSTEM_ROLE_NAMES.GURU)?.id;
      form.reset({
        username: suggestUsername(guru.namaTanpaGelar),
        roleIds: guruRoleId ? [guruRoleId] : [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guru?.id, rolesData?.roles.length]);

  function onSubmit(values: BuatAkunGuruInput) {
    buatAkun.mutate(values, {
      onSuccess: ({ username, tempPassword }) => {
        onOpenChange(false);
        onCreated(username, tempPassword);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal membuat akun."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Akun Login — {guru?.namaLengkap}</DialogTitle>
          <DialogDescription>
            Password sementara akan dibuat otomatis. Guru wajib menggantinya saat login pertama.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" disabled={buatAkun.isPending}>
                {buatAkun.isPending && <Loader2 className="animate-spin" />}
                Buat Akun
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
