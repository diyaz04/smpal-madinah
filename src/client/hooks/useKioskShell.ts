import { useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 60_000;

/** Tukar <link rel="manifest"> ke manifest kiosk selama halaman /kiosk aktif. */
export function useKioskManifest() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const original = link?.getAttribute("href") ?? null;
    if (link) link.setAttribute("href", "/kiosk-manifest.webmanifest");
    return () => {
      if (link && original) link.setAttribute("href", original);
    };
  }, []);
}

/** Minta Wake Lock (layar tidak mati) — dipanggil dari gesture pengguna (klik). */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        sentinelRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Wake Lock tidak tersedia/ditolak — bukan fatal, kiosk tetap jalan.
    }
  }

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && sentinelRef.current?.released !== false) {
        void requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinelRef.current?.release().catch(() => {});
    };
  }, []);

  return { requestWakeLock };
}

/** Kembali ke callback (biasanya "ke layar utama") setelah tidak ada sentuhan 60 detik. */
export function useIdleTimeout(onIdle: () => void, active: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, IDLE_TIMEOUT_MS);
    }

    reset();
    const events = ["pointerdown", "touchstart", "keydown"] as const;
    for (const ev of events) window.addEventListener(ev, reset);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const ev of events) window.removeEventListener(ev, reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Ditolak/tidak didukung — bukan fatal.
    }
  }

  return { isFullscreen, enterFullscreen };
}
