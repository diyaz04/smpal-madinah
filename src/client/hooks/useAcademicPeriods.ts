import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { meQueryKey } from "./useSession";
import type {
  CreateAcademicPeriodInput,
  UpdateAcademicPeriodInput,
} from "@shared/schemas/academicPeriod.schema";
import type { AcademicPeriodListItem } from "@shared/types";

const periodsQueryKey = ["academic-periods"] as const;

export function useAcademicPeriodsQuery() {
  return useQuery({
    queryKey: periodsQueryKey,
    queryFn: () => api.get<{ periods: AcademicPeriodListItem[] }>("/academic-periods"),
  });
}

function useInvalidatePeriods() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: periodsQueryKey });
    queryClient.invalidateQueries({ queryKey: meQueryKey });
  };
}

export function useCreateAcademicPeriod() {
  const invalidate = useInvalidatePeriods();
  return useMutation({
    mutationFn: (input: CreateAcademicPeriodInput) =>
      api.post<{ period: AcademicPeriodListItem }>("/academic-periods", input),
    onSuccess: invalidate,
  });
}

export function useUpdateAcademicPeriod(id: string) {
  const invalidate = useInvalidatePeriods();
  return useMutation({
    mutationFn: (input: UpdateAcademicPeriodInput) =>
      api.put<{ period: AcademicPeriodListItem }>(`/academic-periods/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAcademicPeriod() {
  const invalidate = useInvalidatePeriods();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/academic-periods/${id}`),
    onSuccess: invalidate,
  });
}

export function useActivateAcademicPeriod() {
  const invalidate = useInvalidatePeriods();
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: true }>(`/academic-periods/${id}/activate`),
    onSuccess: invalidate,
  });
}
