import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createKalenderEntriSchema, type CreateKalenderEntriInput } from "@shared/schemas/kalenderAkademik.schema";
import { KALENDER_JENIS_LIST, KALENDER_JENIS_LABELS, KALENDER_CAKUPAN_LIST, TINGKAT_LIST } from "@shared/constants";
import type { KalenderEntriItem } from "@shared/types";
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
import { Switch } from "@/components/ui/switch";
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
import { useCreateKalenderEntri, useUpdateKalenderEntri } from "@/hooks/useKalenderAkademik";
import { ApiError } from "@/lib/api";

interface KalenderEntriFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entri?: KalenderEntriItem;
}

const EMPTY_DEFAULTS: CreateKalenderEntriInput = {
  nama: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  jenis: "LIBUR_NASIONAL",
  kbmDitiadakan: true,
  cakupan: "SEMUA",
  tingkatBerlaku: [],
  keterangan: "",
};

export function KalenderEntriFormDialog({ open, onOpenChange, entri }: KalenderEntriFormDialogProps) {
  const isEdit = !!entri;
  const createEntri = useCreateKalenderEntri();
  const updateEntri = useUpdateKalenderEntri(entri?.id ?? "");
  const mutation = isEdit ? updateEntri : createEntri;

  const form = useForm<CreateKalenderEntriInput>({
    resolver: zodResolver(createKalenderEntriSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        entri
          ? {
              nama: entri.nama,
              tanggalMulai: entri.tanggalMulai,
              tanggalSelesai: entri.tanggalSelesai,
              jenis: entri.jenis,
              kbmDitiadakan: entri.kbmDitiadakan,
              cakupan: entri.cakupan,
              tingkatBerlaku: entri.tingkatBerlaku,
              keterangan: entri.keterangan ?? "",
            }
          : EMPTY_DEFAULTS,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entri?.id]);

  const cakupan = form.watch("cakupan");

  function onSubmit(values: CreateKalenderEntriInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    const onSuccess = () => {
      toast.success(isEdit ? "Entri kalender berhasil diperbarui." : "Entri kalender berhasil ditambahkan.");
      onOpenChange(false);
    };
    if (isEdit) updateEntri.mutate(values, { onSuccess, onError });
    else createEntri.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Entri Kalender" : "Tambah Entri Kalender"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Libur Maulid Nabi" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tanggalMulai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggalSelesai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Selesai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="jenis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KALENDER_JENIS_LIST.map((j) => (
                        <SelectItem key={j} value={j}>
                          {KALENDER_JENIS_LABELS[j]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <FormField
                control={form.control}
                name="kbmDitiadakan"
                render={({ field }) => (
                  <FormItem className="flex flex-1 items-center justify-between gap-2">
                    <FormLabel className="font-normal">KBM Ditiadakan</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cakupan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cakupan</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KALENDER_CAKUPAN_LIST.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === "SEMUA" ? "Semua Rombel" : "Tingkat Tertentu"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {cakupan === "TINGKAT" && (
              <FormField
                control={form.control}
                name="tingkatBerlaku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tingkat Berlaku</FormLabel>
                    <div className="flex gap-4">
                      {TINGKAT_LIST.map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.value.includes(t)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked ? [...field.value, t] : field.value.filter((v) => v !== t),
                              )
                            }
                          />
                          {t}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="keterangan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
