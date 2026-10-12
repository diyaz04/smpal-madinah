import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateDeskripsi } from "@/hooks/useNilai";
import { ApiError } from "@/lib/api";
import type { InputNilaiSiswaRow } from "@shared/types";

interface Props {
  row: InputNilaiSiswaRow | null;
  rombelId: string;
  mapelId: string;
  tpList: { id: string; kode: string; deskripsi: string }[];
  onOpenChange: (open: boolean) => void;
}

export function EditDeskripsiDialog({ row, rombelId, mapelId, tpList, onOpenChange }: Props) {
  const updateDeskripsi = useUpdateDeskripsi();
  const [mode, setMode] = useState<"tp" | "manual">("tp");
  const [tpCapaianId, setTpCapaianId] = useState("");
  const [deskripsiManual, setDeskripsiManual] = useState("");

  useEffect(() => {
    if (row) {
      setMode(row.deskripsiManual ? "manual" : "tp");
      setTpCapaianId(row.tpCapaianId ?? tpList[0]?.id ?? "");
      setDeskripsiManual(row.deskripsi ?? "");
    }
  }, [row, tpList]);

  function handleSave() {
    if (!row) return;
    const input =
      mode === "tp"
        ? { rombelId, mapelId, siswaId: row.siswaId, mode: "tp" as const, tpCapaianId }
        : { rombelId, mapelId, siswaId: row.siswaId, mode: "manual" as const, deskripsiManual };

    updateDeskripsi.mutate(input, {
      onSuccess: () => {
        toast.success("Deskripsi diperbarui.");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
    });
  }

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deskripsi Capaian — {row?.namaLengkap}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === "tp" ? "default" : "outline"} onClick={() => setMode("tp")}>
              Pilih TP
            </Button>
            <Button type="button" size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
              Tulis Manual
            </Button>
          </div>

          {mode === "tp" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">TP Acuan</label>
              <Select value={tpCapaianId} onValueChange={setTpCapaianId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih TP" />
                </SelectTrigger>
                <SelectContent>
                  {tpList.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>
                      {tp.kode} — {tp.deskripsi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Kalimat raport disusun otomatis: "Menunjukkan penguasaan yang [predikat] dalam [TP ini]."
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Deskripsi Manual</label>
              <Textarea value={deskripsiManual} onChange={(e) => setDeskripsiManual(e.target.value)} rows={3} />
              <p className="mt-1 text-xs text-muted-foreground">
                Teks ini tidak akan tertimpa perhitungan ulang otomatis.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={updateDeskripsi.isPending}>
            {updateDeskripsi.isPending && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
