import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createRombelSchema, type CreateRombelInput } from "@shared/schemas/rombel.schema";
import { TINGKAT_LIST } from "@shared/constants";
import type { RombelListItem } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCreateRombel, useUpdateRombel } from "@/hooks/useRombel";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { ApiError } from "@/lib/api";

interface RombelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rombel?: RombelListItem;
}

const NONE_VALUE = "__none__";

export function RombelFormDialog({ open, onOpenChange, rombel }: RombelFormDialogProps) {
  const isEdit = !!rombel;
  const { data: guruData } = useGuruSimple();
  const createRombel = useCreateRombel();
  const updateRombel = useUpdateRombel(rombel?.id ?? "");
  const mutation = isEdit ? updateRombel : createRombel;

  const form = useForm<CreateRombelInput>({
    resolver: zodResolver(createRombelSchema),
    defaultValues: { tingkat: "VII", nama: "", waliGuruId: null, urutan: 0 },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        tingkat: rombel?.tingkat ?? "VII",
        nama: rombel?.nama ?? "",
        waliGuruId: rombel?.waliGuru?.id ?? null,
        urutan: rombel?.urutan ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rombel?.id]);

  function onSubmit(values: CreateRombelInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan rombel.");
    const onSuccess = (res: { warning: string | null }) => {
      toast.success(isEdit ? "Rombel berhasil diperbarui." : "Rombel berhasil dibuat.");
      if (res.warning) toast.warning(res.warning);
      onOpenChange(false);
    };
    if (isEdit) updateRombel.mutate(values, { onSuccess, onError });
    else createRombel.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Rombel" : "Tambah Rombel"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tingkat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tingkat</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TINGKAT_LIST.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
                  <FormLabel>Nama Rombel</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="7A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="waliGuruId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wali Kelas</FormLabel>
                  <Select
                    value={field.value ?? NONE_VALUE}
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Belum dipilih" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Belum dipilih</SelectItem>
                      {(guruData?.items ?? []).map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.namaLengkap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
