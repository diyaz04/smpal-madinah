import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, CalendarDays, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { KALENDER_JENIS_LABELS } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KalenderEntriFormDialog } from "@/components/kalender/KalenderEntriFormDialog";
import {
  useKalenderEntriList,
  usePengaturanAkademik,
  useDeleteKalenderEntri,
  useUpdatePengaturanAkademik,
} from "@/hooks/useKalenderAkademik";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { KalenderEntriItem } from "@shared/types";

export function KalenderAkademikPage() {
  const { can } = usePermission();
  const { data, isLoading } = useKalenderEntriList();
  const { data: pengaturanData } = usePengaturanAkademik();
  const deleteEntri = useDeleteKalenderEntri();
  const updatePengaturan = useUpdatePengaturanAkademik();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KalenderEntriItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<KalenderEntriItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hariSetelah, setHariSetelah] = useState("1");
  const [jamBatas, setJamBatas] = useState("23:59");
  const [ambangAlpa, setAmbangAlpa] = useState("3");

  useEffect(() => {
    if (pengaturanData?.item && settingsOpen) {
      setHariSetelah(String(pengaturanData.item.agendaBatasEditHariSetelah));
      setJamBatas(pengaturanData.item.agendaBatasEditJam);
      setAmbangAlpa(String(pengaturanData.item.siswaAlpaAmbang));
    }
  }, [pengaturanData, settingsOpen]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(e: KalenderEntriItem) {
    setEditing(e);
    setFormOpen(true);
  }
  function confirmDelete() {
    if (!deleting) return;
    deleteEntri.mutate(deleting.id, {
      onSuccess: () => toast.success(`${deleting.nama} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  function handleSaveSettings() {
    updatePengaturan.mutate(
      {
        agendaBatasEditHariSetelah: Number(hariSetelah) || 0,
        agendaBatasEditJam: jamBatas,
        siswaAlpaAmbang: Number(ambangAlpa) || 1,
      },
      {
        onSuccess: () => {
          toast.success("Pengaturan akademik disimpan.");
          setSettingsOpen(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Kalender Akademik</h1>
        <div className="flex gap-2">
          {can("kalender_akademik", "ubah") && (
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" /> Pengaturan
            </Button>
          )}
          {can("kalender_akademik", "tambah") && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Tambah Entri
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada entri kalender</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {data!.items.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">{e.nama}</p>
                <p className="text-sm text-muted-foreground">
                  {e.tanggalMulai}
                  {e.tanggalSelesai !== e.tanggalMulai ? ` – ${e.tanggalSelesai}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">{KALENDER_JENIS_LABELS[e.jenis]}</Badge>
                {e.kbmDitiadakan && <Badge variant="destructive">KBM Ditiadakan</Badge>}
                <Badge variant="secondary">
                  {e.cakupan === "SEMUA" ? "Semua Rombel" : e.tingkatBerlaku.join(", ")}
                </Badge>
                {can("kalender_akademik", "ubah") && (
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {can("kalender_akademik", "hapus") && (
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(e)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <KalenderEntriFormDialog open={formOpen} onOpenChange={setFormOpen} entri={editing} />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pengaturan Akademik</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Batas Edit Agenda (H+ hari, jam)
              </label>
              <div className="flex gap-2">
                <Input type="number" min={0} value={hariSetelah} onChange={(e) => setHariSetelah(e.target.value)} />
                <Input value={jamBatas} onChange={(e) => setJamBatas(e.target.value)} placeholder="23:59" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Ambang Siswa Sering Alpa (per bulan)
              </label>
              <Input type="number" min={1} value={ambangAlpa} onChange={(e) => setAmbangAlpa(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSettings} disabled={updatePengaturan.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus entri kalender ini?</AlertDialogTitle>
            <AlertDialogDescription>"{deleting?.nama}" akan dihapus.</AlertDialogDescription>
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
