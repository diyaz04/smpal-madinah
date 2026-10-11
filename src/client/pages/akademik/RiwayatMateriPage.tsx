import { useEffect, useState } from "react";
import { BookMarked, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRiwayatMateri, useRekapMengajar } from "@/hooks/useAgenda";
import type { RiwayatMateriItem } from "@shared/types";

function currentBulan(): string {
  return new Date().toISOString().slice(0, 7);
}

function RiwayatMateriTab() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<RiwayatMateriItem[]>([]);
  const { data, isLoading, isFetching } = useRiwayatMateri(cursor, {});

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (cursor === null ? data.items : [...prev, ...data.items]));
  }, [data, cursor]);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <BookMarked className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">Belum ada riwayat materi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {item.tanggal}
                    {item.jamKeMulai && ` · Jam ke-${item.jamKeMulai}`} · {item.rombelNama}
                  </p>
                  <p className="mt-1 font-medium text-foreground">{item.materi}</p>
                  {item.kegiatan && <p className="mt-1 text-sm text-muted-foreground">{item.kegiatan}</p>}
                  {item.catatan && <p className="mt-1 text-xs text-muted-foreground">Catatan: {item.catatan}</p>}
                </div>
                {item.isPengganti && <Badge variant="secondary">Pengganti</Badge>}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.guruNama}</span>
                {item.jumlahTidakHadir > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {item.jumlahTidakHadir} tidak hadir
                  </span>
                )}
              </div>
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

function RekapMengajarTab() {
  const [bulan, setBulan] = useState(currentBulan());
  const { data, isLoading } = useRekapMengajar(bulan);

  return (
    <div className="space-y-3">
      <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="max-w-[180px]" />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data agenda pada bulan ini.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Guru</th>
                <th className="px-2 py-2 text-center font-medium">JP Terjadwal</th>
                <th className="px-2 py-2 text-center font-medium">Terisi Sendiri</th>
                <th className="px-2 py-2 text-center font-medium">Digantikan</th>
                <th className="px-2 py-2 text-center font-medium">Isi sbg Pengganti</th>
                <th className="px-2 py-2 text-center font-medium">Jam Kosong</th>
                <th className="px-2 py-2 text-center font-medium">Terlambat</th>
                <th className="px-2 py-2 text-center font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data!.items.map((row) => (
                <tr key={row.guruId} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{row.guruNama}</td>
                  <td className="px-2 py-2 text-center">{row.jpTerjadwal}</td>
                  <td className="px-2 py-2 text-center">{row.jpTerisiSendiri}</td>
                  <td className="px-2 py-2 text-center">{row.jpDigantikan}</td>
                  <td className="px-2 py-2 text-center">{row.jpIsiSebagaiPengganti}</td>
                  <td className="px-2 py-2 text-center">{row.jpKosong}</td>
                  <td className="px-2 py-2 text-center">{row.jpTerlambat}</td>
                  <td className="px-2 py-2 text-center font-medium">{row.persenKeterlaksanaan}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RiwayatMateriPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Riwayat Materi & Rekap Mengajar</h1>

      <Tabs defaultValue="riwayat">
        <TabsList>
          <TabsTrigger value="riwayat">Riwayat Materi</TabsTrigger>
          <TabsTrigger value="rekap-mengajar">Rekap Mengajar</TabsTrigger>
        </TabsList>
        <TabsContent value="riwayat">
          <RiwayatMateriTab />
        </TabsContent>
        <TabsContent value="rekap-mengajar">
          <RekapMengajarTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
