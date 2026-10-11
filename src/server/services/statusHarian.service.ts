import { and, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { agenda, absensi, absensiHarian, siswaKelas } from "../db/schema";
import { generateId } from "../lib/id";
import type { AbsensiPertemuanStatus, AbsensiHarianStatus } from "../../shared/constants";
import { computeStatusHarian, type StatusHarianEntry } from "../../shared/statusHarian";

export { computeStatusHarian, type StatusHarianEntry } from "../../shared/statusHarian";

/**
 * Hitung ulang & simpan absensi_harian untuk sekumpulan siswa pada satu
 * tanggal, dibatasi ke beberapa query + satu db.batch() terlepas dari
 * jumlah siswa — dipakai submitAgenda() (satu rombel penuh) maupun
 * penyesuaian izin harian (satu siswa, dipanggil per tanggal terdampak).
 * Siswa yang baris absensi_harian-nya bersumber "koreksi_wali" DILEWATI
 * (tidak ditimpa).
 */
async function recomputeStatusHarianCore(
  db: Database,
  rombelId: string,
  siswaIds: string[],
  tanggal: string,
  periodId: string,
): Promise<void> {
  if (siswaIds.length === 0) return;

  const agendaRows = await db
    .select({ id: agenda.id, jumlahJp: agenda.jumlah_jp })
    .from(agenda)
    .where(and(eq(agenda.rombel_id, rombelId), eq(agenda.tanggal, tanggal), eq(agenda.status, "terisi")));
  const agendaIds = agendaRows.map((a) => a.id);

  const absensiRows =
    agendaIds.length > 0
      ? await db
          .select({ agendaId: absensi.agenda_id, siswaId: absensi.siswa_id, status: absensi.status })
          .from(absensi)
          .where(sql`${absensi.agenda_id} IN ${agendaIds}`)
      : [];

  const existingRows = await db
    .select({ id: absensiHarian.id, siswaId: absensiHarian.siswa_id, sumber: absensiHarian.sumber })
    .from(absensiHarian)
    .where(and(sql`${absensiHarian.siswa_id} IN ${siswaIds}`, eq(absensiHarian.tanggal, tanggal)));
  const existingBySiswa = new Map(existingRows.map((r) => [r.siswaId, r]));

  const now = new Date().toISOString();
  type PendingOp =
    | { kind: "delete"; id: string }
    | { kind: "update"; id: string; status: AbsensiHarianStatus }
    | { kind: "insert"; siswaId: string; status: AbsensiHarianStatus };
  const pending: PendingOp[] = [];

  for (const siswaId of siswaIds) {
    const existing = existingBySiswa.get(siswaId);
    if (existing?.sumber === "koreksi_wali") continue;

    const entries: StatusHarianEntry[] = agendaRows.map((a) => ({
      jumlahJp: a.jumlahJp,
      status:
        (absensiRows.find((r) => r.agendaId === a.id && r.siswaId === siswaId)?.status as
          | AbsensiPertemuanStatus
          | undefined) ?? null,
    }));
    const computed = agendaRows.length > 0 ? computeStatusHarian(entries) : "H";

    if (computed === "H") {
      if (existing) pending.push({ kind: "delete", id: existing.id });
    } else if (existing) {
      pending.push({ kind: "update", id: existing.id, status: computed });
    } else {
      pending.push({ kind: "insert", siswaId, status: computed });
    }
  }

  if (pending.length === 0) return;

  const statements = pending.map((op) => {
    if (op.kind === "delete") return db.delete(absensiHarian).where(eq(absensiHarian.id, op.id));
    if (op.kind === "update") {
      return db
        .update(absensiHarian)
        .set({ status: op.status, sumber: "otomatis", updated_at: now })
        .where(eq(absensiHarian.id, op.id));
    }
    return db.insert(absensiHarian).values({
      id: generateId(),
      siswa_id: op.siswaId,
      rombel_id: rombelId,
      period_id: periodId,
      tanggal,
      status: op.status,
      sumber: "otomatis",
      created_at: now,
      updated_at: now,
    });
  });
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
}

/** Dipakai submitAgenda(): hitung ulang status harian SEMUA siswa di satu rombel untuk satu tanggal. */
export async function recomputeStatusHarianRombel(
  db: Database,
  rombelId: string,
  tanggal: string,
  periodId: string,
): Promise<void> {
  const siswaRows = await db
    .select({ siswaId: siswaKelas.siswa_id })
    .from(siswaKelas)
    .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)));
  await recomputeStatusHarianCore(db, rombelId, siswaRows.map((s) => s.siswaId), tanggal, periodId);
}

/** Dipakai penyesuaian izin harian: hitung ulang status harian SATU siswa untuk satu tanggal. */
export async function recomputeStatusHarianSiswa(
  db: Database,
  siswaId: string,
  tanggal: string,
  periodId: string,
): Promise<void> {
  const row = await db.query.siswaKelas.findFirst({
    where: and(eq(siswaKelas.siswa_id, siswaId), eq(siswaKelas.period_id, periodId)),
  });
  if (!row) return;
  await recomputeStatusHarianCore(db, row.rombel_id, [siswaId], tanggal, periodId);
}
