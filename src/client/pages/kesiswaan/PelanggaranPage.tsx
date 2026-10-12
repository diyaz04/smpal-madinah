import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Ban, RotateCcw } from "lucide-react";

import { PELANGGARAN_STATUS_LABELS } from "@shared/constants";
import type { PelanggaranItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PencatatanPelanggaranDialog } from "@/components/pelanggaran/PencatatanPelanggaranDialog";
import { BatalkanPelanggaranDialog } from "@/components/pelanggaran/BatalkanPelanggaranDialog";
import { usePelanggaranList, type PelanggaranFilters } from "@/hooks/usePelanggaran";
import { usePelanggaranKategoriQuery } from "@/hooks/usePelanggaranKategori";
import { useRombelQuery } from "@/hooks/useRombel";
import { usePermission } from "@/hooks/usePermission";

const MODULE = "pelanggaran";

export function PelanggaranPage() {
  const { can } = usePermission();
  const { data: rombelData } = useRombelQuery();
  const { data: kategoriData } = usePelanggaranKategoriQuery();

  const [filters, setFilters] = useState<PelanggaranFilters>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<PelanggaranItem[]>([]);
  const { data, isLoading, isFetching } = usePelanggaranList(cursor, filters);

  const [formOpen, setFormOpen] = useState(false);
  const [batalkanItem, setBatalkanItem] = useState<PelanggaranItem | null>(null);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (cursor === null ? data.items : [...prev, ...data.items]));
  }, [data, cursor]);

  function updateFilter(patch: Partial<PelanggaranFilters>) {
    setCursor(null);
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleFormOpenChange(o: boolean) {
    setFormOpen(o);
    if (!o) setCursor(null);
  }

  function handleBatalkanOpenChange(o: boolean) {
    if (!o) {
      setBatalkanItem(null);
      setCursor(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Pelanggaran</h1>
        </div>
        {can(MODULE, "tambah") && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> Catat Pelanggaran
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={filters.tanggalMulai ?? ""}
          onChange={(e) => updateFilter({ tanggalMulai: e.target.value || undefined })}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">s.d.</span>
        <Input
          type="date"
          value={filters.tanggalSelesai ?? ""}
          onChange={(e) => updateFilter({ tanggalSelesai: e.target.value || undefined })}
          className="w-auto"
        />
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
          value={filters.kategoriId ?? "__all"}
          onValueChange={(v) => updateFilter({ kategoriId: v === "__all" ? undefined : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua kategori</SelectItem>
            {(kategoriData?.items ?? []).map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.nama}
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
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada catatan pelanggaran</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{item.siswaNama}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.rombelNama ?? "—"} · {item.tanggal} {item.waktu}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge style={{ backgroundColor: item.kategoriWarna, color: "white" }}>
                      {item.jenisNama}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{item.poin} poin</span>
                  </div>
                  {item.keterangan && <p className="mt-1 text-sm text-muted-foreground">{item.keterangan}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Dicatat oleh {item.pelaporNama}</p>
                  {item.status === "dibatalkan" && item.alasanBatal && (
                    <p className="mt-1 text-xs text-destructive">Dibatalkan: {item.alasanBatal}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={item.status === "dibatalkan" ? "outline" : "secondary"}>
                    {PELANGGARAN_STATUS_LABELS[item.status]}
                  </Badge>
                  {can(MODULE, "hapus") && item.status === "tercatat" && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setBatalkanItem(item)}>
                      <Ban className="h-3.5 w-3.5" /> Batalkan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={isFetching} onClick={() => setCursor(data.nextCursor)}>
            {isFetching ? <RotateCcw className="animate-spin" /> : null} Muat lebih banyak
          </Button>
        </div>
      )}

      <PencatatanPelanggaranDialog open={formOpen} onOpenChange={handleFormOpenChange} />
      <BatalkanPelanggaranDialog item={batalkanItem} onOpenChange={handleBatalkanOpenChange} />
    </div>
  );
}
