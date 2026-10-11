import { useEffect } from "react";

import { useSession } from "./useSession";
import { usePublicBranding } from "./usePublicBranding";
import { applyTheme } from "@/lib/theme";

/**
 * Satu sumber kebenaran penerapan warna tema: dipanggil sekali di root App.
 * Saat login: warna user (kalau sudah pilih) atau default sekolah dari /auth/me.
 * Saat belum login (halaman Login): default sekolah dari /public/branding.
 * index.html sudah menerapkan warna cache localStorage lebih dulu supaya
 * tidak ada kedip; efek ini menyempurnakan (foreground/soft) & menyinkronkan.
 */
export function useApplyTheme() {
  const { data: session } = useSession();
  const { data: branding } = usePublicBranding();

  const color = session
    ? (session.user.primaryColor ?? session.defaultPrimaryColor)
    : branding?.defaultPrimaryColor;

  useEffect(() => {
    if (color) applyTheme(color);
  }, [color]);
}
