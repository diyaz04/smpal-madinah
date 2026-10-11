import { useState } from "react";
import { Download } from "lucide-react";

import { REKAP_PRESENSI_STATUS_LABELS } from "@shared/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGuruQuery } from "@/hooks/useGuru";
import { useRekapPresensiHarian, useRekapPresensiBulananGuru, useRekapPresensiBulananSemua } from "@/hooks/useRekapPresensiGuru";
import { todayWibIso } from "@/lib/dateFormat";
import type { RekapPresensiBulananGuruRow } from "@shared/types";

function currentBulan(): string {
  return new Date().toISOString().slice(0, 7);
}

async function exportExcel(rows: Record<string, string | number>[], sheetName: string, fileName: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

async function exportPdf(head: string[], body: (string | number)[][], title: string, fileName: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.text(title, 14, 14);
  autoTable(doc, { head: [head], body, startY: 20 });
  doc.save(fileName);
}

function HarianTab() {
  const [tanggal, setTanggal] = useState(todayWibIso());
  const { data, isLoading } = useRekapPresensiHarian(tanggal);

  return (
    <div className="space-y-3">
      <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="max-w-[180px]" />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada presensi pada tanggal ini.</p>
      ) : (
        <div className="space-y-2">
          {data!.items.map((item) => (
            <div key={item.guruId} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                {item.fotoDatangUrl && (
                  <a href={item.fotoDatangUrl} target="_blank" rel="noreferrer">
                    <img src={item.fotoDatangUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  </a>
                )}
                <div>
                  <p className="font-medium text-foreground">{item.guruNama}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.jamDatang ? `Datang ${item.jamDatang}` : "Belum datang"}
                    {item.jamPulang ? ` · Pulang ${item.jamPulang}` : ""}
                    {item.metodeDatang === "pin" && " · via PIN"}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{REKAP_PRESENSI_STATUS_LABELS[item.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BulananGuruTab() {
  const [bulan, setBulan] = useState(currentBulan());
  const [guruId, setGuruId] = useState<string | null>(null);
  const { data: guruData } = useGuruQuery({ page: 1, pageSize: 100, search: "", status: "active" });
  const { data, isLoading } = useRekapPresensiBulananGuru(guruId, bulan);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Select value={guruId ?? ""} onValueChange={setGuruId}>
          <SelectTrigger className="w-full max-w-xs">
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
        <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="max-w-[180px]" />
      </div>
      {!guruId ? (
        <p className="text-sm text-muted-foreground">Pilih guru dahulu.</p>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data?.item ? (
        <p className="text-sm text-muted-foreground">Tidak ada data.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2 rounded-xl border border-border bg-card p-3 text-center">
            <div>
              <p className="text-lg font-semibold text-foreground">{data.item.totalHadir}</p>
              <p className="text-xs text-muted-foreground">Tepat Waktu</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{data.item.totalTerlambat}</p>
              <p className="text-xs text-muted-foreground">Terlambat</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{data.item.totalMenitTerlambat}</p>
              <p className="text-xs text-muted-foreground">Menit Telat</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{data.item.totalTidakHadir}</p>
              <p className="text-xs text-muted-foreground">Tidak Hadir</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{data.item.totalIzin}</p>
              <p className="text-xs text-muted-foreground">Izin/Sakit/Dinas</p>
            </div>
          </div>
          <div className="space-y-1">
            {data.item.cells.map((c) => (
              <div key={c.tanggal} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{c.tanggal}</span>
                <Badge variant="outline">{REKAP_PRESENSI_STATUS_LABELS[c.status as keyof typeof REKAP_PRESENSI_STATUS_LABELS]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BulananSemuaTab() {
  const [bulan, setBulan] = useState(currentBulan());
  const { data, isLoading } = useRekapPresensiBulananSemua(bulan);

  function toRows(items: RekapPresensiBulananGuruRow[]) {
    return items.map((r) => ({
      Guru: r.guruNama,
      "Tepat Waktu": r.totalHadir,
      Terlambat: r.totalTerlambat,
      "Menit Telat": r.totalMenitTerlambat,
      "Pulang Cepat": r.totalPulangCepat,
      "Tidak Hadir": r.totalTidakHadir,
      "Izin/Sakit/Dinas": r.totalIzin,
    }));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="max-w-[180px]" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!data}
            onClick={() => data && exportExcel(toRows(data.items), "Rekap Presensi", `rekap-presensi-${bulan}.xlsx`)}
          >
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data}
            onClick={() =>
              data &&
              exportPdf(
                ["Guru", "Tepat Waktu", "Terlambat", "Tidak Hadir", "Izin"],
                data.items.map((r) => [r.guruNama, r.totalHadir, r.totalTerlambat, r.totalTidakHadir, r.totalIzin]),
                `Rekap Presensi Guru - ${bulan}`,
                `rekap-presensi-${bulan}.pdf`,
              )
            }
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Guru</th>
                <th className="px-2 py-2 text-center font-medium">Tepat Waktu</th>
                <th className="px-2 py-2 text-center font-medium">Terlambat</th>
                <th className="px-2 py-2 text-center font-medium">Pulang Cepat</th>
                <th className="px-2 py-2 text-center font-medium">Tidak Hadir</th>
                <th className="px-2 py-2 text-center font-medium">Izin/Sakit/Dinas</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((r) => (
                <tr key={r.guruId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{r.guruNama}</td>
                  <td className="px-2 py-2 text-center">{r.totalHadir}</td>
                  <td className="px-2 py-2 text-center">{r.totalTerlambat}</td>
                  <td className="px-2 py-2 text-center">{r.totalPulangCepat}</td>
                  <td className="px-2 py-2 text-center">{r.totalTidakHadir}</td>
                  <td className="px-2 py-2 text-center">{r.totalIzin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RekapPresensiGuruPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Rekap Presensi Guru</h1>
      <Tabs defaultValue="harian">
        <TabsList>
          <TabsTrigger value="harian">Harian</TabsTrigger>
          <TabsTrigger value="bulanan-guru">Bulanan per Guru</TabsTrigger>
          <TabsTrigger value="bulanan-semua">Bulanan Semua Guru</TabsTrigger>
        </TabsList>
        <TabsContent value="harian">
          <HarianTab />
        </TabsContent>
        <TabsContent value="bulanan-guru">
          <BulananGuruTab />
        </TabsContent>
        <TabsContent value="bulanan-semua">
          <BulananSemuaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
