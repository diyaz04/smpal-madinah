import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { updatePrestasiSchema, type UpdatePrestasiInput } from "@shared/schemas/prestasi.schema";
import {
  PRESTASI_BIDANG_LIST,
  PRESTASI_BIDANG_LABELS,
  PRESTASI_TINGKAT_LIST,
  PRESTASI_TINGKAT_LABELS,
  PRESTASI_JENIS_LIST,
  PRESTASI_JENIS_LABELS,
} from "@shared/constants";
import type { PrestasiItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUpdatePrestasi, useUploadPrestasiSertifikat } from "@/hooks/usePrestasi";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";

interface Props {
  item: PrestasiItem | null;
  onOpenChange: (open: boolean) => void;
}

export function EditPrestasiDialog({ item, onOpenChange }: Props) {
  const updatePrestasi = useUpdatePrestasi(item?.id ?? "");
  const uploadSertifikat = useUploadPrestasiSertifikat();

  const form = useForm<UpdatePrestasiInput>({
    resolver: zodResolver(updatePrestasiSchema),
    defaultValues: {
      namaKegiatan: "",
      bidang: "akademik",
      tingkat: "sekolah",
      capaian: "",
      jenis: "individu",
      penyelenggara: "",
      tanggal: "",
      keterangan: "",
      sertifikatFileId: null,
      tampilDiRaport: true,
      judulRaport: "",
      keteranganRaport: "",
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        namaKegiatan: item.namaKegiatan,
        bidang: item.bidang,
        tingkat: item.tingkat,
        capaian: item.capaian,
        jenis: item.jenis,
        penyelenggara: item.penyelenggara ?? "",
        tanggal: item.tanggal,
        keterangan: item.keterangan ?? "",
        sertifikatFileId: item.sertifikatFileId,
        tampilDiRaport: item.tampilDiRaport,
        judulRaport: item.judulRaport,
        keteranganRaport: item.keteranganRaport,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  async function handleSertifikatChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const toUpload = file.type === "application/pdf" ? file : await compressImage(file, { maxDimension: 1600, targetBytes: 300 * 1024 });
    uploadSertifikat.mutate(toUpload, {
      onSuccess: (res) => {
        form.setValue("sertifikatFileId", res.fileId);
        toast.success("Sertifikat berhasil diunggah.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengunggah sertifikat."),
    });
  }

  function onSubmit(values: UpdatePrestasiInput) {
    updatePrestasi.mutate(values, {
      onSuccess: () => {
        toast.success("Prestasi berhasil diperbarui.");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  const sertifikatFileId = form.watch("sertifikatFileId");

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah Prestasi — {item?.siswaNama}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="namaKegiatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kegiatan/Lomba</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="bidang"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bidang</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRESTASI_BIDANG_LIST.map((b) => (
                          <SelectItem key={b} value={b}>
                            {PRESTASI_BIDANG_LABELS[b]}
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
                        {PRESTASI_TINGKAT_LIST.map((t) => (
                          <SelectItem key={t} value={t}>
                            {PRESTASI_TINGKAT_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="capaian"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capaian</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        {PRESTASI_JENIS_LIST.map((j) => (
                          <SelectItem key={j} value={j}>
                            {PRESTASI_JENIS_LABELS[j]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="penyelenggara"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penyelenggara (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal</FormLabel>
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

            <FormField
              control={form.control}
              name="judulRaport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul Raport</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keteranganRaport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan Raport</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tampilDiRaport"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="mb-0">Tampil di Raport</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Sertifikat (opsional)</FormLabel>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploadSertifikat.isPending} asChild>
                  <label className="cursor-pointer">
                    {uploadSertifikat.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                    Unggah Sertifikat
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleSertifikatChange} />
                  </label>
                </Button>
                {sertifikatFileId && <span className="text-xs text-success">Sertifikat terunggah</span>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={updatePrestasi.isPending}>
                {updatePrestasi.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
