import { useState } from "react";
import { Plus, Copy, MoreHorizontal, Pencil, Trash2, ListOrdered, DoorOpen, Users } from "lucide-react";
import { toast } from "sonner";

import { TINGKAT_LIST } from "@shared/constants";
import type { RombelListItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { RombelFormDialog } from "@/components/rombel/RombelFormDialog";
import { CopyRombelDialog } from "@/components/rombel/CopyRombelDialog";
import { NomorAbsenDialog } from "@/components/rombel/NomorAbsenDialog";
import { useRombelQuery, useDeleteRombel } from "@/hooks/useRombel";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";

export function RombelPage() {
  const { can } = usePermission();
  const { data, isLoading } = useRombelQuery();
  const deleteRombel = useDeleteRombel();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RombelListItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<RombelListItem | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [nomorAbsenRombel, setNomorAbsenRombel] = useState<RombelListItem | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(r: RombelListItem) {
    setEditing(r);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteRombel.mutate(deleting.id, {
      onSuccess: () => toast.success(`Rombel ${deleting.nama} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  const groups = TINGKAT_LIST.map((tingkat) => ({
    tingkat,
    items: (data?.items ?? []).filter((r) => r.tingkat === tingkat),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Kelas & Rombel</h1>
        <div className="flex gap-2">
          {can("data_kelas", "tambah") && (
            <Button variant="outline" onClick={() => setCopyOpen(true)}>
              <Copy /> Salin dari Periode
            </Button>
          )}
          {can("data_kelas", "tambah") && (
            <Button onClick={openCreate}>
              <Plus /> Tambah Rombel
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <DoorOpen className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada rombel di periode ini</p>
        </div>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((group) => (
            <div key={group.tingkat}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tingkat {group.tingkat}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{r.nama}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.waliGuru ? r.waliGuru.namaLengkap : "Belum ada wali kelas"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can("data_kelas", "ubah") && (
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil /> Ubah
                            </DropdownMenuItem>
                          )}
                          {can("data_kelas", "ubah") && (
                            <DropdownMenuItem onClick={() => setNomorAbsenRombel(r)}>
                              <ListOrdered /> Atur Nomor Absen
                            </DropdownMenuItem>
                          )}
                          {can("data_kelas", "hapus") && (
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(r)}>
                              <Trash2 /> Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {r.jumlahSiswaL + r.jumlahSiswaP} siswa ({r.jumlahSiswaL} L, {r.jumlahSiswaP} P)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      <RombelFormDialog open={formOpen} onOpenChange={setFormOpen} rombel={editing} />
      {data?.periodId && (
        <CopyRombelDialog open={copyOpen} onOpenChange={setCopyOpen} currentPeriodId={data.periodId} />
      )}
      <NomorAbsenDialog
        open={!!nomorAbsenRombel}
        onOpenChange={(o) => !o && setNomorAbsenRombel(null)}
        rombelId={nomorAbsenRombel?.id ?? null}
        rombelNama={nomorAbsenRombel?.nama}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus rombel ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Rombel "{deleting?.nama}" akan dihapus. Penghapusan ditolak kalau masih ada siswa di
              dalamnya.
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
