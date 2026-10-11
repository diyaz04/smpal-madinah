import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { changePasswordSchema, type ChangePasswordInput } from "@shared/schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useChangePassword } from "@/hooks/useAuthMutations";
import { ApiError } from "@/lib/api";

export function ForcePasswordChangePage() {
  const changePassword = useChangePassword();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: ChangePasswordInput) {
    changePassword.mutate(values, {
      onSuccess: () => toast.success("Password berhasil diganti."),
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : "Gagal mengganti password.";
        toast.error(message);
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <KeyRound className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Wajib Ganti Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ini login pertama Anda (atau password baru saja direset). Silakan buat password baru
              sebelum melanjutkan.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password saat ini</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password baru</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi password baru</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="animate-spin" />}
                Simpan Password Baru
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
