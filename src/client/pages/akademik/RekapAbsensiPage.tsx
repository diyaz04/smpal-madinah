import { useState } from "react";
import { Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { ABSENSI_HARIAN_STATUS_LABELS } from "@shared/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRombelQuery } from "@/hooks/useRombel";
import { useSiswaQuery } from "@/hooks/useSiswa";
import { useRekapBulanan, useRekapSemester, useRekapSiswaDetail } from "@/hooks/useRekapAbsensi";
import { KoreksiAbsensiDialog } from "@/components/rekapAbsensi/KoreksiAbsensiDialog";
import { cn } from "@/lib/utils";

function currentBulan(): string {
  return new Date().toISOString().slice(0, 7);
}

function BulananTab({ rombelId }: { rombelId: string | null }) {
  const [bulan, setBulan] = useState(currentBulan());
  const { data, isLoading } = useRekapBulanan(rombelId, bulan);
  const [koreksi, setKoreksi] = useState<{ siswaId: string; siswaNama: string; tanggal: string; status: string | null } | null>(null);

  return (
    <div className="space-y-3">
      <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="max-w-[180px]" />
      {!rombelId ? (
        <p className="text-sm text-muted-foreground">Pilih rombel dahulu.</p>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data || data.hariEfektif.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada hari KBM tercatat pada bulan ini.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium">Siswa</th>
                {data.hariEfektif.map((t) => (
                  <th key={t} className="px-2 py-2 text-center font-medium">
                    {t.slice(8, 10)}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const byTanggal = new Map(row.cells.map((c) => [c.tanggal, c]));
                return (
                  <tr key={row.siswaId} className="border-b border-border last:border-0">
                    <td className="sticky left-0 whitespace-nowrap bg-card px-3 py-2">
                      {row.namaLengkap}
                      {row.seringAlpa && (
                        <Badge variant="destructive" className="ml-1.5">
                          Sering Alpa
                        </Badge>
                      )}
                    </td>
                    {data.hariEfektif.map((t) => {
                      const cell = byTanggal.get(t);
                      return (
                        <td key={t} className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setKoreksi({ siswaId: row.siswaId, siswaNama: row.namaLengkap, tanggal: t, status: cell?.status ?? null })
                            }
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded text-xs font-semibold hover:ring-1 hover:ring-primary",
                              cell?.status === "A" && "bg-destructive/15 text-destructive",
                              cell?.status === "S" && "bg-amber-500/15 text-amber-700",
                              cell?.status === "I" && "bg-blue-500/15 text-blue-700",
                            )}
                          >
                            {cell?.status ?? ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-medium">{row.persenHadir}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {koreksi && (
        <KoreksiAbsensiDialog
          open={!!koreksi}
          onOpenChange={(open) => !open && setKoreksi(null)}
          siswaId={koreksi.siswaId}
          siswaNama={koreksi.siswaNama}
          tanggal={koreksi.tanggal}
          statusSaatIni={koreksi.status}
        />
      )}
    </div>
  );
}

function SemesterTab({ rombelId }: { rombelId: string | null }) {
  const { data, isLoading } = useRekapSemester(rombelId);

  async function handleExport() {
    if (!data) return;
    const XLSX = await import("xlsx");
    const rows = data.items.map((r) => ({
      Nama: r.namaLengkap,
      Sakit: r.totalS,
      Izin: r.totalI,
      Alpa: r.totalA,
      "% Hadir": r.persenHadir,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Semester");
    XLSX.writeFile(wb, `rekap-absensi-semester-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleWa(nama: string, noHp: string | null, persenHadir: number, totalA: number) {
    if (!noHp) {
      toast.error("No. HP orang tua belum terdata.");
      return;
    }
    const phone = noHp.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const text = encodeURIComponent(
      `Assalamu'alaikum, menginformasikan rekap kehadiran ${nama}: hadir ${persenHadir}%, alpa ${totalA} hari semester ini. Mohon perhatiannya, terima kasih.`,
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={!data} onClick={handleExport}>
          <Download className="h-4 w-4" /> Ekspor Excel
        </Button>
      </div>
      {!rombelId ? (
        <p className="text-sm text-muted-foreground">Pilih rombel dahulu.</p>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-2">
          {(data?.items ?? []).map((item) => (
            <div key={item.siswaId} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="font-medium text-foreground">{item.namaLengkap}</p>
                <p className="text-xs text-muted-foreground">
                  S {item.totalS} · I {item.totalI} · A {item.totalA} · Hadir {item.persenHadir}%
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleWa(item.namaLengkap, item.noHpOrtu, item.persenHadir, item.totalA)}
              >
                <MessageCircle className="h-4 w-4" /> WA
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PerSiswaTab({ rombelId }: { rombelId: string | null }) {
  const { data: siswaData } = useSiswaQuery({ page: 1, pageSize: 100, search: "", status: "AKTIF", rombelId });
  const [siswaId, setSiswaId] = useState<string | null>(null);
  const { data, isLoading } = useRekapSiswaDetail(siswaId);

  return (
    <div className="space-y-3">
      <Select value={siswaId ?? ""} onValueChange={setSiswaId} disabled={!rombelId}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder={rombelId ? "Pilih siswa" : "Pilih rombel dahulu"} />
        </SelectTrigger>
        <SelectContent>
          {(siswaData?.items ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.namaLengkap}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!siswaId ? null : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        data && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-card p-3 text-center">
              <div>
                <p className="text-lg font-semibold text-foreground">{data.item.totalS}</p>
                <p className="text-xs text-muted-foreground">Sakit</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{data.item.totalI}</p>
                <p className="text-xs text-muted-foreground">Izin</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{data.item.totalA}</p>
                <p className="text-xs text-muted-foreground">Alpa</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{data.item.persenHadir}%</p>
                <p className="text-xs text-muted-foreground">Hadir</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.item.riwayat.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada catatan ketidakhadiran.</p>
              ) : (
                data.item.riwayat.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span>{r.tanggal}</span>
                    <Badge variant="secondary">{ABSENSI_HARIAN_STATUS_LABELS[r.status as "S" | "I" | "A"]}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function RekapAbsensiPage() {
  const { data: rombelData } = useRombelQuery();
  const [rombelId, setRombelId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Rekap Absensi Siswa</h1>

      <Select value={rombelId ?? ""} onValueChange={setRombelId}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Pilih rombel" />
        </SelectTrigger>
        <SelectContent>
          {(rombelData?.items ?? []).map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tabs defaultValue="bulanan">
        <TabsList>
          <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
          <TabsTrigger value="per-siswa">Per Siswa</TabsTrigger>
          <TabsTrigger value="semester">Semester</TabsTrigger>
        </TabsList>
        <TabsContent value="bulanan">
          <BulananTab rombelId={rombelId} />
        </TabsContent>
        <TabsContent value="per-siswa">
          <PerSiswaTab rombelId={rombelId} />
        </TabsContent>
        <TabsContent value="semester">
          <SemesterTab rombelId={rombelId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
