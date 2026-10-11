import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, GraduationCap, Trash2, Upload, Download, Users2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SiswaFormDialog } from "@/components/siswa/SiswaFormDialog";
import { ImportSiswaDialog } from "@/components/siswa/ImportSiswaDialog";
import { BulkPindahRombelDialog } from "@/components/siswa/BulkPindahRombelDialog";
import { BulkUbahStatusDialog } from "@/components/siswa/BulkUbahStatusDialog";
import { useSiswaQuery, useDeleteSiswa, useExportSiswa } from "@/hooks/useSiswa";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { SiswaListItem } from "@shared/types";
import { JENIS_KELAMIN_LABELS, SISWA_STATUS_LABELS } from "@shared/constants";

export function SiswaListPage() {
  const { can } = usePermission();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pindahOpen, setPindahOpen] = useState(false);
  const [ubahStatusOpen, setUbahStatusOpen] = useState(false);
  const [deleting, setDeleting] = useState<SiswaListItem | null>(null);

  const { data, isLoading } = useSiswaQuery({
    page,
    search,
    status: statusFilter === "all" ? null : (statusFilter as never),
    rombelId: null,
  });
  const deleteSiswa = useDeleteSiswa();
  const exportSiswa = useExportSiswa();

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteSiswa.mutate(deleting.id, {
      onSuccess: () => toast.success(`${deleting.namaLengkap} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  function handleExport() {
    exportSiswa.mutate(undefined, {
      onSuccess: async ({ items }) => {
        const XLSX = await import("xlsx");
        const rows = items.map((s) => ({
          NIS: s.nis,
          NISN: s.nisn,
          "Nama Lengkap": s.namaLengkap,
          "Nama Panggilan": s.namaPanggilan ?? "",
          "Jenis Kelamin": s.jenisKelamin,
          "Tempat Lahir": s.tempatLahir ?? "",
          "Tanggal Lahir": s.tanggalLahir ?? "",
          Agama: s.agama ?? "",
          Alamat: s.alamat ?? "",
          "Nama Ayah": s.namaAyah ?? "",
          "Nama Ibu": s.namaIbu ?? "",
          "Nama Wali": s.namaWali ?? "",
          "No HP Orang Tua": s.noHpOrtu ?? "",
          "Pekerjaan Orang Tua": s.pekerjaanOrtu ?? "",
          Rombel: s.rombel ? `${s.rombel.tingkat} ${s.rombel.nama}` : "",
          Status: SISWA_STATUS_LABELS[s.status],
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Siswa");
        XLSX.writeFile(wb, `data-siswa-${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      onError: () => toast.error("Gagal mengekspor data siswa."),
    });
  }

  const columns: DataTableColumn<SiswaListItem>[] = [
    {
      key: "select",
      header: "",
      className: "w-10",
      cell: (s) => (
        <Checkbox
          checked={selectedIds.has(s.id)}
          onCheckedChange={(checked) => toggleSelect(s.id, checked === true)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "namaLengkap",
      header: "Nama",
      cell: (s) => (
        <div>
          <p className="font-medium text-foreground">{s.namaLengkap}</p>
          <p className="text-xs text-muted-foreground">
            {s.nis} / {s.nisn}
          </p>
        </div>
      ),
    },
    { key: "jenisKelamin", header: "L/P", cell: (s) => JENIS_KELAMIN_LABELS[s.jenisKelamin] },
    {
      key: "rombel",
      header: "Rombel",
      cell: (s) =>
        s.rombel ? (
          <Badge variant="outline">
            {s.rombel.tingkat} {s.rombel.nama}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Belum ditempatkan</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => (
        <Badge variant={s.status === "AKTIF" ? "default" : "secondary"}>
          {SISWA_STATUS_LABELS[s.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {can("data_siswa", "hapus") && (
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(s)}>
                <Trash2 /> Hapus
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const selectedArray = [...selectedIds];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Daftar Siswa</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exportSiswa.isPending}>
            <Download /> Ekspor
          </Button>
          {can("data_siswa", "tambah") && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload /> Impor
            </Button>
          )}
          {can("data_siswa", "tambah") && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Tambah Siswa
            </Button>
          )}
        </div>
      </div>

      {selectedArray.length > 0 && can("data_siswa", "ubah") && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <Users2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{selectedArray.length} siswa dipilih</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPindahOpen(true)}>
              Pindah Rombel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUbahStatusOpen(true)}>
              Ubah Status
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Batal Pilih
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        getRowId={(s) => s.id}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari nama, NIS, atau NISN..."
        page={data?.page ?? page}
        hasNext={data?.hasNext ?? false}
        onPageChange={setPage}
        onRowClick={(s) => navigate(`/data-master/siswa/${s.id}`)}
        emptyState={{
          icon: <GraduationCap className="h-5 w-5" />,
          title: "Belum ada data siswa",
          description: "Tambahkan siswa pertama atau impor dari Excel.",
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
              {Object.entries(SISWA_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <SiswaFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ImportSiswaDialog open={importOpen} onOpenChange={setImportOpen} />
      <BulkPindahRombelDialog
        open={pindahOpen}
        onOpenChange={setPindahOpen}
        siswaIds={selectedArray}
        onDone={() => setSelectedIds(new Set())}
      />
      <BulkUbahStatusDialog
        open={ubahStatusOpen}
        onOpenChange={setUbahStatusOpen}
        siswaIds={selectedArray}
        onDone={() => setSelectedIds(new Set())}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.namaLengkap} akan dihapus beserta seluruh riwayat kelasnya.
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
