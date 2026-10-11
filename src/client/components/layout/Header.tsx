import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, UserRound, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { MODULES } from "@shared/modules";
import { SEMESTER_LABELS } from "@shared/constants";
import { useSession } from "@/hooks/useSession";
import { useLogout } from "@/hooks/useAuthMutations";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallMenuItem } from "@/components/pwa/InstallMenuItem";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useSession();
  const logout = useLogout();

  const currentModule = MODULES.find((m) => m.path === location.pathname);
  const pageTitle =
    currentModule?.nama ??
    (location.pathname === "/profil-saya" ? "Profil Saya" : "SMP Al-Madinah");

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login", { replace: true }),
      onError: () => toast.error("Gagal keluar. Coba lagi."),
    });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <OfflineIndicator />
        {data?.activePeriod && (
          <span className="hidden rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary sm:inline-block">
            {data.activePeriod.yearLabel} · {SEMESTER_LABELS[data.activePeriod.semester]}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarImage src={data?.user.photoFileId ? `/api/files/${data.user.photoFileId}` : undefined} />
                <AvatarFallback className="text-xs">
                  {data ? initials(data.user.fullName) : ""}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {data?.user.fullName}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/profil-saya">
                <UserRound /> Profil Saya
              </Link>
            </DropdownMenuItem>
            <InstallMenuItem />
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
