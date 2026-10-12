import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createTindakLanjutSchema, type CreateTindakLanjutInput } from "@shared/schemas/tindakLanjut.schema";
import { TINDAK_LANJUT_JENIS_LIST, TINDAK_LANJUT_JENIS_LABELS } from "@shared/constants";
import type { SanksiSiswaItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateTindakLanjut, useUploadTindakLanjutLampiran, useRiwayatTindakLanjut } from "@/hooks/useTindakLanjut";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";

interface Props {
  sanksi: SanksiSiswaItem | null;
  onOpenChange: (open: boolean) => void;
}

function emptyDefaults(): CreateTindakLanjutInput {
  return {
    sanksiSiswaId: "",
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: "pembinaan",
    hasil: "",
    lampiranFileId: null,
    statusBaru: "proses",
  };
}

export function CatatTindakLanjutDialog({ sanksi, onOpenChange }: Props) {
  const createTindakLanjut = useCreateTindakLanjut();
  const uploadLampiran = useUploadTindakLanjutLampiran();
  const { data: riwayatData, isLoading: riwayatLoading } = useRiwayatTindakLanjut(sanksi?.id ?? null);

  const form = useForm<CreateTindakLanjutInput>({
    resolver: zodResolver(createTindakLanjutSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (sanksi) {
      form.reset({
        ...emptyDefaults(),
        sanksiSiswaId: sanksi.id,
        statusBaru: sanksi.status === "belum" ? "proses" : "selesai",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanksi?.id]);

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

  function onSubmit(values: CreateTindakLanjutInput) {
    createTindakLanjut.mutate(values, {
      onSuccess: () => {
        toast.success("Tindak lanjut tercatat.");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  const lampiranFileId = form.watch("lampiranFileId");
  const isDibatalkanOtomatis = sanksi?.status === "dibatalkan";

  return (
    <Dialog open={!!sanksi} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tindak Lanjut — {sanksi?.siswaNama}</DialogTitle>
        </DialogHeader>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Riwayat</p>
          {riwayatLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (riwayatData?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tindak lanjut tercatat.</p>
          ) : (
            <div className="space-y-2">
              {riwayatData!.items.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-2 text-sm">
                  <p className="font-medium text-foreground">
                    {TINDAK_LANJUT_JENIS_LABELS[r.jenis]} — {r.tanggal}
                  </p>
                  {r.hasil && <p className="text-muted-foreground">{r.hasil}</p>}
                  <p className="text-xs text-muted-foreground">oleh {r.petugasNama}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {isDibatalkanOtomatis ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            Sanksi ini sudah dibatalkan otomatis karena poin siswa turun di bawah ambang setelah pembatalan
            pelanggaran — tidak bisa dicatat tindak lanjut baru.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-sm font-medium text-foreground">Catat Tindak Lanjut Baru</p>
              <div className="grid grid-cols-2 gap-3">
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
                          {TINDAK_LANJUT_JENIS_LIST.map((j) => (
                            <SelectItem key={j} value={j}>
                              {TINDAK_LANJUT_JENIS_LABELS[j]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hasil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasil (opsional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Catatan hasil pembinaan/pertemuan..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statusBaru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubah Status Sanksi Menjadi</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="proses">Dalam proses</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
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
                  Tutup
                </Button>
                <Button type="submit" disabled={createTindakLanjut.isPending}>
                  {createTindakLanjut.isPending && <Loader2 className="animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
