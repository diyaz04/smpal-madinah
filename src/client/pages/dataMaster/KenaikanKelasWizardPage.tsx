import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";

import { SEMESTER_LABELS } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePromotionOverview, usePromoteSiswa } from "@/hooks/useKenaikanKelas";
import { useAcademicPeriodsQuery } from "@/hooks/useAcademicPeriods";
import { useRombelQuery } from "@/hooks/useRombel";
import { ApiError } from "@/lib/api";
import type { PromotionAction } from "@shared/schemas/kenaikanKelas.schema";

const NONE_VALUE = "__none__";
type Step = 1 | 2 | 3 | 4;

interface MappingState {
  action: PromotionAction;
  targetRombelId: string | null;
}

export function KenaikanKelasWizardPage() {
  const [step, setStep] = useState<Step>(1);
  const [targetPeriodId, setTargetPeriodId] = useState("");
  const [mappings, setMappings] = useState<Record<string, MappingState>>({});
  const [result, setResult] = useState<{ promoted: number; lulus: number; skipped: number } | null>(null);

  const { data: overview, isLoading: overviewLoading } = usePromotionOverview();
  const { data: periodsData } = useAcademicPeriodsQuery();
  const { data: targetRombelData } = useRombelQuery(targetPeriodId || undefined);
  const promote = usePromoteSiswa();

  const otherPeriods = (periodsData?.periods ?? []).filter((p) => !p.isActive);

  function setMapping(rombelId: string, patch: Partial<MappingState>) {
    setMappings((prev) => ({
      ...prev,
      [rombelId]: { action: prev[rombelId]?.action ?? "naik", targetRombelId: prev[rombelId]?.targetRombelId ?? null, ...patch },
    }));
  }

  const totalAktif = useMemo(
    () => (overview?.items ?? []).reduce((sum, r) => sum + r.jumlahSiswaAktif, 0),
    [overview],
  );

  function handleSubmit() {
    const mappingList = (overview?.items ?? []).map((r) => {
      const m = mappings[r.id] ?? { action: "lewati" as PromotionAction, targetRombelId: null };
      return { sourceRombelId: r.id, action: m.action, targetRombelId: m.action === "naik" ? m.targetRombelId : null };
    });
    promote.mutate(
      { targetPeriodId, mappings: mappingList },
      {
        onSuccess: (res) => {
          setResult(res);
          setStep(4);
          toast.success("Proses kenaikan kelas selesai.");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal memproses kenaikan kelas."),
      },
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Kenaikan Kelas &amp; Kelulusan</h1>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {(["Periode Tujuan", "Pemetaan Rombel", "Pratinjau", "Selesai"] as const).map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <span
              className={
                step === i + 1 ? "font-semibold text-primary" : step > i + 1 ? "text-success" : "text-muted-foreground"
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
          <p className="text-sm text-muted-foreground">
            Proses ini memindahkan siswa aktif dari rombel di periode berjalan ke rombel tujuan di periode
            baru, atau menandai lulus untuk tingkat akhir. Siswa yang tidak naik kelas atau pindah/keluar bisa
            diatur manual lewat halaman Siswa setelah ini.
          </p>
          {overviewLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (overview?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada rombel berisi siswa di periode aktif.</p>
          ) : (
            <div className="space-y-1.5">
              {overview!.items.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>
                    {r.tingkat} {r.nama}
                  </span>
                  <Badge variant="outline">{r.jumlahSiswaAktif} siswa aktif</Badge>
                </div>
              ))}
              <p className="pt-1 text-sm font-medium text-foreground">Total: {totalAktif} siswa aktif</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Periode Tujuan</label>
            <Select value={targetPeriodId} onValueChange={setTargetPeriodId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Pilih periode tujuan" />
              </SelectTrigger>
              <SelectContent>
                {otherPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.yearLabel} — {SEMESTER_LABELS[p.semester]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setStep(2)} disabled={!targetPeriodId || (overview?.items.length ?? 0) === 0}>
            Lanjut ke Pemetaan Rombel <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            {(overview?.items ?? []).map((r) => {
              const m = mappings[r.id] ?? { action: "naik" as PromotionAction, targetRombelId: null };
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <span className="w-28 shrink-0 font-medium text-foreground">
                    {r.tingkat} {r.nama}
                  </span>
                  <Badge variant="outline">{r.jumlahSiswaAktif} siswa</Badge>
                  <Select value={m.action} onValueChange={(v) => setMapping(r.id, { action: v as PromotionAction })}>
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="naik">Naik Kelas</SelectItem>
                      <SelectItem value="lulus">Lulus</SelectItem>
                      <SelectItem value="lewati">Lewati (atur manual)</SelectItem>
                    </SelectContent>
                  </Select>
                  {m.action === "naik" && (
                    <Select
                      value={m.targetRombelId ?? NONE_VALUE}
                      onValueChange={(v) => setMapping(r.id, { targetRombelId: v === NONE_VALUE ? null : v })}
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="Pilih rombel tujuan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Pilih rombel tujuan</SelectItem>
                        {(targetRombelData?.items ?? []).map((tr) => (
                          <SelectItem key={tr.id} value={tr.id}>
                            {tr.tingkat} {tr.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
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

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 font-medium text-foreground">Ringkasan</p>
            <div className="space-y-1">
              {(overview?.items ?? []).map((r) => {
                const m = mappings[r.id] ?? { action: "lewati" as PromotionAction, targetRombelId: null };
                const targetNama = targetRombelData?.items.find((tr) => tr.id === m.targetRombelId);
                return (
                  <p key={r.id} className="text-sm text-muted-foreground">
                    {r.tingkat} {r.nama} ({r.jumlahSiswaAktif} siswa) —{" "}
                    {m.action === "naik"
                      ? `naik ke ${targetNama ? `${targetNama.tingkat} ${targetNama.nama}` : "(rombel belum dipilih)"}`
                      : m.action === "lulus"
                        ? "lulus"
                        : "dilewati"}
                  </p>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            <Button onClick={handleSubmit} disabled={promote.isPending}>
              {promote.isPending && <Loader2 className="animate-spin" />}
              <ArrowUpCircle className="h-4 w-4" /> Proses Kenaikan Kelas
            </Button>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">Proses kenaikan kelas selesai.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{result.promoted} siswa naik kelas</Badge>
            <Badge>{result.lulus} siswa lulus</Badge>
            {result.skipped > 0 && <Badge variant="secondary">{result.skipped} dilewati</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Siswa yang tidak naik kelas, pindah, atau keluar bisa diatur lewat halaman Siswa.
          </p>
        </div>
      )}
    </div>
  );
}
