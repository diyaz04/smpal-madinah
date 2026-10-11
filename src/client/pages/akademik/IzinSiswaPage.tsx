import { useEffect, useState } from "react";
import { FileHeart, Plus, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IZIN_STATUS_LABELS } from "@shared/constants";
import { useIzinSiswaList } from "@/hooks/useIzinSiswa";
import { IzinSiswaFormDialog } from "@/components/izinSiswa/IzinSiswaFormDialog";
import type { IzinHarianSiswaItem } from "@shared/types";

export function IzinSiswaPage() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<IzinHarianSiswaItem[]>([]);
  const { data, isLoading, isFetching } = useIzinSiswaList(cursor, {});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IzinHarianSiswaItem | undefined>(undefined);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (cursor === null ? data.items : [...prev, ...data.items]));
  }, [data, cursor]);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(item: IzinHarianSiswaItem) {
    setEditing(item);
    setDialogOpen(true);
  }
  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setCursor(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Izin/Sakit Harian</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Catat Izin
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <FileHeart className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada data izin/sakit</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openEdit(item)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{item.siswaNama}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.tanggalMulai}
                    {item.tanggalSelesai !== item.tanggalMulai ? ` – ${item.tanggalSelesai}` : ""}
                  </p>
                  {item.keterangan && <p className="mt-1 text-sm text-muted-foreground">{item.keterangan}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary">{IZIN_STATUS_LABELS[item.status]}</Badge>
                  {item.lampiranFileId && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>
            </button>
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

      <IzinSiswaFormDialog open={dialogOpen} onOpenChange={handleDialogChange} izin={editing} />
    </div>
  );
}
