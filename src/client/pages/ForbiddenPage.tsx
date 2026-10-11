import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Akses ditolak</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Anda tidak memiliki izin untuk membuka halaman ini. Hubungi Admin kalau menurut Anda ini
          seharusnya bisa diakses.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
