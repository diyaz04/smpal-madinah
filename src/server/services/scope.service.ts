import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { pembagianTugas, rombel } from "../db/schema";
import type { AuthUser } from "../../shared/types";
import type { PermissionScope } from "../../shared/constants";

/**
 * Cakupan rombel seorang guru untuk satu periode: gabungan rombel yang dia
 * ajar (dari pembagian_tugas) ∪ rombel yang dia walikan (rombel.wali_guru_id).
 * Guru + Wali Kelas scope "milik_sendiri" dihitung dari sini — kalau user
 * punya beberapa role, tidak perlu union per-role karena guru_id satu per
 * user dan baris pembagian_tugas/rombel yang dipunyainya sudah mencakup
 * semua penugasannya apa pun rolenya.
 */
export async function getScopedRombelIds(
  db: Database,
  guruId: string,
  periodId: string,
): Promise<string[]> {
  const [taughtRows, waliRows] = await Promise.all([
    db
      .select({ rombelId: pembagianTugas.rombel_id })
      .from(pembagianTugas)
      .where(and(eq(pembagianTugas.guru_id, guruId), eq(pembagianTugas.period_id, periodId))),
    db
      .select({ id: rombel.id })
      .from(rombel)
      .where(and(eq(rombel.wali_guru_id, guruId), eq(rombel.period_id, periodId))),
  ]);

  const set = new Set<string>();
  for (const r of taughtRows) set.add(r.rombelId);
  for (const r of waliRows) set.add(r.id);
  return [...set];
}

/**
 * Dipakai di endpoint list/detail siswa & jadwal: kembalikan `null` kalau
 * scope "semua" (tanpa batasan), atau daftar rombel_id yang boleh diakses
 * kalau scope "milik_sendiri" (array kosong = tidak ada akses sama sekali).
 */
export async function resolveScopedRombelIds(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
): Promise<string[] | null> {
  if (scope === "semua") return null;
  if (!user.guruId) return [];
  return getScopedRombelIds(db, user.guruId, periodId);
}

/**
 * Tolak (403) kalau rombelId siswa yang diakses di luar cakupan user.
 * Dipanggil di endpoint detail siswa setelah tahu rombel_id siswa tsb.
 */
export function assertRombelInScope(scopedRombelIds: string[] | null, rombelId: string | null): void {
  if (scopedRombelIds === null) return; // scope "semua"
  if (!rombelId || !scopedRombelIds.includes(rombelId)) {
    throw new HTTPException(403, { message: "Anda tidak punya akses ke data siswa ini." });
  }
}
