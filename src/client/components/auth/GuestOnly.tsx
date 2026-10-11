import { Navigate, Outlet } from "react-router-dom";

import { useSession } from "@/hooks/useSession";

/** Dipakai untuk /login — kalau sudah login, lempar ke Beranda. */
export function GuestOnly() {
  const { data, isLoading } = useSession();

  if (!isLoading && data) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
