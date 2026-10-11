import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HARI_LIST, MODE_JAM_MASUK_LIST, RETENSI_FOTO_PILIHAN } from "@shared/constants";
import { usePengaturanPresensi, useUpdatePengaturanPresensi } from "@/hooks/usePengaturanPresensi";
import { ApiError } from "@/lib/api";
import type { PengaturanPresensi } from "@shared/types";

const MODE_LABELS: Record<string, string> = {
  jam_sekolah: "Jam Sekolah (sama untuk semua guru)",
  jadwal_mengajar: "Jadwal Mengajar (jam masuk = pertemuan pertama)",
};

export function PengaturanPresensiPage() {
  const { data, isLoading } = usePengaturanPresensi();
  const update = useUpdatePengaturanPresensi();
  const [form, setForm] = useState<PengaturanPresensi | null>(null);

  useEffect(() => {
    if (data) setForm(data.item);
  }, [data]);

  function handleSave() {
    if (!form) return;
    update.mutate(form, {
      onSuccess: () => toast.success("Pengaturan presensi disimpan."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  if (isLoading || !form) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Pengaturan Presensi</h1>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Mode Jam Masuk</label>
          <Select value={form.modeJamMasuk} onValueChange={(v) => setForm({ ...form, modeJamMasuk: v as PengaturanPresensi["modeJamMasuk"] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODE_JAM_MASUK_LIST.map((m) => (
                <SelectItem key={m} value={m}>
                  {MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Toleransi Terlambat (menit)</label>
            <Input
              type="number"
              value={form.toleransiTerlambatMenit}
              onChange={(e) => setForm({ ...form, toleransiTerlambatMenit: Number(e.target.value) })}
            />
          </div>
          {form.modeJamMasuk === "jadwal_mengajar" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Offset Sebelum Jadwal (menit)</label>
              <Input
                type="number"
                value={form.offsetJadwalMengajarMenit}
                onChange={(e) => setForm({ ...form, offsetJadwalMengajarMenit: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <p className="font-medium text-foreground">Jam Kerja per Hari</p>
        {HARI_LIST.map((hari) => {
          const jam = form.jamKerja[hari];
          return (
            <div key={hari} className="flex items-center gap-3">
              <span className="w-20 text-sm text-muted-foreground">{hari}</span>
              <Switch
                checked={!!jam}
                onCheckedChange={(checked) =>
                  setForm({
                    ...form,
                    jamKerja: { ...form.jamKerja, [hari]: checked ? { masuk: "07:00", pulang: "15:00" } : null },
                  })
                }
              />
              {jam && (
                <>
                  <Input
                    type="time"
                    value={jam.masuk}
                    onChange={(e) => setForm({ ...form, jamKerja: { ...form.jamKerja, [hari]: { ...jam, masuk: e.target.value } } })}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">s/d</span>
                  <Input
                    type="time"
                    value={jam.pulang}
                    onChange={(e) => setForm({ ...form, jamKerja: { ...form.jamKerja, [hari]: { ...jam, pulang: e.target.value } } })}
                    className="w-28"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Masa Simpan Foto Selfie</label>
          <Select value={String(form.retensiFotoHari)} onValueChange={(v) => setForm({ ...form, retensiFotoHari: Number(v) as 7 | 30 | 60 })}>
            <SelectTrigger className="w-full max-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENSI_FOTO_PILIHAN.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} hari
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Masa simpan lebih panjang memudahkan pengecekan kalau ada keberatan presensi di akhir bulan.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Belajar Wajah dari Selfie Presensi</span>
          <Switch
            checked={form.descriptorOtomatisAktif}
            onCheckedChange={(checked) => setForm({ ...form, descriptorOtomatisAktif: checked })}
          />
        </div>
      </div>

      <Button disabled={update.isPending} onClick={handleSave}>
        {update.isPending && <Loader2 className="animate-spin" />}
        Simpan Pengaturan
      </Button>
    </div>
  );
}
