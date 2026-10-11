import { useState } from "react";
import { Loader2, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePairDevice } from "@/hooks/useKiosk";
import { ApiError } from "@/lib/api";

export function KioskPairingForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pair = usePairDevice();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    pair.mutate(code, {
      onError: (err) => setError(err instanceof ApiError ? err.message : "Gagal memasangkan perangkat."),
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-6 text-center">
      <Tablet className="h-16 w-16 text-primary" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pasangkan Perangkat</h1>
        <p className="mt-1 text-muted-foreground">Masukkan kode 6 digit dari Admin</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-center gap-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          className="h-16 text-center text-3xl tracking-[0.5em]"
          maxLength={6}
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={code.length !== 6 || pair.isPending}>
          {pair.isPending && <Loader2 className="animate-spin" />}
          Pasangkan
        </Button>
      </form>
    </div>
  );
}
