import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api";
import { enqueuePresensi } from "@/lib/offlineQueue";
import { flushQueue } from "@/lib/offlineQueue";

export interface DescriptorAktif {
  guruId: string;
  descriptor: number[];
}

export function useWajahDescriptors() {
  return useQuery({
    queryKey: ["kiosk", "wajah-descriptors"],
    queryFn: () => api.get<{ items: DescriptorAktif[] }>("/kiosk/wajah-descriptors"),
    staleTime: 30 * 60 * 1000,
  });
}

export interface DaftarGuruItem {
  id: string;
  nama: string;
  fotoUrl: string | null;
}

export function useDaftarGuru() {
  return useQuery({
    queryKey: ["kiosk", "daftar-guru"],
    queryFn: () => api.get<{ items: DaftarGuruItem[] }>("/kiosk/daftar-guru"),
    staleTime: 30 * 60 * 1000,
  });
}

export function useUploadPresensiFoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/kiosk/presensi/foto", { method: "POST", credentials: "include", body: formData });
      const body = (await res.json()) as { fileId?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah foto.");
      return body as { fileId: string };
    },
  });
}

export interface SubmitPresensiWajahPayload {
  guruId: string;
  jenis: "datang" | "pulang";
  fotoFileId: string;
  skorKemiripan: number;
  livenessLolos: boolean;
  embeddingUntukBelajar: string | null;
}

export function useSubmitPresensiWajah() {
  return useMutation({
    mutationFn: async (payload: SubmitPresensiWajahPayload) => {
      try {
        return await api.post<{ id: string }>("/kiosk/presensi/wajah", {
          ...payload,
          sumber: "langsung",
          waktuPerangkat: null,
        });
      } catch (err) {
        if (!navigator.onLine) {
          await enqueuePresensi({
            id: crypto.randomUUID(),
            endpoint: "/api/kiosk/presensi/wajah",
            payload: { ...payload },
            waktuPerangkat: new Date().toISOString(),
          });
          return { id: "offline", queued: true as const };
        }
        throw err;
      }
    },
  });
}

export interface SubmitPresensiPinPayload {
  guruId: string;
  jenis: "datang" | "pulang";
  pin: string;
  fotoFileId: string;
}

export function useSubmitPresensiPin() {
  return useMutation({
    mutationFn: async (payload: SubmitPresensiPinPayload) => {
      try {
        return await api.post<{ id: string }>("/kiosk/presensi/pin", {
          ...payload,
          sumber: "langsung",
          waktuPerangkat: null,
        });
      } catch (err) {
        if (!navigator.onLine && !(err instanceof ApiError)) {
          await enqueuePresensi({
            id: crypto.randomUUID(),
            endpoint: "/api/kiosk/presensi/pin",
            payload: { ...payload },
            waktuPerangkat: new Date().toISOString(),
          });
          return { id: "offline", queued: true as const };
        }
        throw err;
      }
    },
  });
}

/** Kirim ulang antrean offline saat koneksi kembali, lalu berkala tiap 2 menit. */
export function useOfflineQueueFlush() {
  const [lastFlush, setLastFlush] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    async function run() {
      if (!navigator.onLine) return;
      const result = await flushQueue();
      if (result.sent > 0) setLastFlush(result);
    }
    void run();
    window.addEventListener("online", run);
    const interval = setInterval(run, 2 * 60 * 1000);
    return () => {
      window.removeEventListener("online", run);
      clearInterval(interval);
    };
  }, []);

  return lastFlush;
}
