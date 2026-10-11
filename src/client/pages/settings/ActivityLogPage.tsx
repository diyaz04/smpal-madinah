import { useState } from "react";
import { History, Archive, Download, ChevronRight } from "lucide-react";

import { MODULES } from "@shared/modules";
import { ACTIVITY_ACTIONS, ACTIVITY_ACTION_LABELS } from "@shared/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useActivityLogsQuery,
  useActivityLogDetail,
  useActivityLogArchives,
  type ActivityLogFilters,
} from "@/hooks/useActivityLogs";
import { usePermission } from "@/hooks/usePermission";
import { useUsersQuery } from "@/hooks/useUsers";
import { formatDateTimeIndonesian, formatDateShortIndonesian } from "@/lib/dateFormat";

const EXTRA_MODULE_KEYS = ["auth", "profil_saya"] as const;
const MODULE_LABELS: Record<string, string> = {
  auth: "Autentikasi",
  profil_saya: "Profil Saya",
  ...Object.fromEntries(MODULES.map((m) => [m.key, m.nama])),
};
const FILTERABLE_MODULE_KEYS = [...MODULES.map((m) => m.key), ...EXTRA_MODULE_KEYS];

function LogDetailSheet({ logId, onClose }: { logId: string | null; onClose: () => void }) {
  const { data } = useActivityLogDetail(logId);
  const log = data?.log;

  return (
    <Sheet open={!!logId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detail Aktivitas</SheetTitle>
        </SheetHeader>
        {log && (
          <div className="space-y-4 px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Waktu</p>
                <p className="font-medium text-foreground">{formatDateTimeIndonesian(log.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User</p>
                <p className="font-medium text-foreground">{log.usernameSnapshot ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Modul</p>
                <p className="font-medium text-foreground">{MODULE_LABELS[log.moduleKey] ?? log.moduleKey}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aksi</p>
                <p className="font-medium text-foreground">
                  {ACTIVITY_ACTION_LABELS[log.action as keyof typeof ACTIVITY_ACTION_LABELS] ?? log.action}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">IP</p>
                <p className="font-medium text-foreground">{log.ip ?? "-"}</p>
              </div>
            </div>

            {log.changes && Object.keys(log.changes).length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Perubahan Data</p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Kolom</th>
                        <th className="px-2 py-1.5 text-left">Sebelum</th>
                        <th className="px-2 py-1.5 text-left">Sesudah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(log.changes).map(([field, diff]) => (
                        <tr key={field} className="border-t border-border">
                          <td className="px-2 py-1.5 font-medium text-foreground">{field}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {JSON.stringify(diff.before)}
                          </td>
                          <td className="px-2 py-1.5 text-foreground">{JSON.stringify(diff.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada perubahan data tercatat.</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LogTab() {
  const { can } = usePermission();
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const canSeeUsers = can("manajemen_pengguna", "lihat");
  const { data: usersData } = useUsersQuery({
    page: 1,
    search: "",
    roleId: null,
    status: null,
    pageSize: 100,
  });

  const currentCursor = cursorStack[cursorStack.length - 1] ?? null;
  const { data, isLoading } = useActivityLogsQuery(currentCursor, filters);

  function updateFilter<K extends keyof ActivityLogFilters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value === "all" || value === "" ? undefined : value }));
    setCursorStack([null]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.moduleKey ?? "all"} onValueChange={(v) => updateFilter("moduleKey", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua modul</SelectItem>
            {FILTERABLE_MODULE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {MODULE_LABELS[key] ?? key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.action ?? "all"} onValueChange={(v) => updateFilter("action", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua aksi</SelectItem>
            {ACTIVITY_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTIVITY_ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canSeeUsers && (
          <Select value={filters.userId ?? "all"} onValueChange={(v) => updateFilter("userId", v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua user</SelectItem>
              {(usersData?.items ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">s/d</span>
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          className="w-40"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-foreground">Waktu</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">User</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Modul</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Aksi</th>
              <th className="w-8 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2" colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <History className="h-6 w-6" />
                    Belum ada aktivitas tercatat.
                  </div>
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer border-t border-border hover:bg-accent"
                  onClick={() => setSelectedLogId(log.id)}
                >
                  <td className="px-4 py-2 text-muted-foreground">{formatDateTimeIndonesian(log.createdAt)}</td>
                  <td className="px-4 py-2 text-foreground">{log.usernameSnapshot ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {MODULE_LABELS[log.moduleKey] ?? log.moduleKey}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">
                      {ACTIVITY_ACTION_LABELS[log.action as keyof typeof ACTIVITY_ACTION_LABELS] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={cursorStack.length <= 1}
          onClick={() => setCursorStack((prev) => prev.slice(0, -1))}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!data?.nextCursor}
          onClick={() => data?.nextCursor && setCursorStack((prev) => [...prev, data.nextCursor])}
        >
          Berikutnya
        </Button>
      </div>

      <LogDetailSheet logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
    </div>
  );
}

function ArchiveTab() {
  const { data, isLoading } = useActivityLogArchives();
  const { can } = usePermission();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!data?.archives.length) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <Archive className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium text-foreground">Belum ada arsip</p>
        <p className="text-sm text-muted-foreground">
          Log lebih dari 180 hari akan diarsipkan otomatis setiap hari.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-foreground">Bulan</th>
            <th className="px-4 py-2 text-left font-medium text-foreground">Jumlah Baris</th>
            <th className="px-4 py-2 text-left font-medium text-foreground">Ukuran</th>
            <th className="px-4 py-2 text-left font-medium text-foreground">Diarsipkan</th>
            <th className="w-10 px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.archives.map((a) => (
            <tr key={a.id} className="border-t border-border">
              <td className="px-4 py-2 font-medium text-foreground">{a.yearMonth}</td>
              <td className="px-4 py-2 text-muted-foreground">{a.rowCount.toLocaleString("id-ID")}</td>
              <td className="px-4 py-2 text-muted-foreground">{(a.sizeBytes / 1024).toFixed(1)} KB</td>
              <td className="px-4 py-2 text-muted-foreground">{formatDateShortIndonesian(a.createdAt)}</td>
              <td className="px-4 py-2 text-right">
                {can("log_aktivitas", "export") && (
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a href={`/api/activity-logs/archives/${a.id}/download`} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityLogPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Log Aktivitas</h1>
      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Log</TabsTrigger>
          <TabsTrigger value="arsip">Arsip</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="pt-4">
          <LogTab />
        </TabsContent>
        <TabsContent value="arsip" className="pt-4">
          <ArchiveTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
