import { useState } from "react";
import { FileText, Lock, Unlock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RaportSiswaDialog } from "@/components/raportKelas/RaportSiswaDialog";
import { STATUS_RAPORT_SISWA_LABELS } from "@shared/constants";
import {
  useRaportKelasQuery,
  useKekuranganFinalisasi,
  useFinalisasiRombel,
  useBukaKunciRombel,
} from "@/hooks/useRaportKelas";
import { useRombelQuery } from "@/hooks/useRombel";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { RaportKelasSiswaRow } from "@shared/types";

const MODULE = "raport_kelas";

export function RaportKelasPage() {
  const { can } = usePermission();
  const { data: rombelData } = useRombelQuery();
  const [rombelId, setRombelId] = useState("");
  const { data, isLoading } = useRaportKelasQuery(rombelId || null);
  const { data: kekuranganData } = useKekuranganFinalisasi(rombelId || null);
  const finalisasi = useFinalisasiRombel(rombelId);
  const bukaKunci = useBukaKunciRombel(rombelId);

  const [selectedRow, setSelectedRow] = useState<RaportKelasSiswaRow | null>(null);
  const [konfirmasiFinalisasi, setKonfirmasiFinalisasi] = useState(false);
  const [bukaKunciOpen, setBukaKunciOpen] = useState(false);
  const [alasanBuka, setAlasanBuka] = useState("");

  const konteks = data?.item;
  const adaKekurangan = (kekuranganData?.items.length ?? 0) > 0;

  function handleFinalisasi() {
    finalisasi.mutate(undefined, {
      onSuccess: () => {
        toast.success("Raport rombel berhasil difinalkan.");
        setKonfirmasiFinalisasi(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal memfinalkan."),
    });
  }

  function handleBukaKunci() {
    if (!alasanBuka.trim()) {
      toast.error("Alasan wajib diisi.");
      return;
    }
    bukaKunci.mutate(
      { alasan: alasanBuka },
      {
        onSuccess: () => {
          toast.success("Kunci raport dibuka.");
          setBukaKunciOpen(false);
          setAlasanBuka("");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal membuka kunci."),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Raport Kelas</h1>
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Badge variant={konteks.terkunci ? "secondary" : "outline"}>
                {konteks.terkunci ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {konteks.terkunci ? "Terkunci" : "Draf"}
              </Badge>
              {adaKekurangan && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> {kekuranganData!.items.length} siswa belum lengkap nilainya
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {!konteks.terkunci && can(MODULE, "approve") && (
                <Button size="sm" onClick={() => setKonfirmasiFinalisasi(true)} disabled={adaKekurangan}>
                  <CheckCircle2 className="h-4 w-4" /> Finalkan Raport
                </Button>
              )}
              {konteks.terkunci && can(MODULE, "approve") && (
                <Button size="sm" variant="outline" onClick={() => setBukaKunciOpen(true)}>
                  <Unlock className="h-4 w-4" /> Buka Kunci (Admin)
                </Button>
              )}
            </div>
          </div>

          {adaKekurangan && (
            <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="mb-1 font-medium text-destructive">Belum bisa difinalkan:</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {kekuranganData!.items.map((k) => (
                  <li key={k.siswaId}>
                    {k.namaLengkap} — {k.jumlahMapelBelumNilai} mapel belum dinilai
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {konteks.rows.map((row) => (
              <button
                key={row.siswaId}
                type="button"
                onClick={() => setSelectedRow(row)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left hover:bg-accent"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {row.nomorAbsen ? `${row.nomorAbsen}. ` : ""}
                    {row.namaLengkap}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.ekskul.length} ekskul · {row.catatanPendidik ? "ada catatan" : "belum ada catatan"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!row.nilaiLengkap && (
                    <Badge variant="destructive">{row.jumlahMapelBelumNilai} mapel kosong</Badge>
                  )}
                  <Badge variant={row.status === "final" ? "secondary" : "outline"}>{STATUS_RAPORT_SISWA_LABELS[row.status]}</Badge>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {konteks && <RaportSiswaDialog row={selectedRow} konteks={konteks} onOpenChange={(o) => !o && setSelectedRow(null)} />}

      <AlertDialog open={konfirmasiFinalisasi} onOpenChange={setKonfirmasiFinalisasi}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalkan Raport Rombel Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Nilai, deskripsi, dan data raport semua siswa di rombel ini akan dikunci dan tidak bisa diubah
              lagi kecuali dibuka oleh Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalisasi}>Finalkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bukaKunciOpen} onOpenChange={setBukaKunciOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buka Kunci Raport Rombel Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Wali kelas bisa mengedit lagi setelah ini. Kode verifikasi yang sudah ada tidak akan berubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={alasanBuka} onChange={(e) => setAlasanBuka(e.target.value)} placeholder="Alasan membuka kunci..." rows={2} />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlasanBuka("")}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBukaKunci}>Buka Kunci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
