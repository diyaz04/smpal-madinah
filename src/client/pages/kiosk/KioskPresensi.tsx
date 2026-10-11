import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Check, X, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { useWajahDescriptors, useDaftarGuru, useUploadPresensiFoto, useSubmitPresensiWajah, useSubmitPresensiPin } from "@/hooks/useKioskPresensi";
import { getHuman, detectFace, matchFace, descriptorToBase64, type MatchResult } from "@/lib/humanFace";
import { DEFAULT_AMBANG_KEMIRIPAN_WAJAH } from "@shared/constants";
import { ApiError } from "@/lib/api";

type PresensiState = "mendeteksi" | "konfirmasi" | "tidak_dikenali" | "pilih_jenis" | "pin" | "sukses";

const INSTRUKSI_LIST = ["Lihat lurus ke kamera", "Berkedip perlahan", "Toleh sedikit ke kiri", "Toleh sedikit ke kanan"];

interface KioskPresensiProps {
  onSelesai: () => void;
}

function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], "selfie.jpg", { type: "image/jpeg" })) : reject(new Error("Gagal memproses gambar"))),
      "image/jpeg",
      0.8,
    );
  });
}

export function KioskPresensi({ onSelesai }: KioskPresensiProps) {
  const [state, setState] = useState<PresensiState>("mendeteksi");
  const [instruksi] = useState(() => INSTRUKSI_LIST[Math.floor(Math.random() * INSTRUKSI_LIST.length)]!);
  const [modelSiap, setModelSiap] = useState(false);
  const [match, setMatch] = useState<(MatchResult & { canvas: HTMLCanvasElement; liveness: boolean; namaGuru: string }) | null>(null);
  const [sukesInfo, setSukesInfo] = useState<{ nama: string; jam: string; status: string } | null>(null);
  const [memproses, setMemproses] = useState(false);

  const { data: descriptorData } = useWajahDescriptors();
  const { data: guruData } = useDaftarGuru();
  const uploadFoto = useUploadPresensiFoto();
  const submitWajah = useSubmitPresensiWajah();

  const kameraAktif = state === "mendeteksi";
  const { videoRef, error: cameraError, ready, captureCanvas } = useCameraCapture(kameraAktif);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHuman().then(() => {
      if (!cancelled) setModelSiap(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "mendeteksi" || !ready || !modelSiap || !descriptorData) return;

    const candidates = descriptorData.items.map((d) => ({ guruId: d.guruId, descriptor: d.descriptor }));
    const guruNamaById = new Map((guruData?.items ?? []).map((g) => [g.id, g.nama]));

    detectIntervalRef.current = setInterval(async () => {
      const canvas = captureCanvas();
      if (!canvas) return;
      const human = await getHuman();
      const face = await detectFace(human, canvas);
      if (!face || !face.embedding) return;

      const liveness = (face.live ?? 0) > 0.5 && (face.real ?? 0) > 0.5;
      const found = matchFace(human, face.embedding, candidates, DEFAULT_AMBANG_KEMIRIPAN_WAJAH);
      if (!found) return;

      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
      setMatch({ ...found, canvas, liveness, namaGuru: guruNamaById.get(found.guruId) ?? "—" });
      setState("konfirmasi");
    }, 700);

    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [state, ready, modelSiap, descriptorData, guruData, captureCanvas]);

  function handleCobaLagi() {
    setMatch(null);
    setState("mendeteksi");
  }

  function handleBukan() {
    setMatch(null);
    setState("tidak_dikenali");
  }

  async function handlePilihJenis(jenis: "datang" | "pulang") {
    if (!match) return;
    setMemproses(true);
    try {
      const file = await canvasToFile(match.canvas);
      const uploaded = await uploadFoto.mutateAsync(file);
      const human = await getHuman();
      const face = await detectFace(human, match.canvas);
      const embedding = face?.embedding ? descriptorToBase64(face.embedding) : null;

      const result = await submitWajah.mutateAsync({
        guruId: match.guruId,
        jenis,
        fotoFileId: uploaded.fileId,
        skorKemiripan: match.similarity,
        livenessLolos: match.liveness,
        embeddingUntukBelajar: embedding,
      });

      if ("queued" in result) {
        toast.info("Offline — presensi tersimpan, akan terkirim otomatis saat online.");
        setSukesInfo({ nama: match.namaGuru, jam: "—", status: "Tersimpan (offline)" });
      } else {
        setSukesInfo({ nama: match.namaGuru, jam: new Date().toTimeString().slice(0, 5), status: jenis === "datang" ? "Datang" : "Pulang" });
      }
      setState("sukses");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan presensi.");
      setState("mendeteksi");
    } finally {
      setMemproses(false);
    }
  }

  useEffect(() => {
    if (state !== "sukses") return;
    const timeout = setTimeout(onSelesai, 4000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state === "pin") {
    return <KioskPresensiPin onKembali={() => setState("mendeteksi")} onSelesai={onSelesai} />;
  }

  if (state === "sukses" && sukesInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted p-8 text-center">
        <Check className="h-20 w-20 rounded-full bg-success/20 p-4 text-success" />
        <h1 className="text-3xl font-bold text-foreground">{sukesInfo.nama}</h1>
        <p className="text-xl text-muted-foreground">
          {sukesInfo.status} {sukesInfo.jam !== "—" && `· ${sukesInfo.jam}`}
        </p>
      </div>
    );
  }

  if (state === "pilih_jenis" && match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{match.namaGuru}</h1>
        <p className="text-muted-foreground">Pilih jenis presensi</p>
        <div className="flex gap-4">
          <Button size="lg" disabled={memproses} onClick={() => handlePilihJenis("datang")}>
            {memproses && <Loader2 className="animate-spin" />} Datang
          </Button>
          <Button size="lg" variant="outline" disabled={memproses} onClick={() => handlePilihJenis("pulang")}>
            {memproses && <Loader2 className="animate-spin" />} Pulang
          </Button>
        </div>
      </div>
    );
  }

  if (state === "konfirmasi" && match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Benar Bu/Pak {match.namaGuru}?</h1>
        <div className="flex gap-4">
          <Button size="lg" onClick={() => setState("pilih_jenis")}>
            <Check className="h-5 w-5" /> Ya
          </Button>
          <Button size="lg" variant="outline" onClick={handleBukan}>
            <X className="h-5 w-5" /> Bukan
          </Button>
        </div>
      </div>
    );
  }

  if (state === "tidak_dikenali") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Wajah belum dikenali</h1>
        <div className="flex gap-4">
          <Button size="lg" onClick={handleCobaLagi}>
            Coba Lagi
          </Button>
          <Button size="lg" variant="outline" onClick={() => setState("pin")}>
            <KeyRound className="h-5 w-5" /> Pakai PIN
          </Button>
        </div>
        <Button variant="ghost" onClick={onSelesai}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted p-8 text-center">
      <h1 className="text-xl font-semibold text-foreground">{instruksi}</h1>
      {cameraError ? (
        <p className="text-destructive">{cameraError}</p>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md rounded-2xl bg-black" />
      )}
      {!modelSiap && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat model wajah...
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setState("pin")}>
          <KeyRound className="h-4 w-4" /> Pakai PIN
        </Button>
        <Button variant="ghost" onClick={onSelesai}>
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>
    </div>
  );
}

function KioskPresensiPin({ onKembali, onSelesai }: { onKembali: () => void; onSelesai: () => void }) {
  const { data: guruData } = useDaftarGuru();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; nama: string } | null>(null);
  const [pin, setPin] = useState("");
  const [memproses, setMemproses] = useState(false);
  const { videoRef, ready, captureCanvas } = useCameraCapture(!!selected);
  const uploadFoto = useUploadPresensiFoto();
  const submitPin = useSubmitPresensiPin();

  const filtered = (guruData?.items ?? []).filter((g) => g.nama.toLowerCase().includes(search.toLowerCase())).slice(0, 8);

  async function handleSubmit(jenis: "datang" | "pulang") {
    if (!selected || pin.length < 4) return;
    setMemproses(true);
    try {
      const canvas = captureCanvas();
      if (!canvas || !ready) {
        toast.error("Kamera belum siap untuk selfie.");
        return;
      }
      const file = await canvasToFile(canvas);
      const uploaded = await uploadFoto.mutateAsync(file);

      const result = await submitPin.mutateAsync({ guruId: selected.id, jenis, pin, fotoFileId: uploaded.fileId });
      if ("queued" in result) {
        toast.info("Offline — presensi tersimpan, akan terkirim otomatis saat online.");
      } else {
        toast.success(`Presensi ${jenis} berhasil untuk ${selected.nama}.`);
      }
      onSelesai();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan presensi.");
    } finally {
      setMemproses(false);
    }
  }

  if (selected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{selected.nama}</h1>
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-xs rounded-2xl bg-black" />
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="PIN"
          inputMode="numeric"
          className="h-14 w-48 text-center text-2xl tracking-widest"
          maxLength={6}
        />
        <div className="flex gap-3">
          <Button size="lg" disabled={memproses || pin.length < 4} onClick={() => handleSubmit("datang")}>
            Datang
          </Button>
          <Button size="lg" variant="outline" disabled={memproses || pin.length < 4} onClick={() => handleSubmit("pulang")}>
            Pulang
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4" /> Ganti Guru
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-muted p-8">
      <h1 className="text-2xl font-semibold text-foreground">Cari Nama Anda</h1>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik nama..." className="h-14 max-w-md text-lg" autoFocus />
      <div className="grid w-full max-w-md gap-2">
        {filtered.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelected({ id: g.id, nama: g.nama })}
            className="rounded-xl border border-border bg-card p-4 text-left text-lg hover:bg-accent"
          >
            {g.nama}
          </button>
        ))}
      </div>
      <Button variant="ghost" onClick={onKembali}>
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>
    </div>
  );
}
