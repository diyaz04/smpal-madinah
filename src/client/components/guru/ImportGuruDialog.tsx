import { useState } from "react";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { createGuruSchema, type CreateGuruInput } from "@shared/schemas/guru.schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useImportGuruCommit } from "@/hooks/useGuru";
import { ApiError } from "@/lib/api";
import type { GuruImportRowResult } from "@shared/types";

interface ImportGuruDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HEADER_MAP: Record<string, keyof CreateGuruInput> = {
  NIP: "nip",
  NUPTK: "nuptk",
  "Nama Lengkap": "namaLengkap",
  "Nama Tanpa Gelar": "namaTanpaGelar",
  "Jenis Kelamin": "jenisKelamin",
  "Tempat Lahir": "tempatLahir",
  "Tanggal Lahir": "tanggalLahir",
  "No HP": "noHp",
  Email: "email",
  Alamat: "alamat",
  "Status Kepegawaian": "statusKepegawaian",
  "Tanggal Mulai Tugas": "tanggalMulaiTugas",
};

function cellToString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function ImportGuruDialog({ open, onOpenChange }: ImportGuruDialogProps) {
  const [rows, setRows] = useState<GuruImportRowResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const importCommit = useImportGuruCommit();

  async function handleFile(file: File) {
    setParsing(true);
    setRows([]);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("Sheet kosong");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const results: GuruImportRowResult[] = raw.map((rawRow, i) => {
        const data: Record<string, string> = { isActive: "true" } as Record<string, string>;
        for (const [header, field] of Object.entries(HEADER_MAP)) {
          data[field] = cellToString(rawRow[header]);
        }
        const parsed = createGuruSchema.safeParse({ ...data, isActive: true });
        return {
          row: i + 2,
          data,
          errors: parsed.success ? [] : parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`),
          valid: parsed.success,
        };
      });
      setRows(results);
      if (results.length === 0) toast.warning("Tidak ada baris data ditemukan di file ini.");
    } catch {
      toast.error("Gagal membaca file. Pastikan formatnya .xlsx atau .csv sesuai template ekspor.");
    } finally {
      setParsing(false);
    }
  }

  const validRows = rows.filter((r) => r.valid);
  const invalidCount = rows.length - validRows.length;

  function handleCommit() {
    const payload: CreateGuruInput[] = validRows.map((r) => createGuruSchema.parse({ ...r.data, isActive: true }));
    importCommit.mutate(payload, {
      onSuccess: ({ count }) => {
        toast.success(`${count} guru berhasil diimpor.`);
        setRows([]);
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal mengimpor."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impor Data Guru dari Excel</DialogTitle>
          <DialogDescription>
            Gunakan format yang sama dengan hasil Ekspor. Kolom: NIP, NUPTK, Nama Lengkap, Nama Tanpa
            Gelar, Jenis Kelamin (L/P), Tempat Lahir, Tanggal Lahir, No HP, Email, Alamat, Status
            Kepegawaian, Tanggal Mulai Tugas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center hover:bg-accent">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Klik untuk pilih file .xlsx atau .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>

          {parsing && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Membaca file...
            </p>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge>
                  <CheckCircle2 className="h-3 w-3" /> {validRows.length} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3" /> {invalidCount} bermasalah
                  </Badge>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Baris</th>
                      <th className="p-2 text-left">Nama</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.row} className="border-t border-border">
                        <td className="p-2">{r.row}</td>
                        <td className="p-2">{r.data.namaLengkap || "(kosong)"}</td>
                        <td className="p-2">
                          {r.valid ? (
                            <span className="text-success">Valid</span>
                          ) : (
                            <span className="text-destructive" title={r.errors.join("; ")}>
                              {r.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleCommit} disabled={validRows.length === 0 || importCommit.isPending}>
            {importCommit.isPending && <Loader2 className="animate-spin" />}
            Impor {validRows.length > 0 ? `${validRows.length} Guru` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
