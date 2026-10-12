import { useState } from "react";
import { BarChart3, Download, AlertCircle } from "lucide-react";

import { ambangTerdekat } from "@shared/sanksi";
import type { RekapPeringkatPoinItem, RekapKategoriRombelItem, RekapJenisBulananItem } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  usePeringkatPoinQuery,
  useRekapKategoriRombelQuery,
  useRekapJenisBulananQuery,
} from "@/hooks/useRekapKesiswaan";
import { useSanksiAmbangQuery } from "@/hooks/useSanksiAmbang";
import { usePermission } from "@/hooks/usePermission";

const MODULE = "rekap_kesiswaan";
const AMBANG_PERINGATAN_SISA_POIN = 5;

async function exportExcel(rows: Record<string, string | number>[], sheetName: string, fileName: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

function PeringkatTab({ tahunAjaran }: { tahunAjaran: string }) {
  const { can } = usePermission();
  const { data, isLoading } = usePeringkatPoinQuery({ tahunAjaran });
  const { data: ambangData } = useSanksiAmbangQuery();
  const ambangList = (ambangData?.items ?? []).map((a) => ({ id: a.id, poinMinimal: a.poinMinimal }));

  function handleExport() {
    if (!data) return;
    const rows = data.items.map((r: RekapPeringkatPoinItem) => ({
      Siswa: r.siswaNama,
      Rombel: r.rombelNama ?? "-",
      Tingkat: r.tingkat ?? "-",
      "Total Poin": r.totalPoin,
      "Jumlah Pelanggaran": r.jumlahPelanggaran,
    }));
    exportExcel(rows, "Peringkat Poin", `peringkat-poin-${tahunAjaran}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {can(MODULE, "export") && (
          <Button variant="outline" size="sm" disabled={!data} onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data poin untuk tahun ajaran ini.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead className="text-right">Total Poin</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.items.map((r) => {
                const terdekat = ambangTerdekat(r.totalPoin, ambangList);
                const mendekati = terdekat && terdekat.sisaPoin <= AMBANG_PERINGATAN_SISA_POIN;
                return (
                  <TableRow key={r.siswaId}>
                    <TableCell className="font-medium text-foreground">
                      {r.siswaNama}
                      {mendekati && (
                        <Badge variant="outline" className="ml-2 gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" /> {terdekat!.sisaPoin} poin lagi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.rombelNama ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.totalPoin}</TableCell>
                    <TableCell className="text-right">{r.jumlahPelanggaran}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function KategoriRombelTab({ tahunAjaran }: { tahunAjaran: string }) {
  const { can } = usePermission();
  const { data, isLoading } = useRekapKategoriRombelQuery(tahunAjaran);

  function handleExport() {
    if (!data) return;
    const rows = data.items.map((r: RekapKategoriRombelItem) => ({
      Rombel: r.rombelNama,
      Kategori: r.kategoriNama,
      Jumlah: r.jumlah,
    }));
    exportExcel(rows, "Rekap Kategori per Rombel", `rekap-kategori-rombel-${tahunAjaran}.xlsx`);
  }

  const rombelGroups = [...new Set((data?.items ?? []).map((i) => i.rombelNama))];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {can(MODULE, "export") && (
          <Button variant="outline" size="sm" disabled={!data} onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rombelGroups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data pelanggaran untuk tahun ajaran ini.</p>
      ) : (
        <div className="space-y-3">
          {rombelGroups.map((rombelNama) => (
            <div key={rombelNama} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 font-medium text-foreground">{rombelNama}</p>
              <div className="flex flex-wrap gap-2">
                {data!.items
                  .filter((i) => i.rombelNama === rombelNama)
                  .map((i) => (
                    <Badge key={i.kategoriId} style={{ backgroundColor: i.kategoriWarna, color: "white" }}>
                      {i.kategoriNama}: {i.jumlah}
                    </Badge>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JenisBulananTab({ tahunAjaran }: { tahunAjaran: string }) {
  const { can } = usePermission();
  const { data, isLoading } = useRekapJenisBulananQuery(tahunAjaran);

  function handleExport() {
    if (!data) return;
    const rows = data.items.map((r: RekapJenisBulananItem) => ({
      Bulan: r.bulan,
      Jenis: r.jenisNama,
      Kategori: r.kategoriNama,
      Jumlah: r.jumlah,
      "Total Poin": r.totalPoin,
    }));
    exportExcel(rows, "Rekap Jenis per Bulan", `rekap-jenis-bulanan-${tahunAjaran}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {can(MODULE, "export") && (
          <Button variant="outline" size="sm" disabled={!data} onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data pelanggaran untuk tahun ajaran ini.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bulan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Total Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.items.map((r, i) => (
                <TableRow key={`${r.bulan}-${r.jenisId}-${i}`}>
                  <TableCell>{r.bulan}</TableCell>
                  <TableCell>{r.jenisNama}</TableCell>
                  <TableCell>{r.kategoriNama}</TableCell>
                  <TableCell className="text-right">{r.jumlah}</TableCell>
                  <TableCell className="text-right">{r.totalPoin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function RekapKesiswaanPage() {
  const [tahunAjaran, setTahunAjaran] = useState("");
  const { data: peringkatData } = usePeringkatPoinQuery({});
  const tahunAjaranAktif = tahunAjaran || peringkatData?.tahunAjaran || "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Rekap Kesiswaan</h1>
        </div>
        <Input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          placeholder={tahunAjaranAktif || "Tahun ajaran"}
          className="w-40"
        />
      </div>

      {tahunAjaranAktif ? (
        <Tabs defaultValue="peringkat">
          <TabsList>
            <TabsTrigger value="peringkat">Peringkat Poin</TabsTrigger>
            <TabsTrigger value="kategori-rombel">Kategori per Rombel</TabsTrigger>
            <TabsTrigger value="jenis-bulanan">Jenis per Bulan</TabsTrigger>
          </TabsList>
          <TabsContent value="peringkat">
            <PeringkatTab tahunAjaran={tahunAjaranAktif} />
          </TabsContent>
          <TabsContent value="kategori-rombel">
            <KategoriRombelTab tahunAjaran={tahunAjaranAktif} />
          </TabsContent>
          <TabsContent value="jenis-bulanan">
            <JenisBulananTab tahunAjaran={tahunAjaranAktif} />
          </TabsContent>
        </Tabs>
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </div>
  );
}
