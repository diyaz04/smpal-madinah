import type { OffsetPaginatedResult, CursorPaginatedResult } from "../../shared/types";

export type { OffsetPaginatedResult, CursorPaginatedResult } from "../../shared/types";

export interface OffsetPaginationParams {
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizeOffset(params: OffsetPaginationParams) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize, limit: pageSize + 1, offset: (page - 1) * pageSize };
}

/**
 * Paginasi nomor halaman biasa, untuk tabel kecil-menengah (user, role, tahun
 * ajaran). Mengambil pageSize+1 baris untuk tahu ada halaman berikutnya atau
 * tidak, tanpa perlu `COUNT(*)` penuh (hemat baca D1).
 */
export async function paginate<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  params: OffsetPaginationParams,
): Promise<OffsetPaginatedResult<T>> {
  const { page, pageSize, limit, offset } = normalizeOffset(params);
  const rows = await fetchPage(limit, offset);
  const hasNext = rows.length > pageSize;
  return { items: hasNext ? rows.slice(0, pageSize) : rows, page, pageSize, hasNext };
}

export interface CursorPaginationParams {
  cursor?: string | null;
  limit?: number;
}

const DEFAULT_CURSOR_LIMIT = 20;
const MAX_CURSOR_LIMIT = 100;

// Base64url manual (bukan Buffer — tidak tersedia di Workers runtime tanpa
// nodejs_compat). Memakai TextEncoder/btoa yang sama-sama tersedia di Workers.
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeCursor(createdAt: string, id: string): string {
  return toBase64Url(new TextEncoder().encode(`${createdAt}|${id}`));
}

export function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(cursor));
    const sep = decoded.lastIndexOf("|");
    if (sep === -1) return null;
    return { createdAt: decoded.slice(0, sep), id: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

/**
 * Paginasi keyset (created_at, id) untuk tabel besar yang terus bertambah
 * (Log Aktivitas, dan nanti absensi/agenda/presensi) — tidak memakai OFFSET
 * supaya tidak ikut membaca baris yang dilewati.
 */
export function normalizeCursorLimit(limit?: number): number {
  return Math.min(MAX_CURSOR_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_CURSOR_LIMIT)));
}

export function buildCursorResult<T extends { created_at: string; id: string }>(
  rows: T[],
  limit: number,
): CursorPaginatedResult<T> {
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasNext && last ? encodeCursor(last.created_at, last.id) : null,
  };
}
