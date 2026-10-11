import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  ActivityLogListItem,
  ActivityLogDetail,
  ActivityLogArchiveItem,
  CursorPaginatedResult,
} from "@shared/types";

export interface ActivityLogFilters {
  userId?: string;
  moduleKey?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useActivityLogsQuery(cursor: string | null, filters: ActivityLogFilters) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.moduleKey) params.set("moduleKey", filters.moduleKey);
  if (filters.action) params.set("action", filters.action);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  return useQuery({
    queryKey: ["activity-logs", "list", cursor, filters],
    queryFn: () =>
      api.get<CursorPaginatedResult<ActivityLogListItem>>(`/activity-logs?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useActivityLogDetail(id: string | null) {
  return useQuery({
    queryKey: ["activity-logs", "detail", id],
    queryFn: () => api.get<{ log: ActivityLogDetail }>(`/activity-logs/${id}`),
    enabled: !!id,
  });
}

export function useActivityLogArchives() {
  return useQuery({
    queryKey: ["activity-logs", "archives"],
    queryFn: () => api.get<{ archives: ActivityLogArchiveItem[] }>("/activity-logs/archives"),
  });
}
