import { useEffect, useState } from "react";
import { BookUser, Download } from "lucide-react";

import { TAMU_STATUS_KUNJUNGAN_LIST, TAMU_STATUS_KUNJUNGAN_LABELS } from "@shared/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBukuTamuList, useUpdateStatusKunjungan } from "@/hooks/useBukuTamu";
import type { TamuItem } from "@shared/types";
import type { TamuStatusKunjungan } from "@shared/constants";

export function BukuTamuPage() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TamuItem[]>([]);
  const { data, isLoading, isFetching } = useBukuTamuList(cursor, { search: search || undefined });
  const updateStatus = useUpdateStatusKunjungan();

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (cursor === null ? data.items : [...prev, ...data.items]));
  }, [data, cursor]);

  useEffect(() => {
    setCursor(null);
    setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleExport() {
    const XLSX = await import("xlsx");
    const rows = items.map((t) => ({
      Tanggal: t.tanggal,
      Waktu: t.waktu,
      Jenis: t.jenis,
      Instansi: t.namaInstansi ?? "",
      Nama: t.nama,
      "Maksud & Tujuan": t.maksudTujuan,
      "No. HP": t.noHp ?? "",
      "Ingin Bertemu": t.inginBertemuGuruNama ?? "",
      Status: TAMU_STATUS_KUNJUNGAN_LABELS[t.statusKunjungan],
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buku Tamu");
    XLSX.writeFile(wb, `buku-tamu-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Buku Tamu</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
          <Download className="h-4 w-4" /> Ekspor Excel
        </Button>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/instansi..." className="max-w-xs" />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <BookUser className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada data tamu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              {t.fotoUrl && <img src={t.fotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />}
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {t.nama}
                  {t.namaInstansi && ` (${t.namaInstansi})`}
                </p>
                <p className="text-sm text-muted-foreground">{t.maksudTujuan}</p>
                <p className="text-xs text-muted-foreground">
                  {t.tanggal} {t.waktu}
                  {t.inginBertemuGuruNama && ` · Ingin bertemu: ${t.inginBertemuGuruNama}`}
                </p>
              </div>
              <Select
                value={t.statusKunjungan}
                onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as TamuStatusKunjungan })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAMU_STATUS_KUNJUNGAN_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      <Badge variant="secondary">{TAMU_STATUS_KUNJUNGAN_LABELS[s]}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
