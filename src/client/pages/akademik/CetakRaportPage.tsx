import { useState } from "react";
import { FileText, Download, Lock, Unlock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCetakRaportQuery } from "@/hooks/useCetakRaport";
import { useRombelQuery } from "@/hooks/useRombel";
import { exportRaportSatuSiswa, exportRaportSatuKelas } from "@/lib/raportPdf";
import { ApiError } from "@/lib/api";

export function CetakRaportPage() {
  const { data: rombelData } = useRombelQuery();
  const [rombelId, setRombelId] = useState("");
  const { data, isLoading } = useCetakRaportQuery(rombelId || null);

  const [siswaDiproses, setSiswaDiproses] = useState<string | null>(null);
  const [progresKelas, setProgresKelas] = useState<{ selesai: number; total: number } | null>(null);

  const konteks = data?.item;

  async function handleUnduhSatu(siswaId: string, nama: string) {
    if (!konteks) return;
    setSiswaDiproses(siswaId);
    try {
      await exportRaportSatuSiswa(konteks, siswaId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Gagal membuat PDF raport ${nama}.`);
    } finally {
      setSiswaDiproses(null);
    }
  }

  async function handleUnduhKelas() {
    if (!konteks) return;
    setProgresKelas({ selesai: 0, total: konteks.siswa.length });
    try {
      await exportRaportSatuKelas(konteks, (selesai, total) => setProgresKelas({ selesai, total }));
      toast.success("PDF raport satu kelas berhasil dibuat.");
    } catch {
      toast.error("Gagal membuat PDF raport kelas.");
    } finally {
      setProgresKelas(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Cetak Raport</h1>
      </div>

      <Select value={rombelId} onValueChange={setRombelId}>
        <SelectTrigger className="w-60">
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

      {!rombelId ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Pilih rombel dulu.</p>
      ) : isLoading || !konteks ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Badge variant={konteks.terkunci ? "secondary" : "outline"}>
                {konteks.terkunci ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {konteks.terkunci ? "Final — siap cetak resmi" : "Draf — cetak bertanda DRAF"}
              </Badge>
              <span className="text-sm text-muted-foreground">{konteks.siswa.length} siswa</span>
            </div>
            <Button size="sm" onClick={handleUnduhKelas} disabled={progresKelas !== null}>
              {progresKelas ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Unduh Semua (PDF Satu Kelas)
            </Button>
          </div>

          {progresKelas && (
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 text-sm text-muted-foreground">
                Membuat PDF — {progresKelas.selesai} dari {progresKelas.total} siswa
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(progresKelas.selesai / Math.max(1, progresKelas.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {konteks.siswa.map((s) => (
              <div
                key={s.siswaId}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {s.nomorAbsen ? `${s.nomorAbsen}. ` : ""}
                    {s.namaLengkap}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    NIS {s.nis} · NISN {s.nisn}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnduhSatu(s.siswaId, s.namaLengkap)}
                  disabled={siswaDiproses === s.siswaId}
                >
                  {siswaDiproses === s.siswaId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Unduh
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
