import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";

import type { NotifikasiItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifikasiList, useMarkNotifikasiDibaca, useMarkSemuaNotifikasiDibaca } from "@/hooks/useNotifikasi";

export function NotifikasiPage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<NotifikasiItem[]>([]);
  const { data, isLoading, isFetching } = useNotifikasiList(cursor);
  const markDibaca = useMarkNotifikasiDibaca();
  const markSemua = useMarkSemuaNotifikasiDibaca();

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (cursor === null ? data.items : [...prev, ...data.items]));
  }, [data, cursor]);

  function handleClick(item: NotifikasiItem) {
    if (!item.dibacaPada) markDibaca.mutate(item.id);
    if (item.tautan) navigate(item.tautan);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Notifikasi</h1>
        </div>
        <Button variant="outline" size="sm" disabled={markSemua.isPending} onClick={() => markSemua.mutate()}>
          <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Bell className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={`w-full rounded-xl border p-4 text-left hover:bg-accent ${
                item.dibacaPada ? "border-border bg-card" : "border-primary/40 bg-primary-soft"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{item.judul}</p>
                {!item.dibacaPada && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.isi}</p>
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
    </div>
  );
}
