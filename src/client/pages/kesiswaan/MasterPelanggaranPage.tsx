import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";

import type { PelanggaranKategoriItem, PelanggaranJenisItem, SanksiAmbangItem } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PelanggaranKategoriFormDialog } from "@/components/pelanggaran/PelanggaranKategoriFormDialog";
import { PelanggaranJenisFormDialog } from "@/components/pelanggaran/PelanggaranJenisFormDialog";
import { SanksiAmbangFormDialog } from "@/components/pelanggaran/SanksiAmbangFormDialog";
import { usePelanggaranKategoriQuery, useDeletePelanggaranKategori } from "@/hooks/usePelanggaranKategori";
import { usePelanggaranJenisQuery, useDeletePelanggaranJenis } from "@/hooks/usePelanggaranJenis";
import { useSanksiAmbangQuery, useDeleteSanksiAmbang } from "@/hooks/useSanksiAmbang";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";

const MODULE = "master_pelanggaran";

function KategoriTab() {
  const { can } = usePermission();
  const { data, isLoading } = usePelanggaranKategoriQuery();
  const deleteKategori = useDeletePelanggaranKategori();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PelanggaranKategoriItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<PelanggaranKategoriItem | null>(null);

  function confirmDelete() {
    if (!deleting) return;
    deleteKategori.mutate(deleting.id, {
      onSuccess: () => toast.success(`Kategori ${deleting.nama} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {can(MODULE, "tambah") && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus /> Tambah Kategori
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(data?.items ?? []).map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: k.warna }} />
                <p className="font-medium text-foreground">{k.nama}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can(MODULE, "ubah") && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(k);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil /> Ubah
                    </DropdownMenuItem>
                  )}
                  {can(MODULE, "hapus") && (
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(k)}>
                      <Trash2 /> Hapus
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <PelanggaranKategoriFormDialog open={formOpen} onOpenChange={setFormOpen} kategori={editing} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori "{deleting?.nama}" akan dihapus. Penghapusan ditolak kalau masih ada jenis pelanggaran
              di dalamnya.
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

function JenisTab() {
  const { can } = usePermission();
  const { data: kategoriData } = usePelanggaranKategoriQuery();
  const { data, isLoading } = usePelanggaranJenisQuery();
  const deleteJenis = useDeletePelanggaranJenis();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PelanggaranJenisItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<PelanggaranJenisItem | null>(null);

  const kategoriList = kategoriData?.items ?? [];

  function confirmDelete() {
    if (!deleting) return;
    deleteJenis.mutate(deleting.id, {
      onSuccess: () => toast.success(`Jenis ${deleting.nama} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {can(MODULE, "tambah") && kategoriList.length > 0 && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus /> Tambah Jenis
          </Button>
        )}
      </div>
      {kategoriList.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">Tambahkan kategori dulu sebelum menambah jenis pelanggaran.</p>
      )}
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(data?.items ?? []).map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{j.nama}</p>
                  <Badge variant="secondary">{j.poin} poin</Badge>
                  {!j.aktif && <Badge variant="outline">Nonaktif</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{j.kategoriNama}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can(MODULE, "ubah") && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(j);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil /> Ubah
                    </DropdownMenuItem>
                  )}
                  {can(MODULE, "hapus") && j.bisaDihapus && (
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(j)}>
                      <Trash2 /> Hapus
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <PelanggaranJenisFormDialog open={formOpen} onOpenChange={setFormOpen} jenis={editing} kategoriList={kategoriList} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jenis pelanggaran ini?</AlertDialogTitle>
            <AlertDialogDescription>Jenis "{deleting?.nama}" akan dihapus permanen.</AlertDialogDescription>
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

function AmbangTab() {
  const { can } = usePermission();
  const { data, isLoading } = useSanksiAmbangQuery();
  const deleteAmbang = useDeleteSanksiAmbang();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SanksiAmbangItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<SanksiAmbangItem | null>(null);

  function confirmDelete() {
    if (!deleting) return;
    deleteAmbang.mutate(deleting.id, {
      onSuccess: () => toast.success(`Ambang sanksi ${deleting.nama} dihapus.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleting(null),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {can(MODULE, "tambah") && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus /> Tambah Ambang
          </Button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(data?.items ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">≥ {a.poinMinimal} poin</Badge>
                  <p className="font-medium text-foreground">{a.nama}</p>
                </div>
                {a.deskripsi && <p className="text-sm text-muted-foreground">{a.deskripsi}</p>}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can(MODULE, "ubah") && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(a);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil /> Ubah
                    </DropdownMenuItem>
                  )}
                  {can(MODULE, "hapus") && (
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(a)}>
                      <Trash2 /> Hapus
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <SanksiAmbangFormDialog open={formOpen} onOpenChange={setFormOpen} ambang={editing} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus ambang sanksi ini?</AlertDialogTitle>
            <AlertDialogDescription>Ambang "{deleting?.nama}" akan dihapus permanen.</AlertDialogDescription>
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

export function MasterPelanggaranPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Master Pelanggaran</h1>
      </div>

      <Tabs defaultValue="kategori">
        <TabsList>
          <TabsTrigger value="kategori">Kategori</TabsTrigger>
          <TabsTrigger value="jenis">Jenis Pelanggaran</TabsTrigger>
          <TabsTrigger value="ambang">Ambang Sanksi</TabsTrigger>
        </TabsList>
        <TabsContent value="kategori">
          <KategoriTab />
        </TabsContent>
        <TabsContent value="jenis">
          <JenisTab />
        </TabsContent>
        <TabsContent value="ambang">
          <AmbangTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
