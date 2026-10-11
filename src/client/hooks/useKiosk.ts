import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "./useSession";

export interface KioskKonteks {
  tanggal: string;
  jam: string;
  namaSekolah: string;
  logoUrl: string | null;
  guruPiketHariIni: string[];
}

export function useKioskKonteks(enabled: boolean) {
  return useQuery({
    queryKey: ["kiosk", "konteks"],
    queryFn: () => api.get<{ item: KioskKonteks }>("/kiosk/konteks"),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function usePairDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<{ nama: string; lokasi: string | null }>("/kiosk/pair", { code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}
