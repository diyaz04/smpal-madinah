import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createPrestasiSchema, type CreatePrestasiInput } from "@shared/schemas/prestasi.schema";
import {
  PRESTASI_BIDANG_LIST,
  PRESTASI_BIDANG_LABELS,
  PRESTASI_TINGKAT_LIST,
  PRESTASI_TINGKAT_LABELS,
  PRESTASI_JENIS_LIST,
  PRESTASI_JENIS_LABELS,
} from "@shared/constants";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreatePrestasi, useUploadPrestasiSertifikat } from "@/hooks/usePrestasi";
import { useSiswaQuery } from "@/hooks/useSiswa";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function emptyDefaults(): CreatePrestasiInput {
  return {
    siswaIds: [],
    namaKegiatan: "",
    bidang: "akademik",
    tingkat: "sekolah",
    capaian: "",
    jenis: "individu",
    penyelenggara: "",
    tanggal: new Date().toISOString().slice(0, 10),
    keterangan: "",
    sertifikatFileId: null,
    tampilDiRaport: true,
    judulRaport: "",
    keteranganRaport: "",
  };
}

export function PencatatanPrestasiDialog({ open, onOpenChange }: Props) {
  const createPrestasi = useCreatePrestasi();
  const uploadSertifikat = useUploadPrestasiSertifikat();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: siswaData, isFetching: searching } = useSiswaQuery({
    page: 1,
    pageSize: 10,
    search: debouncedSearch,
    status: "AKTIF",
    rombelId: null,
  });
  const [selectedSiswa, setSelectedSiswa] = useState<{ id: string; nama: string }[]>([]);

  const form = useForm<CreatePrestasiInput>({
    resolver: zodResolver(createPrestasiSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      setSelectedSiswa([]);
      setSearch("");
      form.reset(emptyDefaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    form.setValue("siswaIds", selectedSiswa.map((s) => s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiswa]);

  function addSiswa(s: { id: string; namaLengkap: string }) {
    if (selectedSiswa.some((x) => x.id === s.id)) return;
    setSelectedSiswa((prev) => [...prev, { id: s.id, nama: s.namaLengkap }]);
  }

  function removeSiswa(id: string) {
    setSelectedSiswa((prev) => prev.filter((s) => s.id !== id));
  }

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

  function onSubmit(values: CreatePrestasiInput) {
    createPrestasi.mutate(values, {
      onSuccess: (res) => {
        toast.success(`Prestasi tercatat untuk ${res.count} siswa.`);
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  const sertifikatFileId = form.watch("sertifikatFileId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Prestasi</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="siswaIds"
              render={() => (
                <FormItem>
                  <FormLabel>Siswa</FormLabel>
                  {selectedSiswa.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {selectedSiswa.map((s) => (
                        <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                          {s.nama}
                          <button type="button" onClick={() => removeSiswa(s.id)} className="rounded-full hover:bg-muted-foreground/20">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama / NIS siswa..."
                      className="pl-8"
                    />
                  </div>
                  {search.trim() !== "" && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                      {searching ? (
                        <p className="p-2 text-sm text-muted-foreground">Mencari...</p>
                      ) : (siswaData?.items.length ?? 0) === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground">Tidak ditemukan.</p>
                      ) : (
                        siswaData!.items.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => addSiswa(s)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <span>{s.namaLengkap}</span>
                            <span className="text-xs text-muted-foreground">{s.rombel?.nama ?? "—"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="namaKegiatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kegiatan/Lomba</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Lomba Pidato Bahasa Indonesia" />
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
                      <Input {...field} placeholder="Juara 1" />
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
                      <Input {...field} placeholder="Dinas Pendidikan" />
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="judulRaport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Raport (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Otomatis dari capaian + kegiatan" />
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
                    <FormLabel>Keterangan Raport (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Otomatis dari penyelenggara + semester" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={createPrestasi.isPending}>
                {createPrestasi.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
