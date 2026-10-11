import { Sparkles } from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { formatDateIndonesian } from "@/lib/dateFormat";
import { SEMESTER_LABELS } from "@shared/constants";

export function HomePage() {
  const { data } = useSession();
  const firstName = data?.user.fullName.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Assalamu'alaikum, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDateIndonesian(new Date())}</p>
      </div>

      {data?.activePeriod && (
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Tahun Ajaran Aktif</span>
          <span className="font-medium text-foreground">
            {data.activePeriod.yearLabel} — {SEMESTER_LABELS[data.activePeriod.semester]}
          </span>
        </div>
      )}

      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium text-foreground">Dashboard lengkap hadir di Tahap 8</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Untuk saat ini, gunakan menu Pengaturan untuk mengelola sekolah.
          </p>
        </div>
      </div>
    </div>
  );
}
