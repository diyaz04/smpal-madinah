import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  MatchImportRequest,
  SaveGuruAliasBulkInput,
  CommitImportInput,
} from "@shared/schemas/jadwalImport.schema";
import type { JadwalImportMatchResult, JadwalImportWarning } from "@shared/types";

export function useMatchImport() {
  return useMutation({
    mutationFn: (input: MatchImportRequest) =>
      api.post<JadwalImportMatchResult>("/jadwal-import/match", input),
  });
}

export function useSaveGuruAliasBulk() {
  return useMutation({
    mutationFn: (input: SaveGuruAliasBulkInput) => api.post<{ ok: true }>("/jadwal-import/save-alias", input),
  });
}

export function useCommitImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommitImportInput) =>
      api.post<{ versiId: string; slotCount: number; isiCount: number; warnings: JadwalImportWarning[] }>(
        "/jadwal-import/commit",
        input,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jadwal"] }),
  });
}
