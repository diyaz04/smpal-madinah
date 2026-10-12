import { useState } from "react";
import { HeartHandshake, MessageCircle, FileText } from "lucide-react";
import { toast } from "sonner";

import { SANKSI_SISWA_STATUS_LIST, SANKSI_SISWA_STATUS_LABELS, type SanksiSiswaStatus } from "@shared/constants";
import { getModule } from "@shared/modules";
import type { SanksiSiswaItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatatTindakLanjutDialog } from "@/components/pelanggaran/CatatTindakLanjutDialog";
import { useSanksiAktifQuery, type SanksiAktifFilters } from "@/hooks/useTindakLanjut";
import { useRombelQuery } from "@/hooks/useRombel";

const suratKeluarTersedia = getModule("surat_keluar")?.implemented ?? false;

function handleWa(item: SanksiSiswaItem) {
  if (!item.noHpOrtu) {
    toast.error("No. HP orang tua belum terdata.");
    return;
  }
  const phone = item.noHpOrtu.replace(/[^0-9]/g, "").replace(/^0/, "62");
  const text = encodeURIComponent(
    `Assalamu'alaikum, menginformasikan bahwa ananda ${item.siswaNama} (${item.rombelNama ?? "-"}) telah mencapai total ${item.totalPoin} poin pelanggaran dengan sanksi "${item.ambangNama}". Kami mengundang Bapak/Ibu untuk hadir ke sekolah membicarakan hal ini. Terima kasih.`,
  );
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}

export function TindakLanjutPage() {
  const [filters, setFilters] = useState<SanksiAktifFilters>({});
  const { data: rombelData } = useRombelQuery();
  const { data, isLoading } = useSanksiAktifQuery(filters);
  const [selected, setSelected] = useState<SanksiSiswaItem | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Tindak Lanjut</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? "__all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "__all" ? undefined : (v as SanksiSiswaStatus) }))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua status</SelectItem>
            {SANKSI_SISWA_STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {SANKSI_SISWA_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.rombelId ?? "__all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, rombelId: v === "__all" ? undefined : v }))}
        >
          <SelectTrigger className="w-[160px]">
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
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <HeartHandshake className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada sanksi yang perlu ditindaklanjuti</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data!.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{item.siswaNama}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.rombelNama ?? "—"} · {item.totalPoin} poin total
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {item.ambangNama} <span className="text-muted-foreground">(≥ {item.poinMinimal} poin)</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Tercapai {item.tercapaiPada}</p>
                </div>
                <Badge variant={item.status === "selesai" ? "secondary" : item.status === "dibatalkan" ? "outline" : "default"}>
                  {SANKSI_SISWA_STATUS_LABELS[item.status]}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setSelected(item)}>
                  Catat Tindak Lanjut
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleWa(item)}>
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Ortu
                </Button>
                {suratKeluarTersedia && (
                  <Button size="sm" variant="outline">
                    <FileText className="h-3.5 w-3.5" /> Buat Surat Panggilan
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CatatTindakLanjutDialog sanksi={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
