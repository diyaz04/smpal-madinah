import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createIzinGuruSchema, type CreateIzinGuruInput } from "@shared/schemas/izinGuru.schema";
import { IZIN_GURU_JENIS_LIST, IZIN_GURU_JENIS_LABELS } from "@shared/constants";
import type { IzinGuruItem } from "@shared/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateIzinGuru, useUpdateIzinGuru } from "@/hooks/useIzinGuru";
import { useGuruQuery } from "@/hooks/useGuru";
import { ApiError } from "@/lib/api";

interface IzinGuruFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  izin?: IzinGuruItem;
}

const EMPTY_DEFAULTS: CreateIzinGuruInput = {
  guruId: "",
  jenis: "izin",
  tanggalMulai: "",
  tanggalSelesai: "",
  parsial: false,
  jamDari: null,
  jamSampai: null,
  keterangan: "",
  lampiranFileId: null,
};

export function IzinGuruFormDialog({ open, onOpenChange, izin }: IzinGuruFormDialogProps) {
  const isEdit = !!izin;
  const createIzin = useCreateIzinGuru();
  const updateIzin = useUpdateIzinGuru(izin?.id ?? "");
  const mutation = isEdit ? updateIzin : createIzin;

  const { data: guruData } = useGuruQuery({ page: 1, pageSize: 100, search: "", status: "active" });
  const [form, setForm] = useState<CreateIzinGuruInput>(EMPTY_DEFAULTS);

  useEffect(() => {
    if (open) {
      setForm(
        izin
          ? {
              guruId: izin.guruId,
              jenis: izin.jenis,
              tanggalMulai: izin.tanggalMulai,
              tanggalSelesai: izin.tanggalSelesai,
              parsial: izin.parsial,
              jamDari: izin.jamDari,
              jamSampai: izin.jamSampai,
              keterangan: izin.keterangan ?? "",
              lampiranFileId: izin.lampiranFileId,
            }
          : EMPTY_DEFAULTS,
      );
    }
  }, [open, izin]);

  function onSubmit() {
    const parsed = createIzinGuruSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }
    const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    const onSuccess = () => {
      toast.success(isEdit ? "Izin berhasil diperbarui." : "Izin berhasil dicatat.");
      onOpenChange(false);
    };
    if (isEdit) {
      const { guruId: _guruId, ...rest } = form;
      updateIzin.mutate(rest, { onSuccess, onError });
    } else {
      createIzin.mutate(form, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Izin Guru" : "Catat Izin/Sakit/Dinas Guru"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Guru</label>
              <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih guru" />
                </SelectTrigger>
                <SelectContent>
                  {(guruData?.items ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.namaLengkap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Guru: {izin.guruNama}</p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Jenis</label>
            <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v as CreateIzinGuruInput["jenis"] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IZIN_GURU_JENIS_LIST.map((j) => (
                  <SelectItem key={j} value={j}>
                    {IZIN_GURU_JENIS_LABELS[j]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Tanggal Mulai</label>
              <Input type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Tanggal Selesai</label>
              <Input type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-sm font-medium text-foreground">Sebagian Hari (jam tertentu saja)</span>
            <Switch checked={form.parsial} onCheckedChange={(checked) => setForm({ ...form, parsial: checked })} />
          </div>
          {form.parsial && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="time"
                value={form.jamDari ?? ""}
                onChange={(e) => setForm({ ...form, jamDari: e.target.value })}
                placeholder="Dari"
              />
              <Input
                type="time"
                value={form.jamSampai ?? ""}
                onChange={(e) => setForm({ ...form, jamSampai: e.target.value })}
                placeholder="Sampai"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Keterangan (opsional)</label>
            <Textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={onSubmit}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
