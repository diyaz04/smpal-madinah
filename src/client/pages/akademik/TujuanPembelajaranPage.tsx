import { useState } from "react";
import { Target, Plus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePilihanMapelTingkatQuery,
  useTujuanPembelajaranQuery,
  useCreateTujuanPembelajaran,
  useUpdateTujuanPembelajaran,
  useDeleteTujuanPembelajaran,
  useSalinTujuanPembelajaran,
} from "@/hooks/useTujuanPembelajaran";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { TujuanPembelajaranItem } from "@shared/types";
import type { Tingkat } from "@shared/constants";

const MODULE = "tujuan_pembelajaran";

function BarisTp({ item }: { item: TujuanPembelajaranItem }) {
  const { can } = usePermission();
  const [editing, setEditing] = useState(false);
  const [kode, setKode] = useState(item.kode);
  const [deskripsi, setDeskripsi] = useState(item.deskripsi);
  const [deleting, setDeleting] = useState(false);
  const updateTp = useUpdateTujuanPembelajaran(item.id);
  const deleteTp = useDeleteTujuanPembelajaran();

  function handleSave() {
    updateTp.mutate(
      { kode, deskripsi },
      {
        onSuccess: () => {
          toast.success("TP diperbarui.");
          setEditing(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  function confirmDelete() {
    deleteTp.mutate(item.id, {
      onSuccess: () => toast.success("TP dihapus."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(false),
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-2">
        <Input value={kode} onChange={(e) => setKode(e.target.value)} className="w-24" placeholder="Kode" />
        <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi" />
        <Button size="sm" onClick={handleSave} disabled={updateTp.isPending}>
          Simpan
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
          Batal
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
      <div>
        <span className="font-mono text-sm text-muted-foreground">{item.kode}</span>{" "}
        <span className="text-sm text-foreground">{item.deskripsi}</span>
      </div>
      <div className="flex gap-1">
        {can(MODULE, "ubah") && (
          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {can(MODULE, "hapus") && item.bisaDihapus && (
          <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus TP ini?</AlertDialogTitle>
            <AlertDialogDescription>"{item.deskripsi}" akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TujuanPembelajaranPage() {
  const { can } = usePermission();
  const { data: pilihanData, isLoading: pilihanLoading } = usePilihanMapelTingkatQuery();
  const [pilihanKey, setPilihanKey] = useState<string>("");
  const [mapelId, tingkat] = pilihanKey ? pilihanKey.split("|") : [null, null];

  const { data, isLoading } = useTujuanPembelajaranQuery(mapelId, (tingkat as Tingkat) ?? null);
  const createTp = useCreateTujuanPembelajaran();
  const salinTp = useSalinTujuanPembelajaran();

  const [kodeBaru, setKodeBaru] = useState("");
  const [deskripsiBaru, setDeskripsiBaru] = useState("");
  const [dariPeriodId, setDariPeriodId] = useState("");

  function handleTambah() {
    if (!mapelId || !tingkat) return;
    if (!kodeBaru.trim() || !deskripsiBaru.trim()) {
      toast.error("Kode dan deskripsi wajib diisi.");
      return;
    }
    createTp.mutate(
      { mapelId, tingkat: tingkat as Tingkat, kode: kodeBaru, deskripsi: deskripsiBaru },
      {
        onSuccess: () => {
          toast.success("TP ditambahkan.");
          setKodeBaru("");
          setDeskripsiBaru("");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  function handleSalin() {
    if (!mapelId || !tingkat || !dariPeriodId.trim()) {
      toast.error("Isi ID periode sumber dulu.");
      return;
    }
    salinTp.mutate(
      { dariPeriodId, mapelId, tingkat: tingkat as Tingkat },
      {
        onSuccess: (res) => toast.success(`${res.count} TP disalin.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyalin."),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Tujuan Pembelajaran</h1>
      </div>

      {pilihanLoading ? (
        <Skeleton className="h-10 w-64" />
      ) : (pilihanData?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Anda belum mengampu mapel apa pun pada periode aktif.</p>
      ) : (
        <Select value={pilihanKey} onValueChange={setPilihanKey}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Pilih mapel + tingkat" />
          </SelectTrigger>
          <SelectContent>
            {pilihanData!.items.map((p) => (
              <SelectItem key={`${p.mapelId}|${p.tingkat}`} value={`${p.mapelId}|${p.tingkat}`}>
                {p.mapelNama} — Kelas {p.tingkat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {mapelId && tingkat && (
        <>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-2">
              {(data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada TP untuk mapel + tingkat ini.</p>
              ) : (
                data!.items.map((item) => <BarisTp key={item.id} item={item} />)
              )}
            </div>
          )}

          {can(MODULE, "tambah") && (
            <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-medium text-foreground">Tambah TP Baru</p>
              <div className="flex flex-wrap gap-2">
                <Input value={kodeBaru} onChange={(e) => setKodeBaru(e.target.value)} placeholder="Kode (TP1)" className="w-32" />
                <Input
                  value={deskripsiBaru}
                  onChange={(e) => setDeskripsiBaru(e.target.value)}
                  placeholder="Deskripsi singkat untuk raport"
                  className="flex-1"
                />
                <Button onClick={handleTambah} disabled={createTp.isPending}>
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Atau salin dari periode lain (ID periode):</p>
                <Input value={dariPeriodId} onChange={(e) => setDariPeriodId(e.target.value)} className="w-56" placeholder="ID periode sumber" />
                <Button variant="outline" size="sm" onClick={handleSalin} disabled={salinTp.isPending}>
                  <Copy className="h-3.5 w-3.5" /> Salin
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
