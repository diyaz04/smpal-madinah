import { useEffect, useState } from "react";
import { ScanFace, BookUser, Maximize } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useKioskKonteks } from "@/hooks/useKiosk";
import { useFullscreen, useWakeLock } from "@/hooks/useKioskShell";

interface KioskHomeProps {
  onPilihPresensi: () => void;
  onPilihTamu: () => void;
}

function useTickingClock(serverJam: string | undefined) {
  const [display, setDisplay] = useState(serverJam ?? "--:--");

  useEffect(() => {
    if (!serverJam) return;
    const [h, m] = serverJam.split(":").map(Number);
    let totalMinutes = (h ?? 0) * 60 + (m ?? 0);
    let seconds = 0;
    setDisplay(serverJam);

    const interval = setInterval(() => {
      seconds += 1;
      if (seconds >= 60) {
        seconds = 0;
        totalMinutes += 1;
      }
      const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
      const mm = String(totalMinutes % 60).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      setDisplay(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [serverJam]);

  return display;
}

export function KioskHome({ onPilihPresensi, onPilihTamu }: KioskHomeProps) {
  const { data } = useKioskKonteks(true);
  const konteks = data?.item;
  const jam = useTickingClock(konteks?.jam);
  const { isFullscreen, enterFullscreen } = useFullscreen();
  const { requestWakeLock } = useWakeLock();

  async function handleMasukModeKiosk() {
    await enterFullscreen();
    await requestWakeLock();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-muted p-8 text-center">
      {!isFullscreen && (
        <Button variant="outline" size="sm" className="absolute right-4 top-4" onClick={handleMasukModeKiosk}>
          <Maximize className="h-4 w-4" /> Mode Kiosk
        </Button>
      )}

      <div>
        {konteks?.logoUrl && <img src={konteks.logoUrl} alt="" className="mx-auto mb-3 h-16 w-16 object-contain" />}
        <h1 className="text-2xl font-semibold text-foreground">{konteks?.namaSekolah ?? "SMP Al-Madinah"}</h1>
      </div>

      <div>
        <p className="font-mono text-7xl font-bold tabular-nums text-foreground">{jam}</p>
        <p className="mt-2 text-xl text-muted-foreground">{konteks?.tanggal}</p>
      </div>

      {konteks && konteks.guruPiketHariIni.length > 0 && (
        <p className="text-lg text-muted-foreground">Guru Piket Hari Ini: {konteks.guruPiketHariIni.join(", ")}</p>
      )}

      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPilihPresensi}
          className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-10 shadow-sm transition hover:bg-accent"
        >
          <ScanFace className="h-20 w-20 text-primary" />
          <span className="text-2xl font-semibold text-foreground">Presensi Guru</span>
        </button>
        <button
          type="button"
          onClick={onPilihTamu}
          className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-10 shadow-sm transition hover:bg-accent"
        >
          <BookUser className="h-20 w-20 text-primary" />
          <span className="text-2xl font-semibold text-foreground">Buku Tamu</span>
        </button>
      </div>
    </div>
  );
}
