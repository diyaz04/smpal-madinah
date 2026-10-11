/// <reference types="vite-plugin-pwa/react" />
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Service worker baru tidak pernah auto-reload diam-diam (bisa menghapus
 * isian form yang belum disimpan) — selalu tampilkan toast dan tunggu user
 * klik "Muat Ulang".
 */
export function UpdateToast() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Cek pembaruan secara berkala saat tab aktif (tidak polling saat hidden).
      if (!registration) return;
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") registration.update();
      }, 60 * 60 * 1000);
      window.addEventListener("beforeunload", () => clearInterval(interval));
    },
  });

  useEffect(() => {
    if (needRefresh[0]) {
      toast("Versi baru tersedia", {
        id: "sw-update",
        duration: Infinity,
        action: (
          <Button
            size="sm"
            onClick={() => {
              toast.dismiss("sw-update");
              updateServiceWorker(true);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
          </Button>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh[0]]);

  return null;
}
