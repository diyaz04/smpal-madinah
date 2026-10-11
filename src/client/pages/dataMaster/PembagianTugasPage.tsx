import { useState } from "react";
import { Plus, Copy, X, ClipboardList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignTugasDialog } from "@/components/pembagianTugas/AssignTugasDialog";
import { CopyTugasDialog } from "@/components/pembagianTugas/CopyTugasDialog";
import {
  usePembagianTugasMatrix,
  useRingkasanGuru,
  useGuruAssignments,
  useRemovePembagianTugas,
} from "@/hooks/usePembagianTugas";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { useRombelQuery } from "@/hooks/useRombel";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type ViewMode = "matriks" | "per-guru";

export function PembagianTugasPage() {
  const { can } = usePermission();
  const [view, setView] = useState<ViewMode>("matriks");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPrefill, setAssignPrefill] = useState<{ rombelId?: string; mapelId?: string; guruId?: string }>({});
  const [copyOpen, setCopyOpen] = useState(false);
  const [selectedGuruId, setSelectedGuruId] = useState("");

  const { data: matrix, isLoading: matrixLoading } = usePembagianTugasMatrix();
  const { data: ringkasan } = useRingkasanGuru();
  const { data: guruData } = useGuruSimple();
  const { data: rombelData } = useRombelQuery();
  const { data: assignments, isLoading: assignmentsLoading } = useGuruAssignments(selectedGuruId || null);
  const removeTugas = useRemovePembagianTugas();

  function openAssign(prefill: { rombelId?: string; mapelId?: string; guruId?: string } = {}) {
    setAssignPrefill(prefill);
    setAssignOpen(true);
  }

  function handleRemove(id: string) {
    removeTugas.mutate(id, {
      onSuccess: () => toast.success("Penugasan dihapus."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Pembagian Tugas Mengajar</h1>
        <div className="flex gap-2">
          {can("pembagian_tugas_mengajar", "tambah") && (
            <Button variant="outline" onClick={() => setCopyOpen(true)}>
              <Copy /> Salin dari Periode
            </Button>
          )}
          {can("pembagian_tugas_mengajar", "tambah") && (
            <Button onClick={() => openAssign()}>
              <Plus /> Tambah Penugasan
            </Button>
          )}
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setView("matriks")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            view === "matriks" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          Matriks
        </button>
        <button
          type="button"
          onClick={() => setView("per-guru")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            view === "per-guru" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          Per Guru
        </button>
      </div>

      {view === "matriks" ? (
        matrixLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (matrix?.rombel.length ?? 0) === 0 || (matrix?.mapel.length ?? 0) === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">Rombel atau mapel belum tersedia</p>
            <p className="text-sm text-muted-foreground">
              Lengkapi data Kelas &amp; Rombel serta Mata Pelajaran terlebih dahulu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Rombel</TableHead>
                  {matrix!.mapel.map((m) => (
                    <TableHead key={m.id} className="min-w-[140px]">
                      {m.kodeJadwal}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix!.rombel.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="sticky left-0 bg-card font-medium text-foreground">
                      {r.tingkat} {r.nama}
                    </TableCell>
                    {matrix!.mapel.map((m) => {
                      const cell = matrix!.cells.find((c) => c.rombelId === r.id && c.mapelId === m.id);
                      return (
                        <TableCell key={m.id}>
                          {cell ? (
                            <div className="flex flex-wrap gap-1">
                              {cell.guru.map((g, i) => (
                                <Badge key={g.id} variant="outline" className="gap-1 pr-1">
                                  {g.namaLengkap.split(",")[0]}
                                  {can("pembagian_tugas_mengajar", "hapus") && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemove(cell.pembagianTugasIds[i]!)}
                                      className="rounded-full hover:bg-black/10"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            can("pembagian_tugas_mengajar", "tambah") && (
                              <button
                                type="button"
                                onClick={() => openAssign({ rombelId: r.id, mapelId: m.id })}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <Select value={selectedGuruId} onValueChange={setSelectedGuruId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pilih guru..." />
            </SelectTrigger>
            <SelectContent>
              {(guruData?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.namaLengkap}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedGuruId && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-foreground">Daftar Tugas Mengajar</p>
                {can("pembagian_tugas_mengajar", "tambah") && (
                  <Button size="sm" variant="outline" onClick={() => openAssign({ guruId: selectedGuruId })}>
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </Button>
                )}
              </div>
              {assignmentsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (assignments?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada penugasan untuk guru ini.</p>
              ) : (
                <ul className="space-y-1.5">
                  {assignments!.items.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span>
                        {a.mapelNama} — {a.rombelNama}
                        {a.isTeamTeaching && (
                          <Badge variant="secondary" className="ml-2">
                            Team Teaching
                          </Badge>
                        )}
                      </span>
                      {can("pembagian_tugas_mengajar", "hapus") && (
                        <button
                          type="button"
                          onClick={() => handleRemove(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {(ringkasan?.items.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 font-medium text-foreground">Ringkasan Beban Mengajar</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ringkasan!.items.map((r) => (
              <div
                key={r.guruId}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{r.namaLengkap}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.jumlahMapel} mapel · {r.jumlahRombel} rombel · {r.totalJpPerMinggu} JP/minggu
                  </p>
                </div>
                {r.dibawahMinimal && (
                  <span title="Di bawah minimal JP sertifikasi">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AssignTugasDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        initialRombelId={assignPrefill.rombelId}
        initialMapelId={assignPrefill.mapelId}
        initialGuruId={assignPrefill.guruId}
      />
      {rombelData?.periodId && (
        <CopyTugasDialog open={copyOpen} onOpenChange={setCopyOpen} currentPeriodId={rombelData.periodId} />
      )}
    </div>
  );
}
