import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSiswaSchema, type CreateSiswaInput } from "@shared/schemas/siswa.schema";
import { JENIS_KELAMIN_LIST, JENIS_KELAMIN_LABELS, SISWA_STATUSES, SISWA_STATUS_LABELS } from "@shared/constants";
import type { SiswaDetail } from "@shared/types";
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
import { useCreateSiswa, useUpdateSiswa } from "@/hooks/useSiswa";
import { useRombelQuery } from "@/hooks/useRombel";
import { ApiError } from "@/lib/api";

interface SiswaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siswa?: SiswaDetail;
}

const NONE_VALUE = "__none__";

const EMPTY_DEFAULTS: CreateSiswaInput = {
  nis: "",
  nisn: "",
  namaLengkap: "",
  namaPanggilan: "",
  jenisKelamin: "L",
  tempatLahir: "",
  tanggalLahir: "",
  agama: "",
  alamat: "",
  namaAyah: "",
  namaIbu: "",
  namaWali: "",
  noHpOrtu: "",
  pekerjaanOrtu: "",
  status: "AKTIF",
  statusKeterangan: "",
  rombelId: null,
};

export function SiswaFormDialog({ open, onOpenChange, siswa }: SiswaFormDialogProps) {
  const isEdit = !!siswa;
  const { data: rombelData } = useRombelQuery();
  const createSiswa = useCreateSiswa();
  const updateSiswa = useUpdateSiswa(siswa?.id ?? "");
  const mutation = isEdit ? updateSiswa : createSiswa;

  const form = useForm<CreateSiswaInput>({
    resolver: zodResolver(createSiswaSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        siswa
          ? {
              nis: siswa.nis,
              nisn: siswa.nisn,
              namaLengkap: siswa.namaLengkap,
              namaPanggilan: siswa.namaPanggilan ?? "",
              jenisKelamin: siswa.jenisKelamin,
              tempatLahir: siswa.tempatLahir ?? "",
              tanggalLahir: siswa.tanggalLahir ?? "",
              agama: siswa.agama ?? "",
              alamat: siswa.alamat ?? "",
              namaAyah: siswa.namaAyah ?? "",
              namaIbu: siswa.namaIbu ?? "",
              namaWali: siswa.namaWali ?? "",
              noHpOrtu: siswa.noHpOrtu ?? "",
              pekerjaanOrtu: siswa.pekerjaanOrtu ?? "",
              status: siswa.status,
              statusKeterangan: siswa.statusKeterangan ?? "",
              rombelId: siswa.rombel?.id ?? null,
            }
          : EMPTY_DEFAULTS,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, siswa?.id]);

  function onSubmit(values: CreateSiswaInput) {
    const onError = (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan siswa.");
    const onSuccess = () => {
      toast.success(isEdit ? "Data siswa berhasil diperbarui." : "Siswa berhasil ditambahkan.");
      onOpenChange(false);
    };
    if (isEdit) updateSiswa.mutate(values, { onSuccess, onError });
    else createSiswa.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Data Siswa" : "Tambah Siswa"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="namaLengkap"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namaPanggilan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Panggilan</FormLabel>
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
                name="nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIS</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nisn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NISN</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                name="agama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agama</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rombelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rombel (periode aktif)</FormLabel>
                    <Select
                      value={field.value ?? NONE_VALUE}
                      onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Belum ditempatkan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Belum ditempatkan</SelectItem>
                        {(rombelData?.items ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.tingkat} {r.nama}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SISWA_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SISWA_STATUS_LABELS[s]}
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
                name="namaAyah"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Ayah</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namaIbu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Ibu</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namaWali"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Wali (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noHpOrtu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. HP Orang Tua</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="628..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pekerjaanOrtu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pekerjaan Orang Tua</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              <FormField
                control={form.control}
                name="statusKeterangan"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Keterangan Status (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Contoh: pindah ke SMP Negeri 1" />
                    </FormControl>
                    <FormMessage />
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
