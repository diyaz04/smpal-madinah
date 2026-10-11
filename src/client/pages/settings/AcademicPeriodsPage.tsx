import { useState } from "react";
import { MoreHorizontal, Plus, CalendarRange, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AcademicPeriodFormDialog } from "@/components/academicPeriods/AcademicPeriodFormDialog";
import {
  useAcademicPeriodsQuery,
  useDeleteAcademicPeriod,
  useActivateAcademicPeriod,
} from "@/hooks/useAcademicPeriods";
import { usePermission } from "@/hooks/usePermission";
import { formatDateShortIndonesian } from "@/lib/dateFormat";
import { SEMESTER_LABELS } from "@shared/constants";
import { ApiError } from "@/lib/api";
import type { AcademicPeriodListItem } from "@shared/types";

export function AcademicPeriodsPage() {
  const { can } = usePermission();
  const { data, isLoading } = useAcademicPeriodsQuery();
  const deletePeriod = useDeleteAcademicPeriod();
  const activatePeriod = useActivateAcademicPeriod();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicPeriodListItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<AcademicPeriodListItem | null>(null);
  const [activating, setActivating] = useState<AcademicPeriodListItem | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(period: AcademicPeriodListItem) {
    setEditing(period);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    deletePeriod.mutate(deleting.id, {
      onSuccess: () => toast.success("Periode dihapus."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  function confirmActivate() {
    if (!activating) return;
    activatePeriod.mutate(activating.id, {
      onSuccess: () => toast.success(`${activating.yearLabel} ${SEMESTER_LABELS[activating.semester]} kini aktif.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengaktifkan."),
      onSettled: () => setActivating(null),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Tahun Ajaran</h1>
        {can("tahun_ajaran", "tambah") && (
          <Button onClick={openCreate}>
            <Plus /> Tambah Periode
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data?.periods.length ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarRange className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada tahun ajaran</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-foreground">Tahun Ajaran</th>
                <th className="px-4 py-2 text-left font-medium text-foreground">Semester</th>
                <th className="px-4 py-2 text-left font-medium text-foreground">Mulai</th>
                <th className="px-4 py-2 text-left font-medium text-foreground">Selesai</th>
                <th className="px-4 py-2 text-left font-medium text-foreground">Status</th>
                <th className="w-10 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.periods.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-foreground">{p.yearLabel}</td>
                  <td className="px-4 py-2 text-muted-foreground">{SEMESTER_LABELS[p.semester]}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDateShortIndonesian(p.startDate)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDateShortIndonesian(p.endDate)}</td>
                  <td className="px-4 py-2">
                    {p.isActive ? (
                      <Badge>Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Tidak aktif</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!p.isActive && can("tahun_ajaran", "ubah") && (
                          <DropdownMenuItem onClick={() => setActivating(p)}>
                            <CheckCircle2 /> Jadikan Aktif
                          </DropdownMenuItem>
                        )}
                        {can("tahun_ajaran", "ubah") && (
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil /> Ubah
                          </DropdownMenuItem>
                        )}
                        {can("tahun_ajaran", "hapus") && !p.isActive && (
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                            <Trash2 /> Hapus
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AcademicPeriodFormDialog open={formOpen} onOpenChange={setFormOpen} period={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tahun ajaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.yearLabel} {deleting && SEMESTER_LABELS[deleting.semester]} akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!activating} onOpenChange={(o) => !o && setActivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jadikan periode ini aktif?</AlertDialogTitle>
            <AlertDialogDescription>
              Periode aktif saat ini akan dinonaktifkan dan digantikan oleh {activating?.yearLabel}{" "}
              {activating && SEMESTER_LABELS[activating.semester]}. Semua modul yang terikat periode
              akan mengikuti periode baru ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivate}>Jadikan Aktif</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
