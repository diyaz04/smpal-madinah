import { type ReactNode, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, Inbox } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableEmptyState {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  getRowId: (row: T) => string;

  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string) => void;

  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;

  toolbarExtra?: ReactNode;
  emptyState?: DataTableEmptyState;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  getRowId,
  search,
  onSearchChange,
  searchPlaceholder = "Cari...",
  sortKey,
  sortDirection,
  onSortChange,
  page,
  hasNext,
  onPageChange,
  toolbarExtra,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState(search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  useEffect(() => {
    if (onSearchChange && debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const showEmpty = !isLoading && data.length === 0;

  return (
    <div className="space-y-3">
      {(onSearchChange || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-2">
          {onSearchChange && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}
          {toolbarExtra}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading &&
              data.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {emptyState?.icon ?? <Inbox className="h-5 w-5" />}
                    </div>
                    <p className="font-medium text-foreground">
                      {emptyState?.title ?? "Belum ada data"}
                    </p>
                    {emptyState?.description && (
                      <p className="text-sm text-muted-foreground">{emptyState.description}</p>
                    )}
                    {emptyState?.action}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Halaman {page}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Berikutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
