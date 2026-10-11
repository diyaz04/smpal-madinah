import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePwaInstall, isIOSDevice } from "@/hooks/usePwaInstall";
import { IosInstallDialog } from "./IosInstallDialog";

const DISMISS_KEY = "smpam:install-banner-dismissed";

export function InstallBanner() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const isIOS = isIOSDevice();

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage tidak tersedia — banner tetap tersembunyi untuk sesi ini saja.
    }
  }

  if (installed || dismissed || (!canInstall && !isIOS)) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-primary-soft px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <Download className="h-4 w-4 shrink-0 text-primary" />
          <span>Instal aplikasi ini di perangkat Anda untuk akses lebih cepat.</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => (isIOS ? setIosDialogOpen(true) : promptInstall())}
          >
            Instal
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={dismiss} aria-label="Tutup">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <IosInstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
    </>
  );
}
