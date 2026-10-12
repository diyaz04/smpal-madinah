import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPelanggaranJenisSchema,
  type CreatePelanggaranJenisInput,
} from "@shared/schemas/pelanggaranJenis.schema";
import type { PelanggaranJenisItem, PelanggaranKategoriItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreatePelanggaranJenis, useUpdatePelanggaranJenis } from "@/hooks/usePelanggaranJenis";
import { ApiError } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jenis?: PelanggaranJenisItem;
  kategoriList: PelanggaranKategoriItem[];
}

const EMPTY_DEFAULTS: CreatePelanggaranJenisInput = {
  kategoriId: "",
  nama: "",
  poin: 5,
  deskripsi: "",
  aktif: true,
};

export function PelanggaranJenisFormDialog({ open, onOpenChange, jenis, kategoriList }: Props) {
  const isEdit = !!jenis;
  const createJenis = useCreatePelanggaranJenis();
  const updateJenis = useUpdatePelanggaranJenis(jenis?.id ?? "");
  const mutation = isEdit ? updateJenis : createJenis;

  const form = useForm<CreatePelanggaranJenisInput>({
    resolver: zodResolver(createPelanggaranJenisSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        jenis
          ? {
              kategoriId: jenis.kategoriId,
              nama: jenis.nama,
              poin: jenis.poin,
              deskripsi: jenis.deskripsi ?? "",
              aktif: jenis.aktif,
            }
          : { ...EMPTY_DEFAULTS, kategoriId: kategoriList[0]?.id ?? "" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jenis?.id]);

  function onSubmit(values: CreatePelanggaranJenisInput) {
    const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    const onSuccess = () => {
      toast.success(isEdit ? "Jenis pelanggaran berhasil diperbarui." : "Jenis pelanggaran berhasil ditambahkan.");
      onOpenChange(false);
    };
    mutation.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Jenis Pelanggaran" : "Tambah Jenis Pelanggaran"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kategoriId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {kategoriList.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.nama}
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
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Jenis</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Terlambat" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poin</FormLabel>
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
              name="deskripsi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aktif"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="mb-0">Aktif</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
