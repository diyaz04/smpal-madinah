import { and, eq, sql, lt, or, desc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { izinHarianSiswa, siswa, siswaKelas, agenda, absensi } from "../db/schema";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { getHariFromTanggal } from "../../shared/tanggal";
import { recomputeStatusHarianSiswa } from "./statusHarian.service";
import { getPertemuanUntukTanggal } from "./pertemuan.service";
import { upsertRekapHarianRombel } from "./agenda.service";
import type { CreateIzinSiswaInput, UpdateIzinSiswaInput } from "../../shared/schemas/izinSiswa.schema";
import type { IzinHarianSiswaItem, CursorPaginatedResult } from "../../shared/types";
import type { IzinStatus } from "../../shared/constants";

export interface IzinSiswaQuery {
  cursor?: string;
  limit?: number;
  siswaId?: string;
  rombelId?: string;
}

export async function listIzinSiswa(
  db: Database,
  query: IzinSiswaQuery,
  periodId: string,
  scopedRombelIds: string[] | null,
): Promise<CursorPaginatedResult<IzinHarianSiswaItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions = [sql`${izinHarianSiswa.deleted_at} IS NULL`];

  if (query.siswaId) {
    conditions.push(eq(izinHarianSiswa.siswa_id, query.siswaId));
  } else {
    const rombelFilter = query.rombelId ? [query.rombelId] : scopedRombelIds;
    if (rombelFilter !== null) {
      if (rombelFilter.length === 0) return { items: [], nextCursor: null };
      const siswaRows = await db
        .select({ siswaId: siswaKelas.siswa_id })
        .from(siswaKelas)
        .where(and(sql`${siswaKelas.rombel_id} IN ${rombelFilter}`, eq(siswaKelas.period_id, periodId)));
      const siswaIds = siswaRows.map((r) => r.siswaId);
      if (siswaIds.length === 0) return { items: [], nextCursor: null };
      conditions.push(sql`${izinHarianSiswa.siswa_id} IN ${siswaIds}`);
    }
  }

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(izinHarianSiswa.created_at, decoded.createdAt),
          and(eq(izinHarianSiswa.created_at, decoded.createdAt), lt(izinHarianSiswa.id, decoded.id)),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: izinHarianSiswa.id,
      created_at: izinHarianSiswa.created_at,
      siswaId: izinHarianSiswa.siswa_id,
      tanggalMulai: izinHarianSiswa.tanggal_mulai,
      tanggalSelesai: izinHarianSiswa.tanggal_selesai,
      status: izinHarianSiswa.status,
      keterangan: izinHarianSiswa.keterangan,
      lampiranFileId: izinHarianSiswa.lampiran_file_id,
      dibuatOleh: izinHarianSiswa.dibuat_oleh,
    })
    .from(izinHarianSiswa)
    .where(and(...conditions))
    .orderBy(desc(izinHarianSiswa.created_at), desc(izinHarianSiswa.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(rows, limit);

  const siswaIds = [...new Set(items.map((r) => r.siswaId))];
  const siswaRows = siswaIds.length
    ? await db.select({ id: siswa.id, nama: siswa.nama_lengkap }).from(siswa).where(sql`${siswa.id} IN ${siswaIds}`)
    : [];
  const siswaNamaById = new Map(siswaRows.map((s) => [s.id, s.nama]));

  return {
    nextCursor,
    items: items.map((r) => ({
      id: r.id,
      siswaId: r.siswaId,
      siswaNama: siswaNamaById.get(r.siswaId) ?? "—",
      tanggalMulai: r.tanggalMulai,
      tanggalSelesai: r.tanggalSelesai,
      status: r.status,
      keterangan: r.keterangan,
      lampiranFileId: r.lampiranFileId,
      dibuatOleh: r.dibuatOleh,
    })),
  };
}

export async function createIzinSiswa(
  db: Database,
  input: CreateIzinSiswaInput,
  actorUserId: string,
): Promise<{ id: string }> {
  const siswaRow = await db.query.siswa.findFirst({ where: eq(siswa.id, input.siswaId) });
  if (!siswaRow) throw new HTTPException(404, { message: "Siswa tidak ditemukan." });

  const id = generateId();
  const now = new Date().toISOString();
  await db.insert(izinHarianSiswa).values({
    id,
    siswa_id: input.siswaId,
    tanggal_mulai: input.tanggalMulai,
    tanggal_selesai: input.tanggalSelesai,
    status: input.status,
    keterangan: nullIfEmpty(input.keterangan),
    lampiran_file_id: input.lampiranFileId,
    dibuat_oleh: actorUserId,
    created_at: now,
    updated_at: now,
  });

  await sesuaikanAgendaTerisi(db, input.siswaId, input.tanggalMulai, input.tanggalSelesai, input.status);

  return { id };
}

export async function updateIzinSiswa(db: Database, id: string, input: UpdateIzinSiswaInput): Promise<void> {
  const existing = await db.query.izinHarianSiswa.findFirst({
    where: and(eq(izinHarianSiswa.id, id), sql`${izinHarianSiswa.deleted_at} IS NULL`),
  });
  if (!existing) throw new HTTPException(404, { message: "Data izin tidak ditemukan." });

  await db
    .update(izinHarianSiswa)
    .set({
      tanggal_mulai: input.tanggalMulai,
      tanggal_selesai: input.tanggalSelesai,
      status: input.status,
      keterangan: nullIfEmpty(input.keterangan),
      lampiran_file_id: input.lampiranFileId,
      updated_at: new Date().toISOString(),
    })
    .where(eq(izinHarianSiswa.id, id));

  await sesuaikanAgendaTerisi(db, existing.siswa_id, input.tanggalMulai, input.tanggalSelesai, input.status);
}

/**
 * Timpa absensi di agenda yang SUDAH terisi dalam rentang izin (izin diinput
 * mundur). Pertemuan yang belum diisi tidak disentuh di sini — guru akan
 * melihat prefill dari izin_harian_siswa langsung saat mengisi nanti lewat
 * getAgendaFormContext().
 */
async function sesuaikanAgendaTerisi(
  db: Database,
  siswaId: string,
  tanggalMulai: string,
  tanggalSelesai: string,
  status: IzinStatus,
): Promise<number> {
  const keanggotaan = await db.query.siswaKelas.findMany({ where: eq(siswaKelas.siswa_id, siswaId) });
  if (keanggotaan.length === 0) return 0;
  const rombelIds = [...new Set(keanggotaan.map((k) => k.rombel_id))];

  const agendaRows = await db
    .select({ id: agenda.id, tanggal: agenda.tanggal, periodId: agenda.period_id, rombelId: agenda.rombel_id })
    .from(agenda)
    .where(
      and(
        sql`${agenda.rombel_id} IN ${rombelIds}`,
        sql`${agenda.tanggal} >= ${tanggalMulai}`,
        sql`${agenda.tanggal} <= ${tanggalSelesai}`,
        eq(agenda.status, "terisi"),
      ),
    );
  if (agendaRows.length === 0) return 0;

  const agendaIds = agendaRows.map((a) => a.id);
  const existingAbsensi = await db
    .select({ id: absensi.id, agendaId: absensi.agenda_id })
    .from(absensi)
    .where(and(sql`${absensi.agenda_id} IN ${agendaIds}`, eq(absensi.siswa_id, siswaId)));
  const existingByAgenda = new Map(existingAbsensi.map((a) => [a.agendaId, a.id]));

  const statements = agendaRows.map((a) => {
    const existingId = existingByAgenda.get(a.id);
    return existingId
      ? db.update(absensi).set({ status, keterangan: "Izin harian" }).where(eq(absensi.id, existingId))
      : db.insert(absensi).values({ id: generateId(), agenda_id: a.id, siswa_id: siswaId, status, keterangan: "Izin harian" });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  const affectedPairs = new Map(agendaRows.map((a) => [`${a.rombelId}|${a.tanggal}`, a]));
  for (const { rombelId, tanggal, periodId } of affectedPairs.values()) {
    await recomputeStatusHarianSiswa(db, siswaId, tanggal, periodId);

    const hari = getHariFromTanggal(tanggal);
    const jpTerjadwal = hari
      ? (await getPertemuanUntukTanggal(db, periodId, hari, { rombelId }))[0]?.pertemuan.length ?? 0
      : 0;
    await upsertRekapHarianRombel(db, rombelId, tanggal, periodId, jpTerjadwal);
  }

  return agendaIds.length;
}
