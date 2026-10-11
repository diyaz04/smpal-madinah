import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, School } from "lucide-react";
import { toast } from "sonner";

import { loginSchema, type LoginInput } from "@shared/schemas/auth.schema";
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
import { usePublicBranding } from "@/hooks/usePublicBranding";
import { useLogin } from "@/hooks/useAuthMutations";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { data: branding } = usePublicBranding();
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    login.mutate(values, {
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : "Gagal login. Coba lagi.";
        toast.error(message);
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo sekolah" className="h-16 w-16 rounded-xl object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <School className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {branding?.schoolName ?? "SMP Al-Madinah"}
            </h1>
            <p className="text-sm text-muted-foreground">Masuk ke sistem administrasi</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending && <Loader2 className="animate-spin" />}
                Masuk
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
