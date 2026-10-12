import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSanksiAmbangSchema, type CreateSanksiAmbangInput } from "@shared/schemas/sanksiAmbang.schema";
import type { SanksiAmbangItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateSanksiAmbang, useUpdateSanksiAmbang } from "@/hooks/useSanksiAmbang";
import { ApiError } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambang?: SanksiAmbangItem;
}

const EMPTY_DEFAULTS: CreateSanksiAmbangInput = { poinMinimal: 25, nama: "", deskripsi: "" };

export function SanksiAmbangFormDialog({ open, onOpenChange, ambang }: Props) {
  const isEdit = !!ambang;
  const createAmbang = useCreateSanksiAmbang();
  const updateAmbang = useUpdateSanksiAmbang(ambang?.id ?? "");
  const mutation = isEdit ? updateAmbang : createAmbang;

  const form = useForm<CreateSanksiAmbangInput>({
    resolver: zodResolver(createSanksiAmbangSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        ambang
          ? { poinMinimal: ambang.poinMinimal, nama: ambang.nama, deskripsi: ambang.deskripsi ?? "" }
          : EMPTY_DEFAULTS,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ambang?.id]);

  function onSubmit(values: CreateSanksiAmbangInput) {
    const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    const onSuccess = () => {
      toast.success(isEdit ? "Ambang sanksi berhasil diperbarui." : "Ambang sanksi berhasil ditambahkan.");
      onOpenChange(false);
    };
    mutation.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Ambang Sanksi" : "Tambah Ambang Sanksi"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="poinMinimal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poin Minimal</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Sanksi</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Teguran lisan" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deskripsi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Tindakan (opsional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
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
