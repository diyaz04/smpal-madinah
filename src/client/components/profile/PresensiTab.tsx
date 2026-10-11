import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { gantiPinSchema, type GantiPinInput } from "@shared/schemas/presensiGuru.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

function useGantiPin() {
  return useMutation({
    mutationFn: (input: GantiPinInput) => api.put<{ ok: true }>("/profile/pin", input),
  });
}

export function PresensiTab() {
  const gantiPin = useGantiPin();

  const form = useForm<GantiPinInput>({
    resolver: zodResolver(gantiPinSchema),
    defaultValues: { pinLama: "", pinBaru: "", konfirmasiPinBaru: "" },
  });

  function onSubmit(values: GantiPinInput) {
    gantiPin.mutate(values, {
      onSuccess: () => {
        toast.success("PIN presensi berhasil diganti.");
        form.reset();
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengganti PIN."),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        PIN ini dipakai sebagai cadangan presensi di kiosk kalau wajah tidak terdeteksi. PIN awal = tahun lahir Anda.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm space-y-4">
          <FormField
            control={form.control}
            name="pinLama"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIN Saat Ini</FormLabel>
                <FormControl>
                  <Input type="password" inputMode="numeric" maxLength={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pinBaru"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIN Baru (4-6 digit)</FormLabel>
                <FormControl>
                  <Input type="password" inputMode="numeric" maxLength={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="konfirmasiPinBaru"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konfirmasi PIN Baru</FormLabel>
                <FormControl>
                  <Input type="password" inputMode="numeric" maxLength={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={gantiPin.isPending}>
            {gantiPin.isPending && <Loader2 className="animate-spin" />}
            Ganti PIN
          </Button>
        </form>
      </Form>
    </div>
  );
}
