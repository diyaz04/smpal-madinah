import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus, ShieldCheck, Copy, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { RoleFormDialog } from "@/components/roles/RoleFormDialog";
import { DuplicateRoleDialog } from "@/components/roles/DuplicateRoleDialog";
import { useRolesQuery } from "@/hooks/useRoles";
import { useDeleteRole } from "@/hooks/useRoleMutations";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { RoleListItem } from "@shared/types";

export function RolesPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const { data, isLoading } = useRolesQuery();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleListItem | undefined>(undefined);
  const [duplicatingRole, setDuplicatingRole] = useState<RoleListItem | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleListItem | null>(null);

  const deleteRole = useDeleteRole();

  function openCreate() {
    setEditingRole(undefined);
    setFormOpen(true);
  }
  function openEdit(role: RoleListItem) {
    setEditingRole(role);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingRole) return;
    deleteRole.mutate(deletingRole.id, {
      onSuccess: () => toast.success(`Role ${deletingRole.name} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus role."),
      onSettled: () => setDeletingRole(null),
    });
  }

  const columns: DataTableColumn<RoleListItem>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{r.name}</p>
          {r.isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      ),
    },
    {
      key: "description",
      header: "Deskripsi",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.description}</span>,
    },
    {
      key: "userCount",
      header: "Jumlah User",
      cell: (r) => <Badge variant="secondary">{r.userCount}</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/pengaturan/fitur/${r.id}`)}>
              <ShieldCheck /> Atur Hak Akses
            </DropdownMenuItem>
            {can("manajemen_fitur", "ubah") && !r.isLocked && (
              <DropdownMenuItem onClick={() => openEdit(r)}>
                <Pencil /> Ubah
              </DropdownMenuItem>
            )}
            {can("manajemen_fitur", "tambah") && (
              <DropdownMenuItem onClick={() => setDuplicatingRole(r)}>
                <Copy /> Duplikat
              </DropdownMenuItem>
            )}
            {can("manajemen_fitur", "hapus") && !r.isLocked && (
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingRole(r)}>
                <Trash2 /> Hapus
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
        <h1 className="text-xl font-semibold text-foreground">Manajemen Fitur</h1>
        {can("manajemen_fitur", "tambah") && (
          <Button onClick={openCreate}>
            <Plus /> Buat Role
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.roles ?? []}
        isLoading={isLoading}
        getRowId={(r) => r.id}
        page={1}
        hasNext={false}
        onPageChange={() => {}}
        onRowClick={(r) => navigate(`/pengaturan/fitur/${r.id}`)}
        emptyState={{
          icon: <ShieldCheck className="h-5 w-5" />,
          title: "Belum ada role",
        }}
      />

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editingRole} />
      <DuplicateRoleDialog
        open={!!duplicatingRole}
        onOpenChange={(o) => !o && setDuplicatingRole(null)}
        role={duplicatingRole}
      />

      <AlertDialog open={!!deletingRole} onOpenChange={(o) => !o && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus role ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Role "{deletingRole?.name}" akan dihapus. Kalau masih dipakai user, penghapusan akan
              ditolak sampai user-nya dipindahkan ke role lain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
