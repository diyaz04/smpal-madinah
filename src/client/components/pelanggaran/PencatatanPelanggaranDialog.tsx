import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createPelanggaranSchema, type CreatePelanggaranInput } from "@shared/schemas/pelanggaran.schema";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreatePelanggaran, usePelanggaranJenisAktifQuery, useUploadPelanggaranFoto } from "@/hooks/usePelanggaran";
import { useSiswaQuery } from "@/hooks/useSiswa";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { compressImage } from "@/lib/imageCompress";
import { ApiError } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function nowDefaults() {
  const now = new Date();
  const tanggal = now.toISOString().slice(0, 10);
  const waktu = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { tanggal, waktu };
}

function emptyDefaults(): CreatePelanggaranInput {
  return { siswaIds: [], jenisId: "", ...nowDefaults(), lokasi: "", keterangan: "", fotoFileId: null };
}

export function PencatatanPelanggaranDialog({ open, onOpenChange }: Props) {
  const createPelanggaran = useCreatePelanggaran();
  const uploadFoto = useUploadPelanggaranFoto();
  const { data: jenisData } = usePelanggaranJenisAktifQuery();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: siswaData, isFetching: searching } = useSiswaQuery({
    page: 1,
    pageSize: 10,
    search: debouncedSearch,
    status: "AKTIF",
    rombelId: null,
  });
  const [selectedSiswa, setSelectedSiswa] = useState<{ id: string; nama: string; rombelNama: string | null }[]>([]);

  const form = useForm<CreatePelanggaranInput>({
    resolver: zodResolver(createPelanggaranSchema),
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

  function addSiswa(s: { id: string; namaLengkap: string; rombel: { nama: string } | null }) {
    if (selectedSiswa.some((x) => x.id === s.id)) return;
    setSelectedSiswa((prev) => [...prev, { id: s.id, nama: s.namaLengkap, rombelNama: s.rombel?.nama ?? null }]);
  }

  function removeSiswa(id: string) {
    setSelectedSiswa((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const compressed = await compressImage(file, { maxDimension: 1600, targetBytes: 300 * 1024 });
    uploadFoto.mutate(compressed, {
      onSuccess: (res) => {
        form.setValue("fotoFileId", res.fileId);
        toast.success("Foto bukti berhasil diunggah.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto."),
    });
  }

  function onSubmit(values: CreatePelanggaranInput) {
    createPelanggaran.mutate(values, {
      onSuccess: (res) => {
        toast.success(`Pelanggaran tercatat untuk ${res.count} siswa.`);
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  const fotoFileId = form.watch("fotoFileId");
  const jenisItems = jenisData?.items ?? [];
  const kategoriOrder = [...new Set(jenisItems.map((j) => j.kategoriNama))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Pelanggaran</DialogTitle>
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
              name="jenisId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Pelanggaran</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih jenis pelanggaran" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {kategoriOrder.map((kategoriNama) => (
                        <SelectGroup key={kategoriNama}>
                          <SelectLabel>{kategoriNama}</SelectLabel>
                          {jenisItems
                            .filter((j) => j.kategoriNama === kategoriNama)
                            .map((j) => (
                              <SelectItem key={j.id} value={j.id}>
                                {j.nama} ({j.poin} poin)
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="waktu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waktu</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lokasi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Gerbang depan, kelas, dll." />
                  </FormControl>
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
              <FormLabel>Foto Bukti (opsional)</FormLabel>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploadFoto.isPending} asChild>
                  <label className="cursor-pointer">
                    {uploadFoto.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                    Unggah Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  </label>
                </Button>
                {fotoFileId && <span className="text-xs text-success">Foto terunggah</span>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createPelanggaran.isPending}>
                {createPelanggaran.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
