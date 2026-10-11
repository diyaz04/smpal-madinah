import { Construction } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
}

/** Placeholder untuk halaman yang belum dibangun di langkah urutan pengerjaan saat ini. */
export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Construction className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">Sedang dibangun di langkah berikutnya.</p>
      </div>
    </div>
  );
}
