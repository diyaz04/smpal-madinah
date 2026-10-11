import { useMemo } from "react";

import { useSession } from "./useSession";
import type { PermissionAction } from "@shared/constants";

export interface PermissionApi {
  can: (moduleKey: string, action: PermissionAction) => boolean;
  scope: (moduleKey: string, action: PermissionAction) => "semua" | "milik_sendiri" | null;
  hasModule: (moduleKey: string) => boolean;
}

/**
 * Sumber kebenaran izin di frontend — dipakai untuk menyembunyikan menu,
 * tombol, dan halaman. Backend (requirePermission middleware) tetap jadi
 * penegak izin yang sesungguhnya; hook ini murni untuk UX.
 */
export function usePermission(): PermissionApi {
  const { data } = useSession();
  const grants = data?.permissions.grants ?? {};

  return useMemo<PermissionApi>(
    () => ({
      can: (moduleKey, action) => Boolean(grants[moduleKey]?.[action]),
      scope: (moduleKey, action) => grants[moduleKey]?.[action] ?? null,
      hasModule: (moduleKey) => Object.keys(grants[moduleKey] ?? {}).length > 0,
    }),
    [grants],
  );
}
