import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createIzinSiswaSchema, type CreateIzinSiswaInput } from "@shared/schemas/izinSiswa.schema";
import { IZIN_STATUS_LIST, IZIN_STATUS_LABELS } from "@shared/constants";
import type { IzinHarianSiswaItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateIzinSiswa, useUpdateIzinSiswa, useUploadIzinLampiran } from "@/hooks/useIzinSiswa";
import { useRombelQuery } from "@/hooks/useRombel";
import { useSiswaQuery } from "@/hooks/useSiswa";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";

interface IzinSiswaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  izin?: IzinHarianSiswaItem;
}

const EMPTY_DEFAULTS: CreateIzinSiswaInput = {
  siswaId: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  status: "S",
  keterangan: "",
  lampiranFileId: null,
};

export function IzinSiswaFormDialog({ open, onOpenChange, izin }: IzinSiswaFormDialogProps) {
  const isEdit = !!izin;
  const createIzin = useCreateIzinSiswa();
  const updateIzin = useUpdateIzinSiswa(izin?.id ?? "");
  const uploadLampiran = useUploadIzinLampiran();
  const mutation = isEdit ? updateIzin : createIzin;

  const [rombelId, setRombelId] = useState("");
  const { data: rombelData } = useRombelQuery();
  const { data: siswaData } = useSiswaQuery({
    page: 1,
    pageSize: 100,
    search: "",
    status: "AKTIF",
    rombelId: rombelId || null,
  });

  const form = useForm<CreateIzinSiswaInput>({
    resolver: zodResolver(createIzinSiswaSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setRombelId("");
      form.reset(
        izin
          ? {
              siswaId: izin.siswaId,
              tanggalMulai: izin.tanggalMulai,
              tanggalSelesai: izin.tanggalSelesai,
              status: izin.status,
              keterangan: izin.keterangan ?? "",
              lampiranFileId: izin.lampiranFileId,
            }
          : EMPTY_DEFAULTS,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, izin?.id]);

  async function handleLampiranChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const compressed = await compressImage(file, { maxDimension: 1600, targetBytes: 300 * 1024 });
    uploadLampiran.mutate(compressed, {
      onSuccess: (res) => {
        form.setValue("lampiranFileId", res.fileId);
        toast.success("Lampiran berhasil diunggah.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengunggah lampiran."),
    });
  }

  function onSubmit(values: CreateIzinSiswaInput) {
    const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    const onSuccess = () => {
      toast.success(isEdit ? "Izin berhasil diperbarui." : "Izin berhasil dicatat.");
      onOpenChange(false);
    };
    if (isEdit) {
      const { siswaId: _siswaId, ...rest } = values;
      updateIzin.mutate(rest, { onSuccess, onError });
    } else {
      createIzin.mutate(values, { onSuccess, onError });
    }
  }

  const lampiranFileId = form.watch("lampiranFileId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Izin/Sakit" : "Catat Izin/Sakit"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEdit ? (
              <>
                <FormItem>
                  <FormLabel>Rombel</FormLabel>
                  <Select value={rombelId} onValueChange={setRombelId}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih rombel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(rombelData?.items ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
                <FormField
                  control={form.control}
                  name="siswaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Siswa</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!rombelId}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={rombelId ? "Pilih siswa" : "Pilih rombel dulu"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(siswaData?.items ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.namaLengkap}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Siswa: {izin.siswaNama}</p>
            )}
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
                      {IZIN_STATUS_LIST.map((s) => (
                        <SelectItem key={s} value={s}>
                          {IZIN_STATUS_LABELS[s]}
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
              name="keterangan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (opsional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Lampiran (opsional)</FormLabel>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploadLampiran.isPending} asChild>
                  <label className="cursor-pointer">
                    {uploadLampiran.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                    Unggah Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleLampiranChange} />
                  </label>
                </Button>
                {lampiranFileId && <span className="text-xs text-success">Lampiran terunggah</span>}
              </div>
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
