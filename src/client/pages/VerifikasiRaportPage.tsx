import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";

import { useVerifikasiRaportQuery } from "@/hooks/useVerifikasiRaport";

export function VerifikasiRaportPage() {
  const { kode } = useParams<{ kode: string }>();
  const { data, isLoading } = useVerifikasiRaportQuery(kode ?? null);
  const item = data?.item;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Verifikasi Raport</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : item ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Raport resmi terdaftar di SMP Al-Madinah.</p>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nama</dt>
                <dd className="font-medium text-foreground">{item.namaSiswa}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">NISN</dt>
                <dd className="font-medium text-foreground">{item.nisnSamar}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kelas</dt>
                <dd className="font-medium text-foreground">{item.rombelNama}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Semester</dt>
                <dd className="font-medium text-foreground">
                  {item.semesterLabel} {item.tahunAjaran}
                </dd>
              </div>
              {item.tanggalRaport && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tanggal Raport</dt>
                  <dd className="font-medium text-foreground">{item.tanggalRaport}</dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Kode tidak terdaftar. Raport ini tidak dapat diverifikasi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
