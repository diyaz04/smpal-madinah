import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { GeneratePairingCodeInput } from "@shared/schemas/kiosk.schema";

export interface KioskDeviceItem {
  id: string;
  nama: string;
  lokasi: string | null;
  status: "aktif" | "dicabut";
  pairedAt: string;
  lastActiveAt: string | null;
}

export function useKioskDevices() {
  return useQuery({
    queryKey: ["kiosk-devices"],
    queryFn: () => api.get<{ items: KioskDeviceItem[] }>("/kiosk-devices"),
  });
}

function useInvalidateKioskDevices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["kiosk-devices"] });
}

export function useGeneratePairingCode() {
  const invalidate = useInvalidateKioskDevices();
  return useMutation({
    mutationFn: (input: GeneratePairingCodeInput) =>
      api.post<{ code: string; expiresAt: string }>("/kiosk-devices/pairing-code", input),
    onSuccess: invalidate,
  });
}

export function useRevokeKioskDevice() {
  const invalidate = useInvalidateKioskDevices();
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: true }>(`/kiosk-devices/${id}/cabut`, {}),
    onSuccess: invalidate,
  });
}
