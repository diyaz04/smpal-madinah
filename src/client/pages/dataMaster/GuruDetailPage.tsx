import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, KeyRound, Ban, CheckCircle2, Trash2, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  JENIS_KELAMIN_LABELS,
  DEFAULT_TUGAS_TAMBAHAN_OPTIONS,
} from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { GuruFormDialog } from "@/components/guru/GuruFormDialog";
import { DataWajahTab } from "@/components/guru/DataWajahTab";
import { BuatAkunGuruDialog } from "@/components/guru/BuatAkunGuruDialog";
import { TempPasswordDialog } from "@/components/users/TempPasswordDialog";
import {
  useGuruDetail,
  useDeleteGuru,
  useSetGuruActive,
  useAddGuruAlias,
  useRemoveGuruAlias,
  useAddTugasTambahan,
  useRemoveTugasTambahan,
} from "@/hooks/useGuru";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";

export function GuruDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const { data, isLoading } = useGuruDetail(id ?? null);
  const guru = data?.item;

  const [formOpen, setFormOpen] = useState(false);
  const [buatAkunOpen, setBuatAkunOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [newTugas, setNewTugas] = useState("");
  const [newTugasKeterangan, setNewTugasKeterangan] = useState("");

  const deleteGuru = useDeleteGuru();
  const setActive = useSetGuruActive();
  const addAlias = useAddGuruAlias(id ?? "");
  const removeAlias = useRemoveGuruAlias(id ?? "");
  const addTugas = useAddTugasTambahan(id ?? "");
  const removeTugas = useRemoveTugasTambahan(id ?? "");

  if (isLoading || !guru) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function handleDelete() {
    deleteGuru.mutate(guru!.id, {
      onSuccess: () => {
        toast.success(`${guru!.namaLengkap} dihapus.`);
        navigate("/data-master/guru");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleteOpen(false),
    });
  }

  function handleDeactivate() {
    setActive.mutate(
      { id: guru!.id, isActive: false },
      {
        onSuccess: () => toast.success(`${guru!.namaLengkap} dinonaktifkan.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menonaktifkan."),
        onSettled: () => setDeactivateOpen(false),
      },
    );
  }

  function handleReactivate() {
    setActive.mutate(
      { id: guru!.id, isActive: true },
      {
        onSuccess: () => toast.success(`${guru!.namaLengkap} diaktifkan kembali.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengaktifkan."),
      },
    );
  }

  function handleAddAlias() {
    if (!newAlias.trim()) return;
    addAlias.mutate(newAlias.trim(), {
      onSuccess: () => setNewAlias(""),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menambah alias."),
    });
  }

  function handleAddTugas() {
    if (!newTugas.trim()) return;
    addTugas.mutate(
      { namaTugas: newTugas.trim(), keterangan: newTugasKeterangan.trim() },
      {
        onSuccess: () => {
          setNewTugas("");
          setNewTugasKeterangan("");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menambah tugas."),
      },
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/data-master/guru"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Guru
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{guru.namaLengkap}</h1>
          <p className="text-sm text-muted-foreground">{guru.nip ?? "NIP belum diisi"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{guru.statusKepegawaian}</Badge>
            <Badge variant={guru.isActive ? "default" : "secondary"}>
              {guru.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
            {guru.punyaAkun ? (
              <Badge>Punya Akun ({guru.username})</Badge>
            ) : (
              <Badge variant="secondary">Belum Punya Akun</Badge>
            )}
            {guru.waliKelasRombel && <Badge variant="outline">Wali Kelas {guru.waliKelasRombel.nama}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("data_guru", "ubah") && (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil /> Ubah
            </Button>
          )}
          {can("data_guru", "ubah") && !guru.punyaAkun && (
            <Button variant="outline" onClick={() => setBuatAkunOpen(true)}>
              <KeyRound /> Buat Akun
            </Button>
          )}
          {can("data_guru", "ubah") && guru.isActive && (
            <Button variant="outline" onClick={() => setDeactivateOpen(true)}>
              <Ban /> Nonaktifkan
            </Button>
          )}
          {can("data_guru", "ubah") && !guru.isActive && (
            <Button variant="outline" onClick={handleReactivate}>
              <CheckCircle2 /> Aktifkan
            </Button>
          )}
          {can("data_guru", "hapus") && (
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Hapus
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="mengajar">Mengajar</TabsTrigger>
          <TabsTrigger value="alias">Alias</TabsTrigger>
          <TabsTrigger value="tugas">Tugas Tambahan</TabsTrigger>
          {can("data_guru", "ubah") && <TabsTrigger value="wajah">Data Wajah</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="rounded-xl border border-border bg-card p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">NUPTK</dt>
              <dd className="text-foreground">{guru.nuptk ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Jenis Kelamin</dt>
              <dd className="text-foreground">{JENIS_KELAMIN_LABELS[guru.jenisKelamin]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tempat, Tanggal Lahir</dt>
              <dd className="text-foreground">
                {guru.tempatLahir ?? "—"}, {guru.tanggalLahir}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">No. HP</dt>
              <dd className="text-foreground">{guru.noHp ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="text-foreground">{guru.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tanggal Mulai Tugas</dt>
              <dd className="text-foreground">{guru.tanggalMulaiTugas ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Alamat</dt>
              <dd className="text-foreground">{guru.alamat ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total JP/Minggu (jadwal aktif)</dt>
              <dd className="text-foreground">{guru.totalJpPerMinggu} JP</dd>
            </div>
          </dl>
        </TabsContent>

        <TabsContent value="mengajar" className="rounded-xl border border-border bg-card p-5">
          {guru.mengajar.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tugas mengajar di periode ini.</p>
          ) : (
            <ul className="space-y-2">
              {guru.mengajar.map((m, i) => (
                <li
                  key={`${m.rombelId}-${m.mapelId}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{m.mapelNama}</span>
                  <Badge variant="outline">{m.rombelNama}</Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="alias" className="space-y-3 rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">
            Variasi penulisan nama guru di dokumen jadwal, dipakai untuk pencocokan otomatis saat impor
            jadwal Excel.
          </p>
          {can("data_guru", "ubah") && (
            <div className="flex gap-2">
              <Input
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="Tambah alias nama..."
                onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
              />
              <Button type="button" onClick={handleAddAlias} disabled={addAlias.isPending}>
                {addAlias.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {guru.aliasNama.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada alias.</p>
            )}
            {guru.aliasNama.map((alias) => (
              <Badge key={alias} variant="secondary" className="gap-1 pr-1">
                {alias}
                {can("data_guru", "ubah") && (
                  <button
                    type="button"
                    onClick={() => removeAlias.mutate(alias)}
                    className="ml-1 rounded-full hover:bg-black/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tugas" className="space-y-3 rounded-xl border border-border bg-card p-5">
          {can("data_guru", "ubah") && (
            <div className="flex flex-wrap gap-2">
              <Select value={newTugas} onValueChange={setNewTugas}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Pilih tugas..." />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_TUGAS_TAMBAHAN_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newTugasKeterangan}
                onChange={(e) => setNewTugasKeterangan(e.target.value)}
                placeholder="Keterangan (opsional)"
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTugas} disabled={addTugas.isPending || !newTugas}>
                {addTugas.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Tambah
              </Button>
            </div>
          )}
          <div className="space-y-1.5">
            {guru.tugasTambahan.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada tugas tambahan di periode ini.</p>
            )}
            {guru.tugasTambahan.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">{t.namaTugas}</span>
                  {t.keterangan && <span className="ml-2 text-muted-foreground">{t.keterangan}</span>}
                </div>
                {can("data_guru", "ubah") && (
                  <button
                    type="button"
                    onClick={() => removeTugas.mutate(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {can("data_guru", "ubah") && id && (
          <TabsContent value="wajah" className="rounded-xl border border-border bg-card p-5">
            <DataWajahTab guruId={id} />
          </TabsContent>
        )}
      </Tabs>

      <GuruFormDialog open={formOpen} onOpenChange={setFormOpen} guru={guru} />
      <BuatAkunGuruDialog
        open={buatAkunOpen}
        onOpenChange={setBuatAkunOpen}
        guru={guru}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus guru ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {guru.namaLengkap} akan dihapus. Penghapusan ditolak kalau guru ini masih menjadi wali
              kelas, punya tugas mengajar, atau punya akun login aktif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan guru ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {guru.namaLengkap} akan ditandai nonaktif. Kalau punya akun login, akunnya ikut
              dinonaktifkan dan sesi aktifnya dicabut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
