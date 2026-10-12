import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPelanggaranKategoriSchema,
  type CreatePelanggaranKategoriInput,
} from "@shared/schemas/pelanggaranKategori.schema";
import type { PelanggaranKategoriItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreatePelanggaranKategori, useUpdatePelanggaranKategori } from "@/hooks/usePelanggaranKategori";
import { ApiError } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kategori?: PelanggaranKategoriItem;
}

const EMPTY_DEFAULTS: CreatePelanggaranKategoriInput = { nama: "", warna: "#eab308" };

export function PelanggaranKategoriFormDialog({ open, onOpenChange, kategori }: Props) {
  const isEdit = !!kategori;
  const createKategori = useCreatePelanggaranKategori();
  const updateKategori = useUpdatePelanggaranKategori(kategori?.id ?? "");
  const mutation = isEdit ? updateKategori : createKategori;

  const form = useForm<CreatePelanggaranKategoriInput>({
    resolver: zodResolver(createPelanggaranKategoriSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(kategori ? { nama: kategori.nama, warna: kategori.warna } : EMPTY_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kategori?.id]);

  function onSubmit(values: CreatePelanggaranKategoriInput) {
    const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    const onSuccess = () => {
      toast.success(isEdit ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
      onOpenChange(false);
    };
    mutation.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Kategori" : "Tambah Kategori"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ringan / Sedang / Berat" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warna"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warna</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="color" {...field} className="h-9 w-16 p-1" />
                    </FormControl>
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="#eab308"
                      className="font-mono"
                    />
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
