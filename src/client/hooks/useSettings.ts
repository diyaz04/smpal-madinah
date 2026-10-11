import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "./useSession";
import type { UpdateSettingsInput, SchoolProfile } from "@shared/schemas/settings.schema";

export interface SettingsResponse {
  schoolProfile: SchoolProfile;
  defaultPrimaryColor: string;
  logoUrl: string | null;
  kopUrl: string | null;
}

const settingsQueryKey = ["settings"] as const;

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => api.get<SettingsResponse>("/settings"),
  });
}

function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: settingsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["public", "branding"] });
    queryClient.invalidateQueries({ queryKey: meQueryKey });
  };
}

export function useUpdateSettings() {
  const invalidate = useInvalidateSettings();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => api.put<{ ok: true }>("/settings", input),
    onSuccess: invalidate,
  });
}

async function uploadFileRequest(path: string, file: File): Promise<{ fileId: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api${path}`, { method: "POST", credentials: "include", body: formData });
  const body = (await res.json()) as { fileId?: string; url?: string; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah file.");
  return body as { fileId: string; url: string };
}

export function useUploadLogo() {
  const invalidate = useInvalidateSettings();
  return useMutation({
    mutationFn: (file: File) => uploadFileRequest("/settings/logo", file),
    onSuccess: invalidate,
  });
}

export function useUploadLetterhead() {
  const invalidate = useInvalidateSettings();
  return useMutation({
    mutationFn: (file: File) => uploadFileRequest("/settings/letterhead", file),
    onSuccess: invalidate,
  });
}
