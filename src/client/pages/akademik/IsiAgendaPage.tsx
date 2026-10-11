import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, WifiOff, History, Users } from "lucide-react";
import { toast } from "sonner";

import { ABSENSI_PERTEMUAN_STATUS_LIST, ABSENSI_PERTEMUAN_STATUS_LABELS } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgendaFormContext, useSubmitAgenda, type AgendaFormParams } from "@/hooks/useAgenda";
import { saveAgendaDraft, loadAgendaDraft, clearAgendaDraft } from "@/lib/agendaDraft";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AbsensiPertemuanStatus } from "@shared/constants";

type AbsensiState = Record<string, { status: AbsensiPertemuanStatus | null; keterangan: string }>;

export function IsiAgendaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const params: AgendaFormParams | null = useMemo(() => {
    const rombelId = searchParams.get("rombel");
    const tanggal = searchParams.get("tanggal");
    const slotMulai = searchParams.get("slot");
    if (!rombelId || !tanggal || !slotMulai) return null;
    return { rombelId, mapelId: searchParams.get("mapel") || null, tanggal, slotMulai };
  }, [searchParams]);

  const { data, isLoading } = useAgendaFormContext(params);
  const submitAgenda = useSubmitAgenda();

  const [materi, setMateri] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [status, setStatus] = useState<"terisi" | "jam_kosong">("terisi");
  const [absensi, setAbsensi] = useState<AbsensiState>({});
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
    }
    function onOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Inisialisasi form: draf lokal (kalau ada) menang atas prefill server.
  useEffect(() => {
    if (!data?.item || !params || loadedOnce) return;
    const draft = loadAgendaDraft(params.rombelId, params.tanggal, params.slotMulai);
    if (draft) {
      setMateri(draft.materi);
      setKegiatan(draft.kegiatan);
      setCatatan(draft.catatan);
      setStatus(draft.status);
      const restored: AbsensiState = {};
      for (const [sid, v] of Object.entries(draft.absensi)) {
        restored[sid] = { status: v.status ? (v.status as AbsensiPertemuanStatus) : null, keterangan: v.keterangan };
      }
      setAbsensi(restored);
      toast.info("Draf tersimpan dimuat kembali.");
    } else {
      const ex = data.item.existingAgenda;
      setMateri(ex?.materi ?? "");
      setKegiatan(ex?.kegiatan ?? "");
      setCatatan(ex?.catatan ?? "");
      setStatus(ex?.status ?? "terisi");
      const initial: AbsensiState = {};
      for (const s of data.item.siswa) initial[s.siswaId] = { status: s.status, keterangan: s.keterangan ?? "" };
      setAbsensi(initial);
    }
    setLoadedOnce(true);
  }, [data, params, loadedOnce]);

  // Auto-save draf tiap ada perubahan.
  useEffect(() => {
    if (!params || !loadedOnce) return;
    const absensiRecord: Record<string, { status: string; keterangan: string }> = {};
    for (const [sid, v] of Object.entries(absensi)) absensiRecord[sid] = { status: v.status ?? "", keterangan: v.keterangan };
    saveAgendaDraft(params.rombelId, params.tanggal, params.slotMulai, { materi, kegiatan, catatan, status, absensi: absensiRecord });
  }, [params, materi, kegiatan, catatan, status, absensi, loadedOnce]);

  if (!params) {
    return <p className="text-sm text-destructive">Parameter tidak lengkap.</p>;
  }

  function setSiswaStatus(siswaId: string, s: AbsensiPertemuanStatus | null) {
    setAbsensi((prev) => ({ ...prev, [siswaId]: { status: s, keterangan: prev[siswaId]?.keterangan ?? "" } }));
  }
  function setSiswaKeterangan(siswaId: string, ket: string) {
    setAbsensi((prev) => ({ ...prev, [siswaId]: { status: prev[siswaId]?.status ?? null, keterangan: ket } }));
  }
  function semuaHadir() {
    setAbsensi((prev) => {
      const next: AbsensiState = {};
      for (const sid of Object.keys(prev)) next[sid] = { status: null, keterangan: "" };
      return next;
    });
  }

  const ringkasan = useMemo(() => {
    const counts: Record<string, number> = { H: 0, S: 0, I: 0, A: 0, T: 0, D: 0 };
    for (const v of Object.values(absensi)) counts[v.status ?? "H"] = (counts[v.status ?? "H"] ?? 0) + 1;
    return counts;
  }, [absensi]);

  function handleSubmit() {
    if (!params) return;
    if (!isOnline) {
      toast.warning("Sedang offline. Draf tersimpan di perangkat, kirim lagi saat online.");
      return;
    }
    const absensiPayload = Object.entries(absensi)
      .filter(([, v]) => v.status !== null)
      .map(([siswaId, v]) => ({ siswaId, status: v.status!, keterangan: v.keterangan }));

    submitAgenda.mutate(
      {
        rombelId: params.rombelId,
        mapelId: params.mapelId,
        tanggal: params.tanggal,
        slotMulai: params.slotMulai,
        materi,
        kegiatan,
        catatan,
        status,
        absensi: absensiPayload,
      },
      {
        onSuccess: () => {
          clearAgendaDraft(params.rombelId, params.tanggal, params.slotMulai);
          toast.success("Agenda berhasil disimpan.");
          navigate("/akademik/agenda");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan agenda."),
      },
    );
  }

  const ctx = data?.item;

  return (
    <div className="space-y-4 pb-24">
      <Link to="/akademik/agenda" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Jadwal Hari Ini
      </Link>

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <WifiOff className="h-4 w-4" /> Sedang offline — isian otomatis tersimpan sebagai draf di perangkat ini.
        </div>
      )}

      {isLoading || !ctx ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <h1 className="text-lg font-semibold text-foreground">
              {ctx.rombelNama} · {ctx.mapelNama ?? "Kegiatan"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ctx.hari}, {ctx.tanggal} · {ctx.slotMulai}–{ctx.slotSelesai}
              {ctx.jamKeMulai && ` (Jam ke-${ctx.jamKeMulai})`} · {ctx.jumlahJp} JP
            </p>
            {ctx.materiTerakhir && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Materi terakhir ({ctx.materiTerakhir.tanggal} oleh {ctx.materiTerakhir.guruNama}): {ctx.materiTerakhir.materi}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-sm font-medium text-foreground">Jam Kosong (guru berhalangan)</span>
            <Switch
              checked={status === "jam_kosong"}
              onCheckedChange={(checked) => setStatus(checked ? "jam_kosong" : "terisi")}
            />
          </div>

          {status === "terisi" && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Materi / Tujuan Pembelajaran</label>
                <Textarea value={materi} onChange={(e) => setMateri(e.target.value)} maxLength={300} rows={2} />
                {ctx.saranMateri.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ctx.saranMateri.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setMateri(s)}
                        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Kegiatan Pembelajaran (opsional)</label>
                <Textarea value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} maxLength={500} rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Catatan (opsional)</label>
                <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Users className="h-4 w-4" /> Absensi ({ctx.siswa.length} siswa)
              </p>
              <Button variant="outline" size="sm" onClick={semuaHadir}>
                Semua Hadir
              </Button>
            </div>
            <div className="space-y-3">
              {ctx.siswa.map((s) => {
                const current = absensi[s.siswaId];
                return (
                  <div key={s.siswaId} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{s.nomorAbsen ?? "-"}</span>
                        <span className="font-medium text-foreground">{s.namaLengkap}</span>
                        {s.sumberPrefill === "izin_harian" && current?.status && (
                          <Badge variant="secondary">dari izin harian</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-6 gap-1">
                      {(["H", ...ABSENSI_PERTEMUAN_STATUS_LIST] as const).map((code) => {
                        const isActive = code === "H" ? !current?.status : current?.status === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setSiswaStatus(s.siswaId, code === "H" ? null : code)}
                            className={cn(
                              "rounded-lg border py-2 text-sm font-semibold",
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                    {current?.status && (
                      <Input
                        className="mt-2 h-8"
                        placeholder={`Keterangan ${ABSENSI_PERTEMUAN_STATUS_LABELS[current.status]} (opsional)`}
                        value={current.keterangan}
                        onChange={(e) => setSiswaKeterangan(s.siswaId, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <p className="flex-1 text-xs text-muted-foreground">
                Hadir {ringkasan.H} · S {ringkasan.S} · I {ringkasan.I} · A {ringkasan.A} · T {ringkasan.T} · D {ringkasan.D}
              </p>
              <Button onClick={handleSubmit} disabled={submitAgenda.isPending}>
                {submitAgenda.isPending && <Loader2 className="animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
