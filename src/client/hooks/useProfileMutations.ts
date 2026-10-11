import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "./useSession";
import type { ThemeInput, UpdateProfileInput } from "@shared/schemas/profile.schema";
import type { AuthUser } from "@shared/types";

function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: meQueryKey });
}

export function useUpdateTheme() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: ThemeInput) =>
      api.put<{ ok: true; primaryColor: string }>("/profile/theme", input),
    onSuccess: invalidate,
  });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.put<{ user: AuthUser }>("/profile", input),
    onSuccess: invalidate,
  });
}

export function useUploadProfilePhoto() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await res.json()) as { fileId?: string; url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal mengunggah foto.");
      return body as { fileId: string; url: string };
    },
    onSuccess: invalidate,
  });
}
