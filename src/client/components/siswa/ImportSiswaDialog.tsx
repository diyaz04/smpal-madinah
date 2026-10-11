import { useState } from "react";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { createSiswaSchema, type CreateSiswaInput } from "@shared/schemas/siswa.schema";
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
import { useImportSiswaCommit } from "@/hooks/useSiswa";
import { ApiError } from "@/lib/api";

interface ImportSiswaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RowResult {
  row: number;
  data: Record<string, string>;
  errors: string[];
  valid: boolean;
}

const HEADER_MAP: Record<string, keyof CreateSiswaInput> = {
  NIS: "nis",
  NISN: "nisn",
  "Nama Lengkap": "namaLengkap",
  "Nama Panggilan": "namaPanggilan",
  "Jenis Kelamin": "jenisKelamin",
  "Tempat Lahir": "tempatLahir",
  "Tanggal Lahir": "tanggalLahir",
  Agama: "agama",
  Alamat: "alamat",
  "Nama Ayah": "namaAyah",
  "Nama Ibu": "namaIbu",
  "Nama Wali": "namaWali",
  "No HP Orang Tua": "noHpOrtu",
  "Pekerjaan Orang Tua": "pekerjaanOrtu",
};

function cellToString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function ImportSiswaDialog({ open, onOpenChange }: ImportSiswaDialogProps) {
  const [rows, setRows] = useState<RowResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const importCommit = useImportSiswaCommit();

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

      const results: RowResult[] = raw.map((rawRow, i) => {
        const data: Record<string, string> = {};
        for (const [header, field] of Object.entries(HEADER_MAP)) {
          data[field] = cellToString(rawRow[header]);
        }
        const parsed = createSiswaSchema.safeParse({ ...data, status: "AKTIF", rombelId: null });
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
    const payload: CreateSiswaInput[] = validRows.map((r) =>
      createSiswaSchema.parse({ ...r.data, status: "AKTIF", rombelId: null }),
    );
    importCommit.mutate(payload, {
      onSuccess: ({ count }) => {
        toast.success(`${count} siswa berhasil diimpor. Tempatkan ke rombel lewat aksi "Pindah Rombel".`);
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
          <DialogTitle>Impor Data Siswa dari Excel</DialogTitle>
          <DialogDescription>
            Gunakan format yang sama dengan hasil Ekspor. Kolom: NIS, NISN, Nama Lengkap, Nama
            Panggilan, Jenis Kelamin (L/P), Tempat Lahir, Tanggal Lahir, Agama, Alamat, Nama Ayah, Nama
            Ibu, Nama Wali, No HP Orang Tua, Pekerjaan Orang Tua. Penempatan rombel dilakukan terpisah
            setelah impor lewat aksi "Pindah Rombel".
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
            Impor {validRows.length > 0 ? `${validRows.length} Siswa` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
