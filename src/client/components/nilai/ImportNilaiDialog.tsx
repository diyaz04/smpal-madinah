import { useState } from "react";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
import type { InputNilaiSiswaRow } from "@shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tpList: { id: string; kode: string }[];
  rows: InputNilaiSiswaRow[];
  onTerapkan: (hasil: InputNilaiSiswaRow[]) => void;
}

interface ParsedRow {
  excelRow: number;
  siswaId: string | null;
  namaLengkap: string;
  nilaiTp: Record<string, number | null>;
  nilaiSts: number | null;
  nilaiSas: number | null;
  errors: string[];
}

function parseNilaiCell(value: unknown, label: string, errors: string[]): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    errors.push(`${label} harus 0-100`);
    return null;
  }
  return Math.round(num);
}

export function ImportNilaiDialog({ open, onOpenChange, tpList, rows, onTerapkan }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);

  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");
    const data = rows.map((r, i) => {
      const row: Record<string, string | number> = {
        "No Absen": r.nomorAbsen ?? i + 1,
        Nama: r.namaLengkap,
      };
      for (const tp of tpList) row[tp.kode] = r.nilaiTp[tp.id] ?? "";
      row.STS = r.nilaiSts ?? "";
      row.SAS = r.nilaiSas ?? "";
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nilai");
    XLSX.writeFile(wb, "template-input-nilai.xlsx");
  }

  async function handleFile(file: File) {
    setParsing(true);
    setParsed([]);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("Sheet kosong");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const bySiswaNomor = new Map(rows.map((r) => [String(r.nomorAbsen ?? ""), r.siswaId]));
      const bySiswaNama = new Map(rows.map((r) => [r.namaLengkap.trim().toLowerCase(), r.siswaId]));

      const hasil: ParsedRow[] = raw.map((rawRow, i) => {
        const errors: string[] = [];
        const noAbsen = String(rawRow["No Absen"] ?? "").trim();
        const nama = String(rawRow["Nama"] ?? "").trim();
        const siswaId = bySiswaNomor.get(noAbsen) ?? bySiswaNama.get(nama.toLowerCase()) ?? null;
        if (!siswaId) errors.push("Siswa tidak ditemukan (cocokkan No Absen/Nama dengan rombel ini)");

        const nilaiTp: Record<string, number | null> = {};
        for (const tp of tpList) nilaiTp[tp.id] = parseNilaiCell(rawRow[tp.kode], tp.kode, errors);
        const nilaiSts = parseNilaiCell(rawRow["STS"], "STS", errors);
        const nilaiSas = parseNilaiCell(rawRow["SAS"], "SAS", errors);

        return { excelRow: i + 2, siswaId, namaLengkap: nama, nilaiTp, nilaiSts, nilaiSas, errors };
      });
      setParsed(hasil);
      if (hasil.length === 0) toast.warning("Tidak ada baris data ditemukan di file ini.");
    } catch {
      toast.error("Gagal membaca file. Pastikan formatnya .xlsx sesuai template.");
    } finally {
      setParsing(false);
    }
  }

  const validRows = parsed.filter((r) => r.errors.length === 0);
  const invalidCount = parsed.length - validRows.length;

  function handleTerapkan() {
    const hasil = rows.map((row) => {
      const match = validRows.find((v) => v.siswaId === row.siswaId);
      if (!match) return row;
      return { ...row, nilaiTp: match.nilaiTp, nilaiSts: match.nilaiSts, nilaiSas: match.nilaiSas };
    });
    onTerapkan(hasil);
    toast.success(`${validRows.length} baris diterapkan ke tabel — klik Simpan untuk menyimpan.`);
    setParsed([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impor Nilai dari Excel</DialogTitle>
          <DialogDescription>
            Unduh template (sesuai siswa & TP rombel ini), isi nilai, lalu unggah kembali. Pencocokan baris
            pakai kolom "No Absen" (atau "Nama" kalau No Absen kosong).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            Unduh Template
          </Button>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center hover:bg-accent">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Klik untuk pilih file .xlsx</span>
            <input
              type="file"
              accept=".xlsx,.xls"
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

          {parsed.length > 0 && (
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
                    {parsed.map((r) => (
                      <tr key={r.excelRow} className="border-t border-border">
                        <td className="p-2">{r.excelRow}</td>
                        <td className="p-2">{r.namaLengkap || "(kosong)"}</td>
                        <td className="p-2">
                          {r.errors.length === 0 ? (
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
          <Button onClick={handleTerapkan} disabled={validRows.length === 0}>
            Terapkan {validRows.length > 0 ? `${validRows.length} Baris` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
