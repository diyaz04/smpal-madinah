import { useMemo, useState } from "react";
import { Rows3, Bell, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMonitoringKelengkapanQuery, useKirimPengingat, useLegerQuery } from "@/hooks/useLeger";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";

const MODULE = "leger";

const STATUS_LABELS: Record<string, string> = { lengkap: "Lengkap", sebagian: "Sebagian", belum: "Belum" };

function MonitoringTab() {
  const { can } = usePermission();
  const { data, isLoading } = useMonitoringKelengkapanQuery();
  const kirimPengingat = useKirimPengingat();

  function handleKirim(rombelId: string, mapelId: string) {
    kirimPengingat.mutate(
      { rombelId, mapelId },
      {
        onSuccess: () => toast.success("Notifikasi pengingat terkirim ke guru mapel."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengirim."),
      },
    );
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if ((data?.items.length ?? 0) === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pembagian tugas pada periode ini.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rombel</TableHead>
            <TableHead>Mapel</TableHead>
            <TableHead>Guru</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Belum Nilai</TableHead>
            {can(MODULE, "tambah") && <TableHead className="text-right">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.items.map((cell) => (
            <TableRow key={`${cell.rombelId}|${cell.mapelId}`}>
              <TableCell>{cell.rombelNama}</TableCell>
              <TableCell>{cell.mapelNama}</TableCell>
              <TableCell>{cell.guruNama.join(", ")}</TableCell>
              <TableCell className="text-center">
                <Badge variant={cell.status === "lengkap" ? "secondary" : cell.status === "belum" ? "destructive" : "outline"}>
                  {STATUS_LABELS[cell.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {cell.jumlahBelumNilai} / {cell.totalSiswa}
              </TableCell>
              {can(MODULE, "tambah") && (
                <TableCell className="text-right">
                  {cell.status !== "lengkap" && (
                    <Button size="sm" variant="outline" disabled={kirimPengingat.isPending} onClick={() => handleKirim(cell.rombelId, cell.mapelId)}>
                      <Bell className="h-3.5 w-3.5" /> Ingatkan
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LegerTab() {
  const { can } = usePermission();
  const { data: monitoringData } = useMonitoringKelengkapanQuery();
  const rombelPilihan = useMemo(() => {
    const unik = new Map<string, string>();
    for (const c of monitoringData?.items ?? []) unik.set(c.rombelId, c.rombelNama);
    return [...unik.entries()].map(([id, nama]) => ({ id, nama }));
  }, [monitoringData]);

  const [rombelId, setRombelId] = useState("");
  const { data, isLoading } = useLegerQuery(rombelId || null);

  async function handleExport() {
    if (!data) return;
    const XLSX = await import("xlsx");
    const rows = data.item.rows.map((r) => {
      const row: Record<string, string | number> = { "No Absen": r.nomorAbsen ?? "-", Nama: r.namaLengkap };
      for (const m of data.item.mapelColumns) row[m.nama] = r.nilaiPerMapel[m.id] ?? "";
      row.Jumlah = r.jumlah;
      row["Rata-rata"] = r.rataRata ?? "";
      row.Peringkat = r.peringkat ?? "";
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leger");
    XLSX.writeFile(wb, `leger-${rombelPilihan.find((r) => r.id === rombelId)?.nama ?? rombelId}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={rombelId} onValueChange={setRombelId}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Pilih rombel" />
          </SelectTrigger>
          <SelectContent>
            {rombelPilihan.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {can(MODULE, "export") && (
          <Button variant="outline" size="sm" disabled={!data} onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>

      {!rombelId ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Pilih rombel dulu.</p>
      ) : isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama</TableHead>
                {data.item.mapelColumns.map((m) => (
                  <TableHead key={m.id} className="text-center">
                    {m.nama}
                  </TableHead>
                ))}
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead className="text-center">Rata-rata</TableHead>
                <TableHead className="text-center">Peringkat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.item.rows.map((r) => (
                <TableRow key={r.siswaId}>
                  <TableCell>{r.nomorAbsen ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.namaLengkap}</TableCell>
                  {data.item.mapelColumns.map((m) => (
                    <TableCell key={m.id} className="text-center">
                      {r.nilaiPerMapel[m.id] ?? "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-medium">{r.jumlah}</TableCell>
                  <TableCell className="text-center">{r.rataRata !== null ? r.rataRata.toFixed(1) : "—"}</TableCell>
                  <TableCell className="text-center">{r.peringkat ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function LegerPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Rows3 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Leger & Monitoring Kelengkapan</h1>
      </div>

      <Tabs defaultValue="monitoring">
        <TabsList>
          <TabsTrigger value="monitoring">Monitoring Kelengkapan</TabsTrigger>
          <TabsTrigger value="leger">Leger</TabsTrigger>
        </TabsList>
        <TabsContent value="monitoring">
          <MonitoringTab />
        </TabsContent>
        <TabsContent value="leger">
          <LegerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
