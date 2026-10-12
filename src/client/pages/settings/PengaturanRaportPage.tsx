import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { TINGKAT_LIST } from "@shared/constants";
import { useRaportPengaturanQuery, useUpdateRaportPengaturan } from "@/hooks/useRaportPengaturan";
import { ApiError } from "@/lib/api";
import type { RaportPengaturan } from "@shared/types";

export function PengaturanRaportPage() {
  const { data, isLoading } = useRaportPengaturanQuery();
  const update = useUpdateRaportPengaturan();
  const [form, setForm] = useState<RaportPengaturan | null>(null);

  useEffect(() => {
    if (data) setForm(data.item);
  }, [data]);

  const totalBobot = form ? form.bobotTp + form.bobotSts + form.bobotSas : 0;

  function handleSave() {
    if (!form) return;
    if (totalBobot !== 100) {
      toast.error("Total bobot TP + STS + SAS harus 100.");
      return;
    }
    update.mutate(
      { ...form, tempatRaport: form.tempatRaport ?? "", tanggalRaport: form.tanggalRaport ?? "" },
      {
        onSuccess: () => toast.success("Pengaturan raport disimpan."),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  if (isLoading || !form) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Pengaturan Raport</h1>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Bobot Nilai Akhir (total harus 100)
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">Rata-rata TP (%)</span>
              <Input
                type="number"
                value={form.bobotTp}
                onChange={(e) => setForm({ ...form, bobotTp: Number(e.target.value) })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">STS (%)</span>
              <Input
                type="number"
                value={form.bobotSts}
                onChange={(e) => setForm({ ...form, bobotSts: Number(e.target.value) })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">SAS (%)</span>
              <Input
                type="number"
                value={form.bobotSas}
                onChange={(e) => setForm({ ...form, bobotSas: Number(e.target.value) })}
              />
            </div>
          </div>
          <p className={`mt-1 text-xs ${totalBobot === 100 ? "text-muted-foreground" : "text-destructive"}`}>
            Total saat ini: {totalBobot}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Pembulatan (jumlah desimal)</label>
          <Input
            type="number"
            min={0}
            max={2}
            value={form.pembulatanDesimal}
            onChange={(e) => setForm({ ...form, pembulatanDesimal: Number(e.target.value) })}
            className="w-32"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Tempat Raport</label>
            <Input
              value={form.tempatRaport ?? ""}
              onChange={(e) => setForm({ ...form, tempatRaport: e.target.value })}
              placeholder="Jakarta"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Tanggal Raport</label>
            <Input
              type="date"
              value={form.tanggalRaport ?? ""}
              onChange={(e) => setForm({ ...form, tanggalRaport: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Fase per Tingkat</label>
          <div className="grid grid-cols-3 gap-3">
            {TINGKAT_LIST.map((t) => (
              <div key={t}>
                <span className="mb-1 block text-xs text-muted-foreground">Kelas {t}</span>
                <Input
                  value={form.fasePerTingkat[t]}
                  onChange={(e) => setForm({ ...form, fasePerTingkat: { ...form.fasePerTingkat, [t]: e.target.value } })}
                  maxLength={5}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <label className="text-sm font-medium text-foreground">Tampilkan Peringkat di Raport</label>
          <Switch
            checked={form.tampilkanPeringkat}
            onCheckedChange={(v) => setForm({ ...form, tampilkanPeringkat: v })}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={update.isPending}>
        {update.isPending && <Loader2 className="animate-spin" />}
        Simpan
      </Button>
    </div>
  );
}
