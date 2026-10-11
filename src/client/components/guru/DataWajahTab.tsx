import { useState } from "react";
import { Camera, Loader2, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useCameraCapture } from "@/hooks/useCameraCapture";
import {
  useWajahGuruStatus,
  useSetujuiBiometrik,
  useTarikPersetujuan,
  useUploadWajahThumbnail,
  useTambahDescriptor,
  useHapusDescriptor,
} from "@/hooks/useWajahGuru";
import { getHuman, detectFace, descriptorToBase64 } from "@/lib/humanFace";
import { ApiError } from "@/lib/api";

function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], "wajah.jpg", { type: "image/jpeg" })) : reject(new Error("Gagal memproses gambar"))),
      "image/jpeg",
      0.85,
    );
  });
}

interface DataWajahTabProps {
  guruId: string;
}

export function DataWajahTab({ guruId }: DataWajahTabProps) {
  const { data, isLoading } = useWajahGuruStatus(guruId);
  const setuju = useSetujuiBiometrik(guruId);
  const tarik = useTarikPersetujuan(guruId);
  const uploadThumbnail = useUploadWajahThumbnail();
  const tambahDescriptor = useTambahDescriptor(guruId);
  const hapusDescriptor = useHapusDescriptor(guruId);

  const [tarikConfirmOpen, setTarikConfirmOpen] = useState(false);
  const [kameraAktif, setKameraAktif] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const { videoRef, error: cameraError, ready, captureCanvas } = useCameraCapture(kameraAktif);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Memuat...</p>;
  }

  const item = data.item;

  function handleSetuju() {
    setuju.mutate(undefined, {
      onSuccess: () => toast.success("Persetujuan biometrik dicatat."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan persetujuan."),
    });
  }

  function handleTarik() {
    tarik.mutate(undefined, {
      onSuccess: () => {
        toast.success("Persetujuan ditarik, semua data wajah dihapus.");
        setTarikConfirmOpen(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menarik persetujuan."),
    });
  }

  async function handleAmbilFoto() {
    const canvas = captureCanvas();
    if (!canvas) {
      toast.error("Kamera belum siap.");
      return;
    }
    setMemproses(true);
    try {
      const human = await getHuman();
      const face = await detectFace(human, canvas);
      if (!face) {
        toast.error("Tidak ada wajah terdeteksi. Coba lagi.");
        return;
      }
      if (!face.embedding) {
        toast.error("Gagal mengambil data wajah. Coba lagi dengan pencahayaan lebih baik.");
        return;
      }
      if ((face.boxScore ?? 0) < 0.7) {
        toast.error("Wajah kurang jelas. Pastikan wajah menghadap kamera dan cukup terang.");
        return;
      }

      const file = await canvasToFile(canvas);
      const uploaded = await uploadThumbnail.mutateAsync(file);
      const descriptor = descriptorToBase64(face.embedding);
      await tambahDescriptor.mutateAsync({ descriptor, fotoFileId: uploaded.fileId });
      toast.success("Foto wajah tersimpan.");
      setKameraAktif(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal memproses foto wajah.");
    } finally {
      setMemproses(false);
    }
  }

  function handleHapusDescriptor(id: string) {
    hapusDescriptor.mutate(id, {
      onSuccess: () => toast.success("Foto wajah dihapus."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div className="flex items-center gap-2">
          {item.persetujuanBiometrik ? (
            <ShieldCheck className="h-5 w-5 text-success" />
          ) : (
            <ShieldX className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-foreground">
              {item.persetujuanBiometrik ? "Persetujuan biometrik aktif" : "Belum ada persetujuan biometrik"}
            </p>
            {item.persetujuanTanggal && (
              <p className="text-xs text-muted-foreground">Disetujui {item.persetujuanTanggal}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Data wajah dipakai khusus untuk presensi. Tanpa persetujuan, guru tetap bisa presensi lewat PIN + selfie.
              Persetujuan bisa ditarik kapan saja — menghapus semua data wajah tersimpan.
            </p>
          </div>
        </div>
        {item.persetujuanBiometrik ? (
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setTarikConfirmOpen(true)}>
            Tarik Persetujuan
          </Button>
        ) : (
          <Button size="sm" disabled={setuju.isPending} onClick={handleSetuju}>
            {setuju.isPending && <Loader2 className="animate-spin" />}
            Setujui
          </Button>
        )}
      </div>

      {item.persetujuanBiometrik && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground">Foto Wajah Terdaftar ({item.descriptors.length})</p>
            {!kameraAktif && (
              <Button size="sm" variant="outline" onClick={() => setKameraAktif(true)}>
                <Camera className="h-4 w-4" /> Ambil Foto
              </Button>
            )}
          </div>

          {kameraAktif && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              {cameraError ? (
                <p className="text-sm text-destructive">{cameraError}</p>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="mx-auto w-full max-w-sm rounded-lg bg-black" />
              )}
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setKameraAktif(false)}>
                  Batal
                </Button>
                <Button size="sm" disabled={!ready || memproses} onClick={handleAmbilFoto}>
                  {memproses && <Loader2 className="animate-spin" />}
                  Ambil & Simpan
                </Button>
              </div>
            </div>
          )}

          {item.descriptors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada foto wajah. Ambil 3-5 foto (depan, sedikit kiri, sedikit kanan) untuk hasil terbaik.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {item.descriptors.map((d) => (
                <div key={d.id} className="relative overflow-hidden rounded-lg border border-border">
                  {d.fotoUrl ? (
                    <img src={d.fotoUrl} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-muted">
                      <Badge variant="secondary">Otomatis</Badge>
                    </div>
                  )}
                  {d.sumber === "manual" && (
                    <button
                      type="button"
                      onClick={() => handleHapusDescriptor(d.id)}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive hover:bg-background"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={tarikConfirmOpen} onOpenChange={setTarikConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tarik Persetujuan Biometrik?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua foto & data wajah guru ini akan dihapus permanen. Guru masih bisa presensi lewat PIN + selfie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleTarik}>Tarik & Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
