import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, School } from "lucide-react";

import { MODULES, MODULE_GROUPS_ORDER } from "@shared/modules";
import { usePermission } from "@/hooks/usePermission";
import { usePublicBranding } from "@/hooks/usePublicBranding";
import { getModuleIcon } from "@/lib/moduleIcons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, onNavigate }: SidebarProps) {
  const { hasModule } = usePermission();
  const { data: branding } = usePublicBranding();

  const groups = MODULE_GROUPS_ORDER.map((groupName) => ({
    name: groupName,
    modules: MODULES.filter(
      (m) => m.grup === groupName && m.implemented && m.path && hasModule(m.key),
    ),
  })).filter((g) => g.modules.length > 0);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className={cn("flex items-center gap-2 border-b border-border px-4 py-4", collapsed && "justify-center px-2")}>
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <School className="h-4 w-4" />
          </div>
        )}
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-foreground">
            {branding?.schoolName ?? "SMP Al-Madinah"}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {groups.map((group) => (
          <div key={group.name}>
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.name}
              </p>
            )}
            <div className="space-y-0.5">
              {group.modules.map((mod) => {
                const Icon = getModuleIcon(mod.ikon);
                return (
                  <NavLink
                    key={mod.key}
                    to={mod.path!}
                    end={mod.path === "/"}
                    onClick={onNavigate}
                    title={collapsed ? mod.nama : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-primary-soft text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{mod.nama}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-border p-2 md:block">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-muted-foreground"
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
