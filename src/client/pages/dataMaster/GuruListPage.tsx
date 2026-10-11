import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MoreHorizontal,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Upload,
  Download,
  Users,
} from "lucide-react";
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
import { GuruFormDialog } from "@/components/guru/GuruFormDialog";
import { BuatAkunGuruDialog } from "@/components/guru/BuatAkunGuruDialog";
import { ImportGuruDialog } from "@/components/guru/ImportGuruDialog";
import { TempPasswordDialog } from "@/components/users/TempPasswordDialog";
import { useGuruQuery, useDeleteGuru, useSetGuruActive, useGuruDetail, useExportGuru } from "@/hooks/useGuru";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { GuruListItem } from "@shared/types";
import { JENIS_KELAMIN_LABELS } from "@shared/constants";

type ConfirmAction = { type: "delete" | "deactivate"; guru: GuruListItem } | null;

export function GuruListPage() {
  const { can } = usePermission();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [buatAkunGuruId, setBuatAkunGuruId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null);

  const { data, isLoading } = useGuruQuery({
    page,
    search,
    status: statusFilter === "all" ? null : (statusFilter as "active" | "inactive"),
  });
  const { data: buatAkunGuruData } = useGuruDetail(buatAkunGuruId);
  const deleteGuru = useDeleteGuru();
  const setActive = useSetGuruActive();
  const exportGuru = useExportGuru();

  function confirmDelete() {
    if (!confirmAction || confirmAction.type !== "delete") return;
    deleteGuru.mutate(confirmAction.guru.id, {
      onSuccess: () => toast.success(`${confirmAction.guru.namaLengkap} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setConfirmAction(null),
    });
  }

  function confirmDeactivate() {
    if (!confirmAction || confirmAction.type !== "deactivate") return;
    setActive.mutate(
      { id: confirmAction.guru.id, isActive: false },
      {
        onSuccess: () => toast.success(`${confirmAction.guru.namaLengkap} dinonaktifkan.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menonaktifkan."),
        onSettled: () => setConfirmAction(null),
      },
    );
  }

  function handleReactivate(g: GuruListItem) {
    setActive.mutate(
      { id: g.id, isActive: true },
      {
        onSuccess: () => toast.success(`${g.namaLengkap} diaktifkan kembali.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengaktifkan."),
      },
    );
  }

  function handleExport() {
    exportGuru.mutate(undefined, {
      onSuccess: async ({ items }) => {
        const XLSX = await import("xlsx");
        const rows = items.map((g) => ({
          NIP: g.nip ?? "",
          NUPTK: g.nuptk ?? "",
          "Nama Lengkap": g.namaLengkap,
          "Nama Tanpa Gelar": g.namaTanpaGelar,
          "Jenis Kelamin": g.jenisKelamin,
          "Tempat Lahir": g.tempatLahir ?? "",
          "Tanggal Lahir": g.tanggalLahir,
          "No HP": g.noHp ?? "",
          Email: g.email ?? "",
          Alamat: g.alamat ?? "",
          "Status Kepegawaian": g.statusKepegawaian,
          "Tanggal Mulai Tugas": g.tanggalMulaiTugas ?? "",
          Status: g.isActive ? "Aktif" : "Nonaktif",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Guru");
        XLSX.writeFile(wb, `data-guru-${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      onError: () => toast.error("Gagal mengekspor data guru."),
    });
  }

  const columns: DataTableColumn<GuruListItem>[] = [
    {
      key: "namaLengkap",
      header: "Nama",
      cell: (g) => (
        <div>
          <p className="font-medium text-foreground">{g.namaLengkap}</p>
          <p className="text-xs text-muted-foreground">{g.nip ?? "NIP belum diisi"}</p>
        </div>
      ),
    },
    {
      key: "jenisKelamin",
      header: "L/P",
      cell: (g) => JENIS_KELAMIN_LABELS[g.jenisKelamin],
    },
    {
      key: "statusKepegawaian",
      header: "Status Kepegawaian",
      cell: (g) => <Badge variant="outline">{g.statusKepegawaian}</Badge>,
    },
    {
      key: "punyaAkun",
      header: "Akun",
      cell: (g) =>
        g.punyaAkun ? <Badge>Punya Akun</Badge> : <Badge variant="secondary">Belum Punya Akun</Badge>,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (g) => (g.isActive ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (g) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {can("data_guru", "ubah") && !g.punyaAkun && (
              <DropdownMenuItem onClick={() => setBuatAkunGuruId(g.id)}>
                <KeyRound /> Buat Akun Login
              </DropdownMenuItem>
            )}
            {can("data_guru", "ubah") && g.isActive && (
              <DropdownMenuItem onClick={() => setConfirmAction({ type: "deactivate", guru: g })}>
                <Ban /> Nonaktifkan
              </DropdownMenuItem>
            )}
            {can("data_guru", "ubah") && !g.isActive && (
              <DropdownMenuItem onClick={() => handleReactivate(g)}>
                <CheckCircle2 /> Aktifkan
              </DropdownMenuItem>
            )}
            {can("data_guru", "hapus") && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmAction({ type: "delete", guru: g })}
              >
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
        <h1 className="text-xl font-semibold text-foreground">Daftar Guru</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exportGuru.isPending}>
            <Download /> Ekspor
          </Button>
          {can("data_guru", "tambah") && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload /> Impor
            </Button>
          )}
          {can("data_guru", "tambah") && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Tambah Guru
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        getRowId={(g) => g.id}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari nama atau NIP..."
        page={data?.page ?? page}
        hasNext={data?.hasNext ?? false}
        onPageChange={setPage}
        onRowClick={(g) => navigate(`/data-master/guru/${g.id}`)}
        emptyState={{
          icon: <Users className="h-5 w-5" />,
          title: "Belum ada data guru",
          description: "Tambahkan guru pertama atau impor dari Excel.",
        }}
        toolbarExtra={
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
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <GuruFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ImportGuruDialog open={importOpen} onOpenChange={setImportOpen} />
      <BuatAkunGuruDialog
        open={!!buatAkunGuruId}
        onOpenChange={(o) => !o && setBuatAkunGuruId(null)}
        guru={buatAkunGuruData?.item ?? null}
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

      <AlertDialog open={confirmAction?.type === "delete"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus guru ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.guru.namaLengkap} akan dihapus. Penghapusan ditolak kalau guru ini masih
              menjadi wali kelas, punya tugas mengajar, atau punya akun login aktif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmAction?.type === "deactivate"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan guru ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.guru.namaLengkap} akan ditandai nonaktif. Kalau punya akun login, akunnya
              ikut dinonaktifkan dan sesi aktifnya dicabut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
