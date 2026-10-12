import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { JENIS_KELAMIN_LABELS, SISWA_STATUS_LABELS } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { SiswaFormDialog } from "@/components/siswa/SiswaFormDialog";
import { useSiswaDetail, useDeleteSiswa } from "@/hooks/useSiswa";
import { useRekapSiswaDetail } from "@/hooks/useRekapAbsensi";
import { usePelanggaranList, useRekapPoinSatuSiswa } from "@/hooks/usePelanggaran";
import { useSanksiAktifQuery } from "@/hooks/useTindakLanjut";
import { usePrestasiList } from "@/hooks/usePrestasi";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import {
  ABSENSI_HARIAN_STATUS_LABELS,
  PELANGGARAN_STATUS_LABELS,
  SANKSI_SISWA_STATUS_LABELS,
  PRESTASI_BIDANG_LABELS,
  PRESTASI_TINGKAT_LABELS,
} from "@shared/constants";

export function SiswaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const { data, isLoading } = useSiswaDetail(id ?? null);
  const siswa = data?.item;
  const canLihatKehadiran = can("absensi_siswa", "lihat");
  const { data: kehadiranData, isLoading: kehadiranLoading } = useRekapSiswaDetail(canLihatKehadiran ? (id ?? null) : null);

  const canLihatPelanggaran = can("pelanggaran", "lihat");
  const { data: rekapPoinData } = useRekapPoinSatuSiswa(canLihatPelanggaran ? (id ?? null) : null);
  const { data: pelanggaranData, isLoading: pelanggaranLoading } = usePelanggaranList(
    null,
    { siswaId: id },
    canLihatPelanggaran && !!id,
  );
  const { data: sanksiData } = useSanksiAktifQuery({ siswaId: id }, canLihatPelanggaran && !!id);

  const canLihatPrestasi = can("prestasi", "lihat");
  const { data: prestasiData, isLoading: prestasiLoading } = usePrestasiList(
    null,
    { siswaId: id },
    canLihatPrestasi && !!id,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteSiswa = useDeleteSiswa();

  if (isLoading || !siswa) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function handleDelete() {
    deleteSiswa.mutate(siswa!.id, {
      onSuccess: () => {
        toast.success(`${siswa!.namaLengkap} dihapus.`);
        navigate("/data-master/siswa");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menghapus."),
      onSettled: () => setDeleteOpen(false),
    });
  }

  return (
    <div className="space-y-4">
      <Link
        to="/data-master/siswa"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Siswa
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{siswa.namaLengkap}</h1>
          <p className="text-sm text-muted-foreground">
            {siswa.nis} / {siswa.nisn}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={siswa.status === "AKTIF" ? "default" : "secondary"}>
              {SISWA_STATUS_LABELS[siswa.status]}
            </Badge>
            {siswa.rombel ? (
              <Badge variant="outline">
                {siswa.rombel.tingkat} {siswa.rombel.nama}
                {siswa.nomorAbsen ? ` — No. ${siswa.nomorAbsen}` : ""}
              </Badge>
            ) : (
              <Badge variant="outline">Belum ditempatkan</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("data_siswa", "ubah") && (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil /> Ubah
            </Button>
          )}
          {can("data_siswa", "hapus") && (
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Hapus
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Kelas</TabsTrigger>
          <TabsTrigger value="kehadiran">Kehadiran</TabsTrigger>
          <TabsTrigger value="pelanggaran">Poin Pelanggaran</TabsTrigger>
          <TabsTrigger value="prestasi">Prestasi</TabsTrigger>
          <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="rounded-xl border border-border bg-card p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Nama Panggilan</dt>
              <dd className="text-foreground">{siswa.namaPanggilan ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Jenis Kelamin</dt>
              <dd className="text-foreground">{JENIS_KELAMIN_LABELS[siswa.jenisKelamin]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tempat, Tanggal Lahir</dt>
              <dd className="text-foreground">
                {siswa.tempatLahir ?? "—"}, {siswa.tanggalLahir ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Agama</dt>
              <dd className="text-foreground">{siswa.agama ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Alamat</dt>
              <dd className="text-foreground">{siswa.alamat ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nama Ayah</dt>
              <dd className="text-foreground">{siswa.namaAyah ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nama Ibu</dt>
              <dd className="text-foreground">{siswa.namaIbu ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nama Wali</dt>
              <dd className="text-foreground">{siswa.namaWali ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">No. HP Orang Tua</dt>
              <dd className="text-foreground">{siswa.noHpOrtu ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pekerjaan Orang Tua</dt>
              <dd className="text-foreground">{siswa.pekerjaanOrtu ?? "—"}</dd>
            </div>
            {siswa.statusKeterangan && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Keterangan Status</dt>
                <dd className="text-foreground">{siswa.statusKeterangan}</dd>
              </div>
            )}
          </dl>
        </TabsContent>

        <TabsContent value="riwayat" className="rounded-xl border border-border bg-card p-5">
          {siswa.riwayatKelas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat penempatan kelas.</p>
          ) : (
            <ul className="space-y-2">
              {siswa.riwayatKelas.map((r, i) => (
                <li
                  key={`${r.periodId}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{r.periodLabel}</span>
                  <Badge variant="outline">
                    {r.rombelNama}
                    {r.nomorAbsen ? ` — No. ${r.nomorAbsen}` : ""}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="kehadiran" className="rounded-xl border border-border bg-card p-5">
          {!canLihatKehadiran ? (
            <p className="text-sm text-muted-foreground">Anda tidak punya akses melihat data kehadiran.</p>
          ) : kehadiranLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : kehadiranData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">{kehadiranData.item.totalS}</p>
                  <p className="text-xs text-muted-foreground">Sakit</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{kehadiranData.item.totalI}</p>
                  <p className="text-xs text-muted-foreground">Izin</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{kehadiranData.item.totalA}</p>
                  <p className="text-xs text-muted-foreground">Alpa</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{kehadiranData.item.persenHadir}%</p>
                  <p className="text-xs text-muted-foreground">Hadir</p>
                </div>
              </div>
              {kehadiranData.item.riwayat.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada catatan ketidakhadiran pada periode aktif.</p>
              ) : (
                <ul className="space-y-1.5">
                  {kehadiranData.item.riwayat.map((r, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{r.tanggal}</span>
                      <Badge variant="outline">{ABSENSI_HARIAN_STATUS_LABELS[r.status as "S" | "I" | "A"]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="pelanggaran" className="rounded-xl border border-border bg-card p-5">
          {!canLihatPelanggaran ? (
            <p className="text-sm text-muted-foreground">Anda tidak punya akses melihat data pelanggaran.</p>
          ) : pelanggaranLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">{rekapPoinData?.item.totalPoin ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Poin Tahun Ini</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{rekapPoinData?.item.jumlahPelanggaran ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Jumlah Pelanggaran</p>
                </div>
              </div>

              {(sanksiData?.items.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sanksi & Tindak Lanjut</p>
                  <ul className="space-y-1.5">
                    {sanksiData!.items.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span>
                          {s.ambangNama} (≥ {s.poinMinimal} poin)
                        </span>
                        <Badge variant={s.status === "selesai" ? "secondary" : s.status === "dibatalkan" ? "outline" : "default"}>
                          {SANKSI_SISWA_STATUS_LABELS[s.status]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Daftar Pelanggaran</p>
                {(pelanggaranData?.items.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada catatan pelanggaran tahun ini.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {pelanggaranData!.items.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span>
                          {p.tanggal} — {p.jenisNama} ({p.poin} poin)
                        </span>
                        <Badge variant={p.status === "dibatalkan" ? "outline" : "secondary"}>
                          {PELANGGARAN_STATUS_LABELS[p.status]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prestasi" className="rounded-xl border border-border bg-card p-5">
          {!canLihatPrestasi ? (
            <p className="text-sm text-muted-foreground">Anda tidak punya akses melihat data prestasi.</p>
          ) : prestasiLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (prestasiData?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada prestasi tercatat.</p>
          ) : (
            <ul className="space-y-2">
              {prestasiData!.items.map((p) => (
                <li key={p.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">
                    {p.capaian} — {p.namaKegiatan}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="secondary">{PRESTASI_BIDANG_LABELS[p.bidang]}</Badge>
                    <Badge variant="outline">{PRESTASI_TINGKAT_LABELS[p.tingkat]}</Badge>
                    <span className="text-xs text-muted-foreground">{p.tanggal}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="lainnya" className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Nilai akan tersedia di tahap berikutnya.
          </p>
        </TabsContent>
      </Tabs>

      <SiswaFormDialog open={formOpen} onOpenChange={setFormOpen} siswa={siswa} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {siswa.namaLengkap} akan dihapus beserta seluruh riwayat kelasnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
