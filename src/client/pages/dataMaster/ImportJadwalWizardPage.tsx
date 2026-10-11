import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Loader2, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { parseJadwalSheet, type JadwalParseResult } from "@shared/jadwal-parser";
import { HARI_LIST } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sheetToGrid } from "@/lib/sheetGridAdapter";
import { useMatchImport, useSaveGuruAliasBulk, useCommitImport } from "@/hooks/useJadwalImport";
import { useMapelQuery } from "@/hooks/useMapel";
import { useRombelQuery } from "@/hooks/useRombel";
import { useGuruSimple } from "@/hooks/useGuruSimple";
import { ApiError } from "@/lib/api";
import type { JadwalImportMatchResult } from "@shared/types";

const NONE_VALUE = "__skip__";

type Step = 1 | 2 | 3 | 4;

export function ImportJadwalWizardPage() {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<JadwalParseResult | null>(null);
  const [matchResult, setMatchResult] = useState<JadwalImportMatchResult | null>(null);

  const [mapelResolution, setMapelResolution] = useState<Record<string, string | null>>({});
  const [rombelResolution, setRombelResolution] = useState<Record<string, string | null>>({});
  const [guruResolution, setGuruResolution] = useState<Record<string, string | null>>({});
  const [manuallyResolvedGuru, setManuallyResolvedGuru] = useState<Record<string, string>>({});

  const [versiName, setVersiName] = useState("Impor Excel");
  const [commitResult, setCommitResult] = useState<{
    versiId: string;
    slotCount: number;
    isiCount: number;
    warnings: { level: string; message: string }[];
  } | null>(null);

  const { data: mapelData } = useMapelQuery();
  const { data: rombelData } = useRombelQuery();
  const { data: guruData } = useGuruSimple();
  const matchImport = useMatchImport();
  const saveAlias = useSaveGuruAliasBulk();
  const commitImport = useCommitImport();

  async function handleFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]!];
      if (!ws) throw new Error("Sheet kosong");
      const grid = sheetToGrid(XLSX, ws);
      const result = parseJadwalSheet(grid);
      setParseResult(result);
      if (result.entries.length === 0) {
        toast.warning("Tidak ada jadwal yang terbaca dari file ini. Periksa kembali formatnya.");
      }
    } catch {
      toast.error("Gagal membaca file. Pastikan formatnya .xlsx sesuai struktur jadwal sekolah.");
    } finally {
      setParsing(false);
    }
  }

  async function handleGoToPemetaan() {
    if (!parseResult) return;
    const mapelCodes = [...new Set(parseResult.entries.map((e) => e.kodeMapel).filter((v): v is string => !!v))];
    const rombelNames = parseResult.rombelNames;
    const guruNamesSet = new Set<string>();
    for (const e of parseResult.entries) e.namaGuru.forEach((g) => guruNamesSet.add(g));
    for (const p of parseResult.piket) p.namaGuru.forEach((g) => guruNamesSet.add(g));

    matchImport.mutate(
      { mapelCodes, rombelNames, guruNames: [...guruNamesSet] },
      {
        onSuccess: (res) => {
          setMatchResult(res);
          setMapelResolution(Object.fromEntries(res.mapel.map((m) => [m.kodeAsli, m.matchedMapelId])));
          setRombelResolution(Object.fromEntries(res.rombel.map((r) => [r.namaAsli, r.matchedRombelId])));
          setGuruResolution(Object.fromEntries(res.guru.map((g) => [g.namaAsli, g.matchedGuruId])));
          setStep(2);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mencocokkan data."),
      },
    );
  }

  const unresolvedMapel = (matchResult?.mapel ?? []).filter((m) => !mapelResolution[m.kodeAsli]);
  const unresolvedRombel = (matchResult?.rombel ?? []).filter((r) => !rombelResolution[r.namaAsli]);
  const unresolvedGuru = (matchResult?.guru ?? []).filter((g) => !guruResolution[g.namaAsli]);

  const summaryByHari = useMemo(() => {
    if (!parseResult) return [];
    return HARI_LIST.map((h) => ({
      hari: h,
      count: parseResult.entries.filter((e) => e.hari === h).length,
    })).filter((x) => x.count > 0);
  }, [parseResult]);

  async function handleCommit() {
    if (!parseResult) return;

    const aliasItems = Object.entries(manuallyResolvedGuru).map(([namaAsli, guruId]) => ({
      guruId,
      aliasNama: namaAsli,
    }));
    if (aliasItems.length > 0) {
      await saveAlias.mutateAsync({ items: aliasItems }).catch(() => {
        toast.warning("Sebagian alias guru gagal disimpan, tapi impor tetap dilanjutkan.");
      });
    }

    const entries = parseResult.entries.map((e) => ({
      hari: e.hari,
      jamMulai: e.jamMulai,
      jamSelesai: e.jamSelesai,
      jamKe: e.jamKe,
      jenisSlot: e.jenisSlot,
      rombelId: rombelResolution[e.rombelNama] ?? null,
      mapelId: e.kodeMapel ? (mapelResolution[e.kodeMapel] ?? null) : null,
      guruIds: e.namaGuru.map((g) => guruResolution[g]).filter((v): v is string => !!v),
      keterangan: e.keterangan ?? "",
    }));
    const piket = parseResult.piket.map((p) => ({
      hari: p.hari,
      guruIds: p.namaGuru.map((g) => guruResolution[g]).filter((v): v is string => !!v),
    }));

    commitImport.mutate(
      { versiName, entries, piket },
      {
        onSuccess: (res) => {
          setCommitResult(res);
          setStep(4);
          toast.success("Draf jadwal berhasil dibuat dari impor.");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengimpor jadwal."),
      },
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Import Jadwal dari Excel</h1>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {(["Unggah", "Pemetaan", "Pratinjau", "Selesai"] as const).map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <span
              className={
                step === i + 1
                  ? "font-semibold text-primary"
                  : step > i + 1
                    ? "text-success"
                    : "text-muted-foreground"
              }
            >
              {i + 1}. {label}
            </span>
            {i < 3 && <ArrowRight className="h-3 w-3" />}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center hover:bg-accent">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {fileName || "Klik untuk pilih file jadwal .xlsx"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>

          {parsing && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Membaca & mengurai file...
            </p>
          )}

          {parseResult && !parsing && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge>
                  <CheckCircle2 className="h-3 w-3" /> {parseResult.entries.length} entri terbaca
                </Badge>
                <Badge variant="outline">{parseResult.rombelNames.length} rombel terdeteksi</Badge>
                <Badge variant="outline">{parseResult.piket.length} baris piket</Badge>
                {parseResult.warnings.length > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3" /> {parseResult.warnings.length} peringatan
                  </Badge>
                )}
              </div>
              <Button onClick={handleGoToPemetaan} disabled={matchImport.isPending || parseResult.entries.length === 0}>
                {matchImport.isPending && <Loader2 className="animate-spin" />}
                Lanjut ke Pemetaan <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && matchResult && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cocokkan kode/nama yang belum terbaca otomatis. Yang sudah cocok tidak perlu diubah.
          </p>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 font-medium text-foreground">
              Mata Pelajaran ({matchResult.mapel.length - unresolvedMapel.length}/{matchResult.mapel.length} cocok)
            </p>
            <div className="space-y-1.5">
              {matchResult.mapel.map((m) => (
                <div key={m.kodeAsli} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 font-mono">{m.kodeAsli}</span>
                  {mapelResolution[m.kodeAsli] ? (
                    <button
                      type="button"
                      onClick={() => setMapelResolution((prev) => ({ ...prev, [m.kodeAsli]: null }))}
                    >
                      <Badge>
                        <CheckCircle2 className="h-3 w-3" />{" "}
                        {mapelData?.items.find((x) => x.id === mapelResolution[m.kodeAsli])?.nama} (ubah)
                      </Badge>
                    </button>
                  ) : (
                    <Select
                      value={mapelResolution[m.kodeAsli] ?? NONE_VALUE}
                      onValueChange={(v) =>
                        setMapelResolution((prev) => ({ ...prev, [m.kodeAsli]: v === NONE_VALUE ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder={m.suggestion ? `Saran: ${m.suggestion}` : "Lewati"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Lewati</SelectItem>
                        {(mapelData?.items ?? []).map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 font-medium text-foreground">
              Rombel ({matchResult.rombel.length - unresolvedRombel.length}/{matchResult.rombel.length} cocok)
            </p>
            <div className="space-y-1.5">
              {matchResult.rombel.map((r) => (
                <div key={r.namaAsli} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 font-mono">{r.namaAsli}</span>
                  {rombelResolution[r.namaAsli] ? (
                    <button
                      type="button"
                      onClick={() => setRombelResolution((prev) => ({ ...prev, [r.namaAsli]: null }))}
                    >
                      <Badge>
                        <CheckCircle2 className="h-3 w-3" />{" "}
                        {rombelData?.items.find((x) => x.id === rombelResolution[r.namaAsli])?.nama} (ubah)
                      </Badge>
                    </button>
                  ) : (
                    <Select
                      value={rombelResolution[r.namaAsli] ?? NONE_VALUE}
                      onValueChange={(v) =>
                        setRombelResolution((prev) => ({ ...prev, [r.namaAsli]: v === NONE_VALUE ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="Lewati" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Lewati</SelectItem>
                        {(rombelData?.items ?? []).map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.tingkat} {x.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 font-medium text-foreground">
              Guru ({matchResult.guru.length - unresolvedGuru.length}/{matchResult.guru.length} cocok)
            </p>
            <div className="space-y-1.5">
              {matchResult.guru.map((g) => (
                <div key={g.namaAsli} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 font-mono">{g.namaAsli}</span>
                  {guruResolution[g.namaAsli] ? (
                    <button
                      type="button"
                      onClick={() => {
                        setGuruResolution((prev) => ({ ...prev, [g.namaAsli]: null }));
                        setManuallyResolvedGuru((prev) => {
                          const next = { ...prev };
                          delete next[g.namaAsli];
                          return next;
                        });
                      }}
                    >
                      <Badge>
                        <CheckCircle2 className="h-3 w-3" />{" "}
                        {guruData?.items.find((x) => x.id === guruResolution[g.namaAsli])?.namaLengkap} (ubah)
                      </Badge>
                    </button>
                  ) : (
                    <Select
                      value={guruResolution[g.namaAsli] ?? NONE_VALUE}
                      onValueChange={(v) => {
                        const resolved = v === NONE_VALUE ? null : v;
                        setGuruResolution((prev) => ({ ...prev, [g.namaAsli]: resolved }));
                        if (resolved) setManuallyResolvedGuru((prev) => ({ ...prev, [g.namaAsli]: resolved }));
                      }}
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder={g.suggestion ? `Saran: ${g.suggestion}` : "Lewati"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Lewati</SelectItem>
                        {(guruData?.items ?? []).map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.namaLengkap}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Guru yang dicocokkan manual akan diingat sebagai alias untuk impor berikutnya.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            <Button onClick={() => setStep(3)}>
              Lanjut ke Pratinjau <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && parseResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Nama Versi Jadwal</label>
              <Input value={versiName} onChange={(e) => setVersiName(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {summaryByHari.map((s) => (
                <Badge key={s.hari} variant="outline">
                  {s.hari}: {s.count}
                </Badge>
              ))}
            </div>
            {parseResult.warnings.length > 0 && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-xs text-muted-foreground">
                {parseResult.warnings.map((w, i) => (
                  <p key={i}>⚠ {w.message}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            <Button onClick={handleCommit} disabled={commitImport.isPending || !versiName.trim()}>
              {commitImport.isPending && <Loader2 className="animate-spin" />}
              Buat Draf Jadwal
            </Button>
          </div>
        </div>
      )}

      {step === 4 && commitResult && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">Draf jadwal berhasil dibuat.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{commitResult.slotCount} jam pelajaran</Badge>
            <Badge>{commitResult.isiCount} isi jadwal</Badge>
            {commitResult.warnings.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3" /> {commitResult.warnings.length} peringatan
              </Badge>
            )}
          </div>
          {commitResult.warnings.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-xs text-muted-foreground">
              {commitResult.warnings.map((w, i) => (
                <p key={i}>⚠ {w.message}</p>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Periksa dan sunting manual bila perlu di halaman Jadwal Pelajaran, lalu aktifkan versi ini kalau
            sudah sesuai.
          </p>
          <Button asChild>
            <Link to="/data-master/jadwal">Buka Jadwal Pelajaran</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
