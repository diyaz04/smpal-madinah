import { useState } from "react";
import { Plus, Settings2, Users2, CheckCircle2, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { JENIS_SLOT_LABELS } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SlotManagerDialog } from "@/components/jadwal/SlotManagerDialog";
import { UbahIsiDialog } from "@/components/jadwal/UbahIsiDialog";
import { PiketManagerDialog } from "@/components/jadwal/PiketManagerDialog";
import {
  useJadwalVersiList,
  useCreateVersi,
  useActivateVersi,
  useDeleteVersi,
  useGridRombel,
  useGridGuru,
} from "@/hooks/useJadwal";
import { useRombelQuery } from "@/hooks/useRombel";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { JadwalSlotItem, JadwalIsiItem } from "@shared/types";

type ViewMode = "rombel" | "guru";

export function JadwalPage() {
  const { can } = usePermission();
  const [view, setView] = useState<ViewMode>("rombel");
  const [versiId, setVersiId] = useState("");
  const [rombelId, setRombelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const [newVersiName, setNewVersiName] = useState("");
  const [showNewVersi, setShowNewVersi] = useState(false);
  const [slotManagerOpen, setSlotManagerOpen] = useState(false);
  const [piketManagerOpen, setPiketManagerOpen] = useState(false);
  const [deleteVersiOpen, setDeleteVersiOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ slot: JadwalSlotItem; isi?: JadwalIsiItem } | null>(null);

  const { data: versiData, isLoading: versiLoading } = useJadwalVersiList();
  const { data: rombelData } = useRombelQuery();
  const { data: guruData } = useGuruSimple();
  const createVersi = useCreateVersi();
  const activateVersi = useActivateVersi();
  const deleteVersi = useDeleteVersi();

  const activeVersiId = versiId || versiData?.items.find((v) => v.status === "aktif")?.id || "";
  const currentVersi = versiData?.items.find((v) => v.id === activeVersiId);

  const { data: gridRombel, isLoading: gridRombelLoading } = useGridRombel(
    view === "rombel" ? activeVersiId || null : null,
    view === "rombel" ? rombelId || null : null,
  );
  const { data: gridGuru, isLoading: gridGuruLoading } = useGridGuru(
    view === "guru" ? activeVersiId || null : null,
    view === "guru" ? guruId || null : null,
  );
  const grid = view === "rombel" ? gridRombel : gridGuru;
  const gridLoading = view === "rombel" ? gridRombelLoading : gridGuruLoading;

  function handleCreateVersi() {
    if (!newVersiName.trim()) return;
    createVersi.mutate(
      { nama: newVersiName.trim() },
      {
        onSuccess: ({ item }) => {
          toast.success("Versi jadwal dibuat.");
          setNewVersiName("");
          setShowNewVersi(false);
          setVersiId(item.id);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal membuat versi."),
      },
    );
  }

  function handleActivate() {
    if (!activeVersiId) return;
    activateVersi.mutate(activeVersiId, {
      onSuccess: () => toast.success("Versi jadwal diaktifkan."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengaktifkan."),
    });
  }

  function handleDeleteVersi() {
    if (!activeVersiId) return;
    deleteVersi.mutate(activeVersiId, {
      onSuccess: () => {
        toast.success("Versi jadwal dihapus.");
        setVersiId("");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleteVersiOpen(false),
    });
  }

  const slotsByHari = new Map<string, JadwalSlotItem[]>();
  for (const slot of grid?.slots ?? []) {
    const arr = slotsByHari.get(slot.hari) ?? [];
    arr.push(slot);
    slotsByHari.set(slot.hari, arr);
  }

  const isiBySlot = new Map<string, JadwalIsiItem>();
  for (const isi of grid?.isi ?? []) {
    isiBySlot.set(isi.jadwalSlotId, isi);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">Jadwal Pelajaran</h1>
        <div className="flex flex-wrap gap-2">
          {can("jadwal_pelajaran", "ubah") && (
            <>
              <Button variant="outline" onClick={() => setPiketManagerOpen(true)}>
                <Users2 /> Guru Piket
              </Button>
              <Button variant="outline" onClick={() => setSlotManagerOpen(true)} disabled={!activeVersiId}>
                <Settings2 /> Jam Pelajaran
              </Button>
              <Button variant="outline" onClick={() => setShowNewVersi((v) => !v)}>
                <Plus /> Versi Baru
              </Button>
            </>
          )}
        </div>
      </div>

      {showNewVersi && (
        <div className="flex gap-2 rounded-lg border border-border bg-card p-3">
          <Input
            value={newVersiName}
            onChange={(e) => setNewVersiName(e.target.value)}
            placeholder="Nama versi, contoh: Jadwal Ganjil v1"
          />
          <Button onClick={handleCreateVersi} disabled={createVersi.isPending}>
            Buat
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {versiLoading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <Select value={activeVersiId} onValueChange={setVersiId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Pilih versi jadwal" />
            </SelectTrigger>
            <SelectContent>
              {(versiData?.items ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nama} ({v.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {currentVersi && (
          <Badge variant={currentVersi.status === "aktif" ? "default" : "outline"}>{currentVersi.status}</Badge>
        )}
        {can("jadwal_pelajaran", "ubah") && currentVersi && currentVersi.status !== "aktif" && (
          <Button size="sm" variant="outline" onClick={handleActivate}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Aktifkan
          </Button>
        )}
        {can("jadwal_pelajaran", "ubah") && currentVersi && currentVersi.status !== "aktif" && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteVersiOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </Button>
        )}
      </div>

      {!activeVersiId ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada versi jadwal dipilih</p>
          <p className="text-sm text-muted-foreground">Buat versi jadwal baru untuk mulai menyusun jadwal.</p>
        </div>
      ) : (
        <>
          <div className="inline-flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setView("rombel")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === "rombel" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Per Rombel
            </button>
            <button
              type="button"
              onClick={() => setView("guru")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === "guru" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Per Guru
            </button>
          </div>

          {view === "rombel" ? (
            <Select value={rombelId} onValueChange={setRombelId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih rombel" />
              </SelectTrigger>
              <SelectContent>
                {(rombelData?.items ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.tingkat} {r.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={guruId} onValueChange={setGuruId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih guru" />
              </SelectTrigger>
              <SelectContent>
                {(guruData?.items ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.namaLengkap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(view === "rombel" ? !rombelId : !guruId) ? (
            <p className="text-sm text-muted-foreground">
              Pilih {view === "rombel" ? "rombel" : "guru"} untuk melihat jadwalnya.
            </p>
          ) : gridLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : slotsByHari.size === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada jam pelajaran untuk versi ini.</p>
          ) : (
            <div className="space-y-4">
              {[...slotsByHari.entries()].map(([hari, slots]) => (
                <div key={hari} className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">{hari}</p>
                  <div className="space-y-1.5">
                    {slots.map((slot) => {
                      const isi = isiBySlot.get(slot.id);
                      const isKbm = slot.jenisSlot === "kbm";
                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm",
                            isKbm && view === "rombel" && can("jadwal_pelajaran", "ubah") && "cursor-pointer hover:bg-accent",
                          )}
                          onClick={() => {
                            if (isKbm && view === "rombel" && can("jadwal_pelajaran", "ubah")) {
                              setEditCell({ slot, isi });
                            }
                          }}
                        >
                          <span className="text-muted-foreground">
                            {slot.jamMulai}–{slot.jamSelesai}
                            {slot.jamKe ? ` (${slot.jamKe})` : ""}
                          </span>
                          {isKbm ? (
                            isi ? (
                              <span className="text-right">
                                <span className="font-medium text-foreground">
                                  {isi.mapelNama ?? "—"}
                                </span>
                                {view === "guru" && "rombelNama" in isi && (
                                  <Badge variant="outline" className="ml-2">
                                    {(isi as unknown as { rombelNama: string }).rombelNama}
                                  </Badge>
                                )}
                                {isi.guru.length > 0 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {isi.guru.map((g) => g.namaLengkap).join(" & ")}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {view === "rombel" ? "+ Isi jadwal" : "—"}
                              </span>
                            )
                          ) : (
                            <Badge variant="outline">{JENIS_SLOT_LABELS[slot.jenisSlot]}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <SlotManagerDialog open={slotManagerOpen} onOpenChange={setSlotManagerOpen} versiId={activeVersiId || null} />
      <PiketManagerDialog open={piketManagerOpen} onOpenChange={setPiketManagerOpen} versiId={activeVersiId || null} />
      {editCell && (
        <UbahIsiDialog
          open={!!editCell}
          onOpenChange={(o) => !o && setEditCell(null)}
          slotId={editCell.slot.id}
          rombelId={rombelId}
          label={`${editCell.slot.hari}, ${editCell.slot.jamMulai}–${editCell.slot.jamSelesai}`}
          existing={editCell.isi}
        />
      )}

      <AlertDialog open={deleteVersiOpen} onOpenChange={setDeleteVersiOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus versi jadwal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh jam pelajaran dan isi jadwal pada versi ini akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVersi}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
