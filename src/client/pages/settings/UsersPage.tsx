import { useState } from "react";
import { MoreHorizontal, Plus, Users as UsersIcon, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { TempPasswordDialog } from "@/components/users/TempPasswordDialog";
import { useUsersQuery, useAvailableRoles, useUserDetail } from "@/hooks/useUsers";
import {
  useDeactivateUser,
  useReactivateUser,
  useResetUserPassword,
} from "@/hooks/useUserMutations";
import { usePermission } from "@/hooks/usePermission";
import { formatDateTimeIndonesian } from "@/lib/dateFormat";
import { ApiError } from "@/lib/api";
import type { UserListItem } from "@shared/types";
import type { UserStatus } from "@shared/constants";

type ConfirmAction = { type: "deactivate" | "reset-password"; user: UserListItem } | null;

export function UsersPage() {
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(
    null,
  );

  const { data: rolesData } = useAvailableRoles();
  const { data: editingUser } = useUserDetail(editingUserId);
  const { data, isLoading } = useUsersQuery({
    page,
    search,
    roleId: roleFilter === "all" ? null : roleFilter,
    status: statusFilter === "all" ? null : (statusFilter as UserStatus),
  });

  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const resetPasswordMutation = useResetUserPassword();

  function openCreate() {
    setEditingUserId(null);
    setFormOpen(true);
  }
  function openEdit(user: UserListItem) {
    setEditingUserId(user.id);
    setFormOpen(true);
  }

  function handleReactivate(user: UserListItem) {
    reactivateMutation.mutate(user.id, {
      onSuccess: () => toast.success(`${user.fullName} diaktifkan kembali.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengaktifkan."),
    });
  }

  function confirmDeactivate() {
    if (!confirmAction || confirmAction.type !== "deactivate") return;
    deactivateMutation.mutate(confirmAction.user.id, {
      onSuccess: () => toast.success(`${confirmAction.user.fullName} dinonaktifkan.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menonaktifkan."),
      onSettled: () => setConfirmAction(null),
    });
  }

  function confirmResetPassword() {
    if (!confirmAction || confirmAction.type !== "reset-password") return;
    const user = confirmAction.user;
    resetPasswordMutation.mutate(user.id, {
      onSuccess: ({ tempPassword: pw }) => setTempPassword({ username: user.username, password: pw }),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mereset password."),
      onSettled: () => setConfirmAction(null),
    });
  }

  const columns: DataTableColumn<UserListItem>[] = [
    {
      key: "fullName",
      header: "Nama",
      cell: (u) => (
        <div>
          <p className="font-medium text-foreground">{u.fullName}</p>
          <p className="text-xs text-muted-foreground">{u.username}</p>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Role",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r.id} variant="secondary">
              {r.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge variant={u.status === "ACTIVE" ? "default" : "outline"}>
          {u.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Login Terakhir",
      cell: (u) => (
        <span className="text-sm text-muted-foreground">
          {u.lastLoginAt ? formatDateTimeIndonesian(u.lastLoginAt) : "Belum pernah"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {can("manajemen_pengguna", "ubah") && (
              <DropdownMenuItem onClick={() => openEdit(u)}>Ubah</DropdownMenuItem>
            )}
            {can("manajemen_pengguna", "ubah") && (
              <DropdownMenuItem
                onClick={() => setConfirmAction({ type: "reset-password", user: u })}
              >
                <KeyRound /> Reset Password
              </DropdownMenuItem>
            )}
            {can("manajemen_pengguna", "hapus") && u.status === "ACTIVE" && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmAction({ type: "deactivate", user: u })}
              >
                <Ban /> Nonaktifkan
              </DropdownMenuItem>
            )}
            {can("manajemen_pengguna", "ubah") && u.status === "INACTIVE" && (
              <DropdownMenuItem onClick={() => handleReactivate(u)}>
                <CheckCircle2 /> Aktifkan
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Manajemen Pengguna</h1>
        {can("manajemen_pengguna", "tambah") && (
          <Button onClick={openCreate}>
            <Plus /> Tambah Pengguna
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        getRowId={(u) => u.id}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari nama atau username..."
        page={data?.page ?? page}
        hasNext={data?.hasNext ?? false}
        onPageChange={setPage}
        onRowClick={can("manajemen_pengguna", "ubah") ? openEdit : undefined}
        emptyState={{
          icon: <UsersIcon className="h-5 w-5" />,
          title: "Belum ada pengguna",
          description: "Tambahkan pengguna pertama untuk mulai mengelola akses.",
        }}
        toolbarExtra={
          <>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Semua role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua role</SelectItem>
                {(rolesData?.roles ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser?.user}
        onCreated={(username, password) => setTempPassword({ username, password })}
      />

      {tempPassword && (
        <TempPasswordDialog
          open={!!tempPassword}
          onOpenChange={(open) => !open && setTempPassword(null)}
          username={tempPassword.username}
          password={tempPassword.password}
        />
      )}

      <AlertDialog open={confirmAction?.type === "deactivate"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.user.fullName} tidak akan bisa login lagi dan sesi aktifnya akan
              langsung dicabut. Anda bisa mengaktifkannya kembali kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmAction?.type === "reset-password"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Password baru akan dibuat otomatis dan {confirmAction?.user.fullName} wajib
              menggantinya saat login berikutnya. Sesi aktifnya akan dicabut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetPassword}>Reset Password</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
