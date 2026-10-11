import { Navigate, Outlet } from "react-router-dom";

import { usePermission } from "@/hooks/usePermission";
import type { PermissionAction } from "@shared/constants";

interface RequirePermissionProps {
  module: string;
  action: PermissionAction;
}

export function RequirePermission({ module, action }: RequirePermissionProps) {
  const { can } = usePermission();

  if (!can(module, action)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
