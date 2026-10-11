import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, ArrowDownAZ } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiswaInRombel, useUpdateNomorAbsen } from "@/hooks/useRombel";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  namaLengkap: string;
}

function SortableRow({ row, nomor }: { row: Row; nomor: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-sm font-medium text-muted-foreground">{nomor}</span>
      <span className="text-sm text-foreground">{row.namaLengkap}</span>
    </div>
  );
}

interface NomorAbsenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rombelId: string | null;
  rombelNama?: string;
}

export function NomorAbsenDialog({ open, onOpenChange, rombelId, rombelNama }: NomorAbsenDialogProps) {
  const { data, isLoading } = useSiswaInRombel(rombelId);
  const updateNomorAbsen = useUpdateNomorAbsen(rombelId ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (data?.items) {
      setRows(data.items.map((i) => ({ id: i.id, namaLengkap: i.namaLengkap })));
    }
  }, [data?.items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id);
      const newIndex = prev.findIndex((r) => r.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function sortAlphabetically() {
    setRows((prev) => [...prev].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, "id")));
  }

  function handleSave() {
    const items = rows.map((r, i) => ({ siswaId: r.id, nomorAbsen: i + 1 }));
    updateNomorAbsen.mutate(
      { items },
      {
        onSuccess: () => {
          toast.success("Nomor absen berhasil disimpan.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atur Nomor Absen — {rombelNama}</DialogTitle>
          <DialogDescription>Seret untuk mengurutkan, atau urutkan otomatis abjad.</DialogDescription>
        </DialogHeader>

        <Button type="button" variant="outline" size="sm" onClick={sortAlphabetically}>
          <ArrowDownAZ className="h-4 w-4" /> Urutkan Abjad
        </Button>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada siswa di rombel ini.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {rows.map((row, i) => (
                  <SortableRow key={row.id} row={row} nomor={i + 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={updateNomorAbsen.isPending || rows.length === 0}>
            {updateNomorAbsen.isPending && <Loader2 className="animate-spin" />}
            Simpan Urutan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
