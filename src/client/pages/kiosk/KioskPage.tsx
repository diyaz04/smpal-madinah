import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { useKioskManifest, useIdleTimeout } from "@/hooks/useKioskShell";
import { useOfflineQueueFlush } from "@/hooks/useKioskPresensi";
import { KioskPairingForm } from "./KioskPairingForm";
import { KioskHome } from "./KioskHome";
import { KioskPresensi } from "./KioskPresensi";
import { KioskTamu } from "./KioskTamu";

type KioskView = "home" | "presensi" | "tamu";

export function KioskPage() {
  useKioskManifest();
  const { data, isLoading } = useSession();
  const [view, setView] = useState<KioskView>("home");

  useIdleTimeout(() => setView("home"), view !== "home");
  useOfflineQueueFlush();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.user.accountType !== "KIOSK") {
    return <KioskPairingForm />;
  }

  if (view === "presensi") {
    return <KioskPresensi onSelesai={() => setView("home")} />;
  }
  if (view === "tamu") {
    return <KioskTamu onSelesai={() => setView("home")} />;
  }

  return <KioskHome onPilihPresensi={() => setView("presensi")} onPilihTamu={() => setView("tamu")} />;
}
