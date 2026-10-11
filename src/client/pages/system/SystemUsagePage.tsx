import { useQuery } from "@tanstack/react-query";
import { Database, HardDrive } from "lucide-react";

import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface TableUsage {
  table: string;
  label: string;
  rowCount: number;
}
interface FilePrefixUsage {
  prefix: string;
  fileCount: number;
  totalBytes: number;
}
interface SystemUsageResponse {
  tables: TableUsage[];
  filesByPrefix: FilePrefixUsage[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SystemUsagePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["system-usage"],
    queryFn: () => api.get<SystemUsageResponse>("/system-usage"),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Pemakaian Sistem</h1>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 font-medium text-foreground">
          <Database className="h-4 w-4" /> Jumlah Baris per Tabel
        </div>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="divide-y divide-border">
            {data?.tables.map((t) => (
              <div key={t.table} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{t.label}</span>
                <span className="font-medium text-foreground">{t.rowCount.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 font-medium text-foreground">
          <HardDrive className="h-4 w-4" /> Penyimpanan File (R2)
        </div>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : data?.filesByPrefix.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada file diunggah.</p>
        ) : (
          <div className="divide-y divide-border">
            {data?.filesByPrefix.map((p) => (
              <div key={p.prefix} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">
                  {p.prefix} ({p.fileCount} file)
                </span>
                <span className="font-medium text-foreground">{formatBytes(p.totalBytes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
