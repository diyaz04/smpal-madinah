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
import { GripVertical, Plus, MoreHorizontal, Pencil, Trash2, Eye, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { MAPEL_JENIS_LABELS } from "@shared/constants";
import type { MapelListItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { MapelFormDialog } from "@/components/mapel/MapelFormDialog";
import { RaportPreviewDialog } from "@/components/mapel/RaportPreviewDialog";
import { useMapelQuery, useDeleteMapel, useUpdateUrutanMapel } from "@/hooks/useMapel";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

function SortableRow({
  item,
  indukNama,
  onEdit,
  onDelete,
  canUbah,
  canHapus,
}: {
  item: MapelListItem;
  indukNama: string | null;
  onEdit: () => void;
  onDelete: () => void;
  canUbah: boolean;
  canHapus: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-card opacity-80 shadow-md")}
    >
      <TableCell>
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="font-medium text-foreground">{item.nama}</div>
        {indukNama && <div className="text-xs text-muted-foreground">Sub-mapel dari {indukNama}</div>}
      </TableCell>
      <TableCell>{item.kodeJadwal}</TableCell>
      <TableCell>
        <Badge variant="outline">{MAPEL_JENIS_LABELS[item.jenis]}</Badge>
      </TableCell>
      <TableCell>{item.tingkatBerlaku.join(", ")}</TableCell>
      <TableCell>
        {item.tampilRaport ? <Badge>Ya</Badge> : <Badge variant="secondary">Tidak</Badge>}
      </TableCell>
      <TableCell>
        {item.isActive ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUbah && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil /> Ubah
              </DropdownMenuItem>
            )}
            {canHapus && (
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 /> Hapus
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function MapelPage() {
  const { can } = usePermission();
  const { data, isLoading } = useMapelQuery();
  const deleteMapel = useDeleteMapel();
  const updateUrutan = useUpdateUrutanMapel();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [rows, setRows] = useState<MapelListItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MapelListItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<MapelListItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (data?.items) setRows(data.items);
  }, [data?.items]);

  const namaById = new Map(rows.map((r) => [r.id, r.nama]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(rows, oldIndex, newIndex);
    setRows(reordered);
    updateUrutan.mutate(
      { items: reordered.map((r, i) => ({ id: r.id, urutanRaport: i + 1 })) },
      { onError: () => toast.error("Gagal menyimpan urutan.") },
    );
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(m: MapelListItem) {
    setEditing(m);
    setFormOpen(true);
  }
  function confirmDelete() {
    if (!deleting) return;
    deleteMapel.mutate(deleting.id, {
      onSuccess: () => toast.success(`Mapel ${deleting.nama} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mata Pelajaran</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye /> Pratinjau Raport
          </Button>
          {can("data_mapel", "tambah") && (
            <Button onClick={openCreate}>
              <Plus /> Tambah Mapel
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada mata pelajaran</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nama</TableHead>
                <TableHead>Kode Jadwal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Raport</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {rows.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      indukNama={item.indukMapelId ? (namaById.get(item.indukMapelId) ?? null) : null}
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleting(item)}
                      canUbah={can("data_mapel", "ubah")}
                      canHapus={can("data_mapel", "hapus")}
                    />
                  ))}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
        </div>
      )}

      <MapelFormDialog open={formOpen} onOpenChange={setFormOpen} mapel={editing} indukOptions={rows} />
      <RaportPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus mapel ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Mapel "{deleting?.nama}" akan dihapus. Penghapusan ditolak kalau mapel ini masih menjadi
              induk mapel lain.
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
