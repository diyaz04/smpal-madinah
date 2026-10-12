import { useEffect, useState } from "react";
import { Trophy, Plus, Download, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";

import {
  PRESTASI_BIDANG_LIST,
  PRESTASI_BIDANG_LABELS,
  PRESTASI_TINGKAT_LIST,
  PRESTASI_TINGKAT_LABELS,
} from "@shared/constants";
import type { PrestasiItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PencatatanPrestasiDialog } from "@/components/prestasi/PencatatanPrestasiDialog";
import { EditPrestasiDialog } from "@/components/prestasi/EditPrestasiDialog";
import { usePrestasiList, useDeletePrestasi, type PrestasiFilters } from "@/hooks/usePrestasi";
import { useRombelQuery } from "@/hooks/useRombel";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";

const MODULE = "prestasi";

async function exportExcel(items: PrestasiItem[]) {
  const XLSX = await import("xlsx");
  const rows = items.map((r) => ({
    Siswa: r.siswaNama,
    Rombel: r.rombelNama ?? "-",
    Kegiatan: r.namaKegiatan,
    Bidang: PRESTASI_BIDANG_LABELS[r.bidang],
    Tingkat: PRESTASI_TINGKAT_LABELS[r.tingkat],
    Capaian: r.capaian,
    Tanggal: r.tanggal,
    Penyelenggara: r.penyelenggara ?? "-",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Prestasi");
  XLSX.writeFile(wb, `prestasi-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function PrestasiPage() {
  const { can } = usePermission();
  const { data: rombelData } = useRombelQuery();

  const [filters, setFilters] = useState<PrestasiFilters>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<PrestasiItem[]>([]);
  const { data, isLoading, isFetching } = usePrestasiList(cursor, filters);
  const deletePrestasi = useDeletePrestasi();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrestasiItem | null>(null);
  const [deleting, setDeleting] = useState<PrestasiItem | null>(null);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (cursor === null ? data.items : [...prev, ...data.items]));
  }, [data, cursor]);

  function updateFilter(patch: Partial<PrestasiFilters>) {
    setCursor(null);
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleFormOpenChange(o: boolean) {
    setFormOpen(o);
    if (!o) setCursor(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    deletePrestasi.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Prestasi dihapus.");
        setCursor(null);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Prestasi Siswa</h1>
        </div>
        <div className="flex gap-2">
          {can(MODULE, "export") && (
            <Button variant="outline" size="sm" disabled={items.length === 0} onClick={() => exportExcel(items)}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          )}
          {can(MODULE, "tambah") && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus /> Catat Prestasi
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.rombelId ?? "__all"}
          onValueChange={(v) => updateFilter({ rombelId: v === "__all" ? undefined : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Semua rombel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua rombel</SelectItem>
            {(rombelData?.items ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.bidang ?? "__all"}
          onValueChange={(v) => updateFilter({ bidang: v === "__all" ? undefined : (v as PrestasiFilters["bidang"]) })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Semua bidang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua bidang</SelectItem>
            {PRESTASI_BIDANG_LIST.map((b) => (
              <SelectItem key={b} value={b}>
                {PRESTASI_BIDANG_LABELS[b]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.tingkat ?? "__all"}
          onValueChange={(v) => updateFilter({ tingkat: v === "__all" ? undefined : (v as PrestasiFilters["tingkat"]) })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Semua tingkat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua tingkat</SelectItem>
            {PRESTASI_TINGKAT_LIST.map((t) => (
              <SelectItem key={t} value={t}>
                {PRESTASI_TINGKAT_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Trophy className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada prestasi tercatat</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="text-left" onClick={() => can(MODULE, "ubah") && setEditing(item)}>
                  <p className="font-medium text-foreground">{item.siswaNama}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.rombelNama ?? "—"} · {item.tanggal}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {item.capaian} — {item.namaKegiatan}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="secondary">{PRESTASI_BIDANG_LABELS[item.bidang]}</Badge>
                    <Badge variant="outline">{PRESTASI_TINGKAT_LABELS[item.tingkat]}</Badge>
                    {item.sertifikatFileId && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>
                {can(MODULE, "hapus") && (
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleting(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={isFetching} onClick={() => setCursor(data.nextCursor)}>
            {isFetching ? "Memuat..." : "Muat lebih banyak"}
          </Button>
        </div>
      )}

      <PencatatanPrestasiDialog open={formOpen} onOpenChange={handleFormOpenChange} />
      <EditPrestasiDialog item={editing} onOpenChange={(o) => !o && setEditing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus prestasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Prestasi "{deleting?.namaKegiatan}" milik {deleting?.siswaNama} akan dihapus permanen.
            </AlertDialogDescription>
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
