import { useEffect, useMemo, useRef, useState } from "react";
import { PenLine, Save, FileUp, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportNilaiDialog } from "@/components/nilai/ImportNilaiDialog";
import { usePilihanAmpuanQuery, useInputNilaiKonteks, useSimpanNilai } from "@/hooks/useNilai";
import { usePermission } from "@/hooks/usePermission";
import { hitungNilaiAkhir, tentukanPredikat } from "@shared/nilai";
import { ApiError } from "@/lib/api";
import type { InputNilaiSiswaRow } from "@shared/types";

const MODULE = "input_nilai";

export function InputNilaiPage() {
  const { can } = usePermission();
  const { data: pilihanData, isLoading: pilihanLoading } = usePilihanAmpuanQuery();
  const [pilihanKey, setPilihanKey] = useState("");
  const [rombelId, mapelId] = pilihanKey ? pilihanKey.split("|") : [null, null];

  const { data, isLoading } = useInputNilaiKonteks(rombelId ?? null, mapelId ?? null);
  const simpanNilai = useSimpanNilai();
  const [rows, setRows] = useState<InputNilaiSiswaRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (data) setRows(data.item.rows);
  }, [data]);

  const konteks = data?.item;
  const columns = useMemo(
    () => [...(konteks?.tpList.map((tp) => tp.id) ?? []), "sts", "sas"],
    [konteks?.tpList],
  );

  function recompute(row: InputNilaiSiswaRow): InputNilaiSiswaRow {
    if (!konteks) return row;
    const tpIds = konteks.tpList.map((tp) => tp.id);
    const nilaiAkhir = hitungNilaiAkhir(
      tpIds.map((tpId) => row.nilaiTp[tpId] ?? null),
      row.nilaiSts,
      row.nilaiSas,
      konteks.bobot,
      konteks.pembulatanDesimal,
    );
    return { ...row, nilaiAkhir, predikat: tentukanPredikat(nilaiAkhir, konteks.predikatConfig) };
  }

  function updateCell(siswaId: string, columnKey: string, value: string) {
    const num = value.trim() === "" ? null : Number(value);
    setRows((prev) =>
      prev.map((row) => {
        if (row.siswaId !== siswaId) return row;
        const next =
          columnKey === "sts"
            ? { ...row, nilaiSts: num }
            : columnKey === "sas"
              ? { ...row, nilaiSas: num }
              : { ...row, nilaiTp: { ...row.nilaiTp, [columnKey]: num } };
        return recompute(next);
      }),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const nextRow = rows[rowIndex + 1];
    if (!nextRow) return;
    const key = `${nextRow.siswaId}:${columns[colIndex]}`;
    inputRefs.current[key]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return; // biarkan paste satu nilai normal
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);

    setRows((prev) => {
      const next = [...prev];
      lines.forEach((line, i) => {
        const targetRow = next[rowIndex + i];
        if (!targetRow) return;
        const cells = line.split("\t");
        let updated = targetRow;
        cells.forEach((cell, j) => {
          const columnKey = columns[colIndex + j];
          if (!columnKey) return;
          const num = cell.trim() === "" ? null : Number(cell.trim());
          if (num !== null && !Number.isFinite(num)) return;
          updated =
            columnKey === "sts"
              ? { ...updated, nilaiSts: num }
              : columnKey === "sas"
                ? { ...updated, nilaiSas: num }
                : { ...updated, nilaiTp: { ...updated.nilaiTp, [columnKey]: num } };
        });
        next[rowIndex + i] = recompute(updated);
      });
      return next;
    });
  }

  function handleSave() {
    if (!rombelId || !mapelId) return;
    simpanNilai.mutate(
      {
        rombelId,
        mapelId,
        rows: rows.map((r) => ({ siswaId: r.siswaId, nilaiTp: r.nilaiTp, nilaiSts: r.nilaiSts, nilaiSas: r.nilaiSas })),
      },
      {
        onSuccess: (res) => toast.success(`Nilai ${res.count} siswa tersimpan.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan."),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Input Nilai</h1>
      </div>

      {pilihanLoading ? (
        <Skeleton className="h-10 w-72" />
      ) : (pilihanData?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Anda belum mengampu rombel + mapel apa pun pada periode aktif.</p>
      ) : (
        <Select value={pilihanKey} onValueChange={setPilihanKey}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Pilih rombel + mapel" />
          </SelectTrigger>
          <SelectContent>
            {pilihanData!.items.map((p) => (
              <SelectItem key={`${p.rombelId}|${p.mapelId}`} value={`${p.rombelId}|${p.mapelId}`}>
                {p.rombelNama} — {p.mapelNama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {rombelId && mapelId && (
        <>
          {isLoading || !konteks ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {konteks.terkunci && (
                <p className="flex items-center gap-1.5 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" /> Nilai rombel ini sudah terkunci, tidak bisa diubah.
                </p>
              )}

              {konteks.tpList.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Belum ada Tujuan Pembelajaran untuk mapel ini — tambahkan dulu di halaman Tujuan Pembelajaran.
                </p>
              )}

              <div className="flex gap-2">
                {!konteks.terkunci && can(MODULE, "tambah") && (
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    <FileUp className="h-4 w-4" /> Impor Excel
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="sticky left-0 bg-muted p-2 text-left">No</th>
                      <th className="sticky left-10 bg-muted p-2 text-left">Nama</th>
                      {konteks.tpList.map((tp) => (
                        <th key={tp.id} className="p-2 text-center" title={tp.deskripsi}>
                          {tp.kode}
                        </th>
                      ))}
                      <th className="p-2 text-center">STS</th>
                      <th className="p-2 text-center">SAS</th>
                      <th className="p-2 text-center">Nilai Akhir</th>
                      <th className="p-2 text-center">Predikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row.siswaId} className="border-t border-border">
                        <td className="sticky left-0 bg-card p-2">{row.nomorAbsen ?? "—"}</td>
                        <td className="sticky left-10 bg-card p-2 whitespace-nowrap">{row.namaLengkap}</td>
                        {konteks.tpList.map((tp, colIndex) => (
                          <td key={tp.id} className="p-1">
                            <input
                              ref={(el) => {
                                inputRefs.current[`${row.siswaId}:${tp.id}`] = el;
                              }}
                              type="number"
                              min={0}
                              max={100}
                              disabled={konteks.terkunci || !can(MODULE, "tambah")}
                              value={row.nilaiTp[tp.id] ?? ""}
                              onChange={(e) => updateCell(row.siswaId, tp.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                              onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                              className="w-16 rounded border border-border bg-background p-1 text-center disabled:opacity-50"
                            />
                          </td>
                        ))}
                        <td className="p-1">
                          <input
                            ref={(el) => {
                              inputRefs.current[`${row.siswaId}:sts`] = el;
                            }}
                            type="number"
                            min={0}
                            max={100}
                            disabled={konteks.terkunci || !can(MODULE, "tambah")}
                            value={row.nilaiSts ?? ""}
                            onChange={(e) => updateCell(row.siswaId, "sts", e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, konteks.tpList.length)}
                            onPaste={(e) => handlePaste(e, rowIndex, konteks.tpList.length)}
                            className="w-16 rounded border border-border bg-background p-1 text-center disabled:opacity-50"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            ref={(el) => {
                              inputRefs.current[`${row.siswaId}:sas`] = el;
                            }}
                            type="number"
                            min={0}
                            max={100}
                            disabled={konteks.terkunci || !can(MODULE, "tambah")}
                            value={row.nilaiSas ?? ""}
                            onChange={(e) => updateCell(row.siswaId, "sas", e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, konteks.tpList.length + 1)}
                            onPaste={(e) => handlePaste(e, rowIndex, konteks.tpList.length + 1)}
                            className="w-16 rounded border border-border bg-background p-1 text-center disabled:opacity-50"
                          />
                        </td>
                        <td className="p-2 text-center font-medium text-foreground">{row.nilaiAkhir ?? "—"}</td>
                        <td className="p-2 text-center text-muted-foreground">{row.predikat ?? "belum lengkap"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!konteks.terkunci && can(MODULE, "tambah") && (
                <Button onClick={handleSave} disabled={simpanNilai.isPending}>
                  {simpanNilai.isPending ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan
                </Button>
              )}

              <ImportNilaiDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                tpList={konteks.tpList}
                rows={rows}
                onTerapkan={(hasil) => setRows(hasil.map(recompute))}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
