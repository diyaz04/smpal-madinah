import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRaportPreviewQuery } from "@/hooks/useMapel";

interface RaportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaportPreviewDialog({ open, onOpenChange }: RaportPreviewDialogProps) {
  const { data, isLoading } = useRaportPreviewQuery();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pratinjau Struktur Raport</DialogTitle>
          <DialogDescription>
            Urutan dan pengelompokan mapel yang akan tampil di raport siswa.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (data?.groups.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada mapel yang ditandai tampil di raport.
          </p>
        ) : (
          <ol className="space-y-3">
            {data?.groups.map((group, i) => (
              <li key={group.induk?.id ?? group.anak[0]!.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{i + 1}.</span>
                  <span className="font-medium text-foreground">
                    {group.induk ? group.induk.nama : group.anak[0]!.nama}
                  </span>
                  {!group.induk && <Badge variant="outline">{group.anak[0]!.kodeJadwal}</Badge>}
                </div>
                {group.induk && (
                  <ul className="mt-2 ml-6 space-y-1">
                    {group.anak.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>— {a.nama}</span>
                        <Badge variant="outline">{a.kodeJadwal}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
