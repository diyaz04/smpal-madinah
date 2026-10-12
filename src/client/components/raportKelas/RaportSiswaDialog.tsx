import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EKSKUL_PREDIKAT_LIST,
  EKSKUL_PREDIKAT_LABELS,
  KETERANGAN_KENAIKAN_LIST,
  KETERANGAN_KENAIKAN_LABELS,
  PRESTASI_TINGKAT_LABELS,
} from "@shared/constants";
import {
  useSaveEkskulNilai,
  useSaveKehadiranOverride,
  useSaveCatatanPendidik,
  useSaveKenaikanKelas,
} from "@/hooks/useRaportKelas";
import { usePermission } from "@/hooks/usePermission";
import { ApiError } from "@/lib/api";
import type { RaportKelasKonteks, RaportKelasSiswaRow } from "@shared/types";
import type { EkskulPredikat, KeteranganKenaikan } from "@shared/constants";

const MODULE = "raport_kelas";

interface Props {
  row: RaportKelasSiswaRow | null;
  konteks: RaportKelasKonteks;
  onOpenChange: (open: boolean) => void;
}

export function RaportSiswaDialog({ row, konteks, onOpenChange }: Props) {
  const { can } = usePermission();
  const bisaEdit = can(MODULE, "ubah") && !konteks.terkunci;

  const saveEkskul = useSaveEkskulNilai(konteks.rombelId);
  const saveKehadiran = useSaveKehadiranOverride(konteks.rombelId);
  const saveCatatan = useSaveCatatanPendidik(konteks.rombelId);
  const saveKenaikan = useSaveKenaikanKelas(konteks.rombelId);

  const [ekskulId, setEkskulId] = useState("");
  const [predikat, setPredikat] = useState<EkskulPredikat>("baik");
  const [keteranganEkskul, setKeteranganEkskul] = useState("");

  const [overrideSakit, setOverrideSakit] = useState("");
  const [overrideIzin, setOverrideIzin] = useState("");
  const [overrideAlpa, setOverrideAlpa] = useState("");
  const [alasanOverride, setAlasanOverride] = useState("");

  const [catatan, setCatatan] = useState("");
  const [templatePilihan, setTemplatePilihan] = useState("");

  const [keteranganKenaikan, setKeteranganKenaikan] = useState<KeteranganKenaikan>("naik");
  const [kenaikanKeKelas, setKenaikanKeKelas] = useState("");

  useEffect(() => {
    if (row) {
      setEkskulId("");
      setPredikat("baik");
      setKeteranganEkskul("");
      setOverrideSakit(row.overrideSakit?.toString() ?? "");
      setOverrideIzin(row.overrideIzin?.toString() ?? "");
      setOverrideAlpa(row.overrideAlpa?.toString() ?? "");
      setAlasanOverride(row.alasanOverrideKehadiran ?? "");
      setCatatan(row.catatanPendidik ?? "");
      setTemplatePilihan("");
      setKeteranganKenaikan(row.keteranganKenaikan ?? "naik");
      setKenaikanKeKelas(row.kenaikanKeKelas ?? "");
    }
  }, [row]);

  if (!row) return null;

  function handleTambahEkskul() {
    if (!ekskulId) {
      toast.error("Pilih ekskul dulu.");
      return;
    }
    saveEkskul.mutate(
      { siswaId: row!.siswaId, ekskulId, predikat, keterangan: keteranganEkskul },
      {
        onSuccess: () => {
          toast.success("Nilai ekskul tersimpan.");
          setEkskulId("");
          setKeteranganEkskul("");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  function handleSaveKehadiran() {
    saveKehadiran.mutate(
      {
        siswaId: row!.siswaId,
        overrideSakit: overrideSakit.trim() === "" ? null : Number(overrideSakit),
        overrideIzin: overrideIzin.trim() === "" ? null : Number(overrideIzin),
        overrideAlpa: overrideAlpa.trim() === "" ? null : Number(overrideAlpa),
        alasanOverrideKehadiran: alasanOverride,
      },
      {
        onSuccess: () => toast.success("Kehadiran tersimpan."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  function handlePilihTemplate(templateId: string) {
    setTemplatePilihan(templateId);
    const template = konteks.bankKalimat.find((t) => t.id === templateId);
    if (!template) return;
    const nama = row!.namaPanggilan ?? row!.namaLengkap;
    setCatatan(template.teks.replaceAll("[nama]", nama));
  }

  function handleSaveCatatan() {
    saveCatatan.mutate(
      { siswaId: row!.siswaId, catatanPendidik: catatan },
      {
        onSuccess: () => toast.success("Catatan pendidik tersimpan."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  function handleSaveKenaikan() {
    saveKenaikan.mutate(
      { siswaId: row!.siswaId, keteranganKenaikan, kenaikanKeKelas },
      {
        onSuccess: () => toast.success("Keterangan kenaikan tersimpan."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row.namaLengkap}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {konteks.terkunci && (
            <p className="rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground">
              Raport rombel ini sudah dikunci — data di bawah hanya bisa dilihat.
            </p>
          )}

          <section>
            <p className="mb-2 text-sm font-semibold text-foreground">Ekstrakurikuler</p>
            <div className="space-y-1.5">
              {row.ekskul.length === 0 && <p className="text-sm text-muted-foreground">Belum ada nilai ekskul.</p>}
              {row.ekskul.map((e) => (
                <div key={e.ekskulId} className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-sm">
                  <span>{e.ekskulNama}</span>
                  <Badge variant="secondary">{e.predikat ? EKSKUL_PREDIKAT_LABELS[e.predikat] : "-"}</Badge>
                </div>
              ))}
            </div>
            {bisaEdit && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select value={ekskulId} onValueChange={setEkskulId}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Ekskul" />
                  </SelectTrigger>
                  <SelectContent>
                    {konteks.ekskulAktif.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={predikat} onValueChange={(v) => setPredikat(v as EkskulPredikat)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EKSKUL_PREDIKAT_LIST.map((p) => (
                      <SelectItem key={p} value={p}>
                        {EKSKUL_PREDIKAT_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={keteranganEkskul}
                  onChange={(e) => setKeteranganEkskul(e.target.value)}
                  placeholder="Keterangan (opsional)"
                  className="w-40"
                />
                <Button size="sm" onClick={handleTambahEkskul} disabled={saveEkskul.isPending}>
                  Simpan
                </Button>
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-foreground">Prestasi</p>
            {row.prestasiRaport.length === 0 && !row.peringkat && <p className="text-sm text-muted-foreground">Belum ada prestasi.</p>}
            <ul className="space-y-1 text-sm">
              {konteks.tampilkanPeringkat && row.peringkat && (
                <li className="text-foreground">
                  Peringkat ke-{row.peringkat.peringkat} dari {row.peringkat.totalSiswa} Peserta Didik
                </li>
              )}
              {row.prestasiRaport.map((p, i) => (
                <li key={i} className="text-foreground">
                  {p.judulRaport} — <span className="text-muted-foreground">{PRESTASI_TINGKAT_LABELS[p.tingkat]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              Diambil otomatis dari halaman Prestasi — sembunyikan/ubah lewat "Tampil di Raport" di sana.
            </p>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-foreground">Ketidakhadiran</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Otomatis dari absensi: Sakit {row.kehadiranOtomatis.sakit}, Izin {row.kehadiranOtomatis.izin}, Alpa {row.kehadiranOtomatis.alpa}.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">Override Sakit</span>
                <Input type="number" min={0} disabled={!bisaEdit} value={overrideSakit} onChange={(e) => setOverrideSakit(e.target.value)} placeholder={String(row.kehadiranOtomatis.sakit)} />
              </div>
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">Override Izin</span>
                <Input type="number" min={0} disabled={!bisaEdit} value={overrideIzin} onChange={(e) => setOverrideIzin(e.target.value)} placeholder={String(row.kehadiranOtomatis.izin)} />
              </div>
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">Override Alpa</span>
                <Input type="number" min={0} disabled={!bisaEdit} value={overrideAlpa} onChange={(e) => setOverrideAlpa(e.target.value)} placeholder={String(row.kehadiranOtomatis.alpa)} />
              </div>
            </div>
            {bisaEdit && (
              <div className="mt-2 flex items-center gap-2">
                <Input value={alasanOverride} onChange={(e) => setAlasanOverride(e.target.value)} placeholder="Alasan override (kosongkan utk pakai otomatis)" className="flex-1" />
                <Button size="sm" onClick={handleSaveKehadiran} disabled={saveKehadiran.isPending}>
                  Simpan
                </Button>
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-foreground">Catatan Pendidik</p>
            {bisaEdit && konteks.bankKalimat.length > 0 && (
              <Select value={templatePilihan} onValueChange={handlePilihTemplate}>
                <SelectTrigger className="mb-2 w-full">
                  <SelectValue placeholder="Pilih dari bank kalimat..." />
                </SelectTrigger>
                <SelectContent>
                  {konteks.bankKalimat.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.teks}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} disabled={!bisaEdit} />
            {bisaEdit && (
              <Button size="sm" className="mt-2" onClick={handleSaveCatatan} disabled={saveCatatan.isPending}>
                Simpan
              </Button>
            )}
          </section>

          {konteks.semesterGenap && (
            <section>
              <p className="mb-2 text-sm font-semibold text-foreground">Keterangan Kenaikan Kelas</p>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={keteranganKenaikan} onValueChange={(v) => setKeteranganKenaikan(v as KeteranganKenaikan)} disabled={!bisaEdit}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KETERANGAN_KENAIKAN_LIST.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KETERANGAN_KENAIKAN_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {keteranganKenaikan === "naik" && (
                  <Input value={kenaikanKeKelas} onChange={(e) => setKenaikanKeKelas(e.target.value)} placeholder="Ke kelas" className="w-28" disabled={!bisaEdit} />
                )}
                {bisaEdit && (
                  <Button size="sm" onClick={handleSaveKenaikan} disabled={saveKenaikan.isPending}>
                    Simpan
                  </Button>
                )}
              </div>
            </section>
          )}

          {row.status === "final" && row.kodeVerifikasi && (
            <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
              Kode Verifikasi: <span className="font-mono">{row.kodeVerifikasi}</span>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
