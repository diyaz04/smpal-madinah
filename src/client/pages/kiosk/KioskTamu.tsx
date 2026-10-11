import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Check, Loader2, User, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { useUploadTamuFoto, useCatatKunjungan } from "@/hooks/useKioskTamu";
import { useDaftarGuru } from "@/hooks/useKioskPresensi";
import { ApiError } from "@/lib/api";
import type { TamuJenis } from "@shared/constants";

type TamuState = "jenis" | "form" | "sukses";

interface KioskTamuProps {
  onSelesai: () => void;
}

function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], "tamu.jpg", { type: "image/jpeg" })) : reject(new Error("Gagal memproses gambar"))),
      "image/jpeg",
      0.8,
    );
  });
}

export function KioskTamu({ onSelesai }: KioskTamuProps) {
  const [state, setState] = useState<TamuState>("jenis");
  const [jenis, setJenis] = useState<TamuJenis>("individu");
  const [namaInstansi, setNamaInstansi] = useState("");
  const [nama, setNama] = useState("");
  const [maksudTujuan, setMaksudTujuan] = useState("");
  const [noHp, setNoHp] = useState("");
  const [inginBertemuGuruId, setInginBertemuGuruId] = useState("");
  const [memproses, setMemproses] = useState(false);

  const { data: guruData } = useDaftarGuru();
  const { videoRef, ready, captureCanvas } = useCameraCapture(state === "form");
  const uploadFoto = useUploadTamuFoto();
  const catatKunjungan = useCatatKunjungan();

  function handlePilihJenis(j: TamuJenis) {
    setJenis(j);
    setState("form");
  }

  async function handleSubmit() {
    if (nama.trim().length < 3) {
      toast.error("Nama minimal 3 huruf.");
      return;
    }
    if (!maksudTujuan.trim()) {
      toast.error("Maksud & tujuan wajib diisi.");
      return;
    }
    const canvas = captureCanvas();
    if (!canvas || !ready) {
      toast.error("Kamera belum siap.");
      return;
    }
    setMemproses(true);
    try {
      const file = await canvasToFile(canvas);
      const uploaded = await uploadFoto.mutateAsync(file);
      await catatKunjungan.mutateAsync({
        jenis,
        namaInstansi: jenis === "instansi" ? namaInstansi : null,
        nama,
        maksudTujuan,
        noHp: noHp || null,
        inginBertemuGuruId: inginBertemuGuruId || null,
        fotoFileId: uploaded.fileId,
      });
      setState("sukses");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan data tamu.");
    } finally {
      setMemproses(false);
    }
  }

  useEffect(() => {
    if (state !== "sukses") return;
    const timeout = setTimeout(onSelesai, 5000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state === "sukses") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted p-8 text-center">
        <Check className="h-20 w-20 rounded-full bg-success/20 p-4 text-success" />
        <h1 className="text-2xl font-bold text-foreground">Terima kasih, {nama}</h1>
        <p className="text-lg text-muted-foreground">Silakan menunggu. Petugas akan segera melayani.</p>
      </div>
    );
  }

  if (state === "form") {
    return (
      <div className="flex min-h-screen flex-col items-center gap-4 bg-muted p-6">
        <h1 className="text-2xl font-semibold text-foreground">{jenis === "individu" ? "Tamu Individu" : "Tamu Instansi"}</h1>
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-xs rounded-2xl bg-black" />
        <div className="w-full max-w-md space-y-3">
          {jenis === "instansi" && (
            <Input value={namaInstansi} onChange={(e) => setNamaInstansi(e.target.value)} placeholder="Nama Instansi" className="h-12 text-lg" />
          )}
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Lengkap" className="h-12 text-lg" />
          <Textarea value={maksudTujuan} onChange={(e) => setMaksudTujuan(e.target.value)} placeholder="Maksud & Tujuan" rows={2} />
          <Input value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="No. HP (opsional)" className="h-12" />
          <select
            value={inginBertemuGuruId}
            onChange={(e) => setInginBertemuGuruId(e.target.value)}
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="">Ingin bertemu dengan (opsional)</option>
            {(guruData?.items ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setState("jenis")}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
          <Button size="lg" disabled={memproses} onClick={handleSubmit}>
            {memproses ? <Loader2 className="animate-spin" /> : <Camera className="h-5 w-5" />}
            Kirim
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Buku Tamu</h1>
      <div className="grid grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => handlePilihJenis("individu")}
          className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-10 hover:bg-accent"
        >
          <User className="h-16 w-16 text-primary" />
          <span className="text-xl font-semibold text-foreground">Individu</span>
        </button>
        <button
          type="button"
          onClick={() => handlePilihJenis("instansi")}
          className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-10 hover:bg-accent"
        >
          <Building2 className="h-16 w-16 text-primary" />
          <span className="text-xl font-semibold text-foreground">Instansi</span>
        </button>
      </div>
      <Button variant="ghost" onClick={onSelesai}>
        <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
      </Button>
    </div>
  );
}
