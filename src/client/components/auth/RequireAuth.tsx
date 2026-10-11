import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useSession } from "@/hooks/useSession";

export function RequireAuth() {
  const { data, isLoading, isError } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (data.user.mustChangePassword && location.pathname !== "/ganti-password-wajib") {
    return <Navigate to="/ganti-password-wajib" replace />;
  }
  if (!data.user.mustChangePassword && location.pathname === "/ganti-password-wajib") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
