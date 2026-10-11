import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createGuruSchema, type CreateGuruInput } from "@shared/schemas/guru.schema";
import { JENIS_KELAMIN_LIST, JENIS_KELAMIN_LABELS, STATUS_KEPEGAWAIAN_LIST } from "@shared/constants";
import type { GuruListItem, GuruDetail } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useCreateGuru, useUpdateGuru } from "@/hooks/useGuru";
import { ApiError } from "@/lib/api";

interface GuruFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guru?: GuruDetail;
  onCreated?: (item: GuruListItem) => void;
}

const EMPTY_DEFAULTS: CreateGuruInput = {
  nip: "",
  nuptk: "",
  namaLengkap: "",
  namaTanpaGelar: "",
  jenisKelamin: "L",
  tempatLahir: "",
  tanggalLahir: "",
  noHp: "",
  email: "",
  alamat: "",
  statusKepegawaian: "GTY",
  tanggalMulaiTugas: "",
  isActive: true,
};

export function GuruFormDialog({ open, onOpenChange, guru, onCreated }: GuruFormDialogProps) {
  const isEdit = !!guru;
  const createGuru = useCreateGuru();
  const updateGuru = useUpdateGuru(guru?.id ?? "");
  const mutation = isEdit ? updateGuru : createGuru;
  const detail = guru;

  const form = useForm<CreateGuruInput>({
    resolver: zodResolver(createGuruSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        detail
          ? {
              nip: detail.nip ?? "",
              nuptk: detail.nuptk ?? "",
              namaLengkap: detail.namaLengkap,
              namaTanpaGelar: detail.namaTanpaGelar,
              jenisKelamin: detail.jenisKelamin,
              tempatLahir: detail.tempatLahir ?? "",
              tanggalLahir: detail.tanggalLahir,
              noHp: detail.noHp ?? "",
              email: detail.email ?? "",
              alamat: detail.alamat ?? "",
              statusKepegawaian: detail.statusKepegawaian,
              tanggalMulaiTugas: detail.tanggalMulaiTugas ?? "",
              isActive: detail.isActive,
            }
          : EMPTY_DEFAULTS,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guru?.id]);

  function onSubmit(values: CreateGuruInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan guru.");
    if (isEdit) {
      updateGuru.mutate(values, {
        onSuccess: () => {
          toast.success("Data guru berhasil diperbarui.");
          onOpenChange(false);
        },
        onError,
      });
    } else {
      createGuru.mutate(values, {
        onSuccess: ({ item }) => {
          toast.success("Guru berhasil ditambahkan.");
          onOpenChange(false);
          onCreated?.(item);
        },
        onError,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Data Guru" : "Tambah Guru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="namaLengkap"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Lengkap (dengan gelar)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ahmad Fauzi, S.Pd." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namaTanpaGelar"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Tanpa Gelar</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ahmad Fauzi" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nuptk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NUPTK (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jenisKelamin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Kelamin</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JENIS_KELAMIN_LIST.map((j) => (
                          <SelectItem key={j} value={j}>
                            {JENIS_KELAMIN_LABELS[j]}
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
                name="statusKepegawaian"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Kepegawaian</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_KEPEGAWAIAN_LIST.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
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
                name="tempatLahir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggalLahir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noHp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. HP</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggalMulaiTugas"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal Mulai Tugas</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-1 items-center justify-between gap-2">
                    <FormLabel className="font-normal">Aktif</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
