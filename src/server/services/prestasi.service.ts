import { and, desc, eq, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { prestasi, siswa, siswaKelas, rombel, academicPeriods } from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import { buildJudulRaportDefault, buildKeteranganRaportDefault } from "../../shared/prestasi";
import { SEMESTER_LABELS, MAKS_PRESTASI_RAPORT, PRESTASI_TINGKAT_URUTAN } from "../../shared/constants";
import type { CreatePrestasiInput, UpdatePrestasiInput } from "../../shared/schemas/prestasi.schema";
import type { PrestasiItem, PrestasiRaportItem, CursorPaginatedResult } from "../../shared/types";
import type { PrestasiBidang, PrestasiTingkat } from "../../shared/constants";

export interface PrestasiQuery {
  cursor?: string;
  limit?: number;
  periodId?: string;
  tingkat?: PrestasiTingkat;
  bidang?: PrestasiBidang;
  rombelId?: string;
  siswaId?: string;
}

function toItem(
  row: typeof prestasi.$inferSelect,
  siswaNama: string,
  rombelNama: string | null,
): PrestasiItem {
  return {
    id: row.id,
    siswaId: row.siswa_id,
    siswaNama,
    rombelId: row.rombel_id,
    rombelNama,
    namaKegiatan: row.nama_kegiatan,
    bidang: row.bidang,
    tingkat: row.tingkat,
    capaian: row.capaian,
    jenis: row.jenis,
    penyelenggara: row.penyelenggara,
    tanggal: row.tanggal,
    keterangan: row.keterangan,
    sertifikatFileId: row.sertifikat_file_id,
    tampilDiRaport: row.tampil_di_raport,
    judulRaport: row.judul_raport,
    keteranganRaport: row.keterangan_raport,
    dicatatOleh: row.dicatat_oleh,
    createdAt: row.created_at,
  };
}

export async function listPrestasi(
  db: Database,
  query: PrestasiQuery,
): Promise<CursorPaginatedResult<PrestasiItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions: SQL[] = [isNull(prestasi.deleted_at)];

  if (query.siswaId) conditions.push(eq(prestasi.siswa_id, query.siswaId));
  if (query.periodId) conditions.push(eq(prestasi.period_id, query.periodId));
  if (query.tingkat) conditions.push(eq(prestasi.tingkat, query.tingkat));
  if (query.bidang) conditions.push(eq(prestasi.bidang, query.bidang));
  if (query.rombelId) conditions.push(eq(prestasi.rombel_id, query.rombelId));

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(prestasi.created_at, decoded.createdAt),
          and(eq(prestasi.created_at, decoded.createdAt), lt(prestasi.id, decoded.id)),
        )!,
      );
    }
  }

  const rows = await db
    .select()
    .from(prestasi)
    .where(and(...conditions))
    .orderBy(desc(prestasi.created_at), desc(prestasi.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(rows, limit);
  if (items.length === 0) return { items: [], nextCursor };

  const siswaIds = [...new Set(items.map((r) => r.siswa_id))];
  const rombelIds = [...new Set(items.map((r) => r.rombel_id).filter((v): v is string => !!v))];
  const [siswaRows, rombelRows] = await Promise.all([
    db.select({ id: siswa.id, nama: siswa.nama_lengkap }).from(siswa).where(sql`${siswa.id} IN ${siswaIds}`),
    rombelIds.length
      ? db.select({ id: rombel.id, nama: rombel.nama }).from(rombel).where(sql`${rombel.id} IN ${rombelIds}`)
      : Promise.resolve([]),
  ]);
  const siswaNamaById = new Map(siswaRows.map((s) => [s.id, s.nama]));
  const rombelNamaById = new Map(rombelRows.map((r) => [r.id, r.nama]));

  return {
    nextCursor,
    items: items.map((r) =>
      toItem(r, siswaNamaById.get(r.siswa_id) ?? "—", r.rombel_id ? rombelNamaById.get(r.rombel_id) ?? null : null),
    ),
  };
}

export async function createPrestasi(
  db: Database,
  input: CreatePrestasiInput,
  periodId: string,
  actorUserId: string,
): Promise<{ count: number }> {
  const periode = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) });
  if (!periode) throw new HTTPException(400, { message: "Periode tidak ditemukan." });

  const siswaIds = [...new Set(input.siswaIds)];
  const siswaRows = await db
    .select({ id: siswa.id })
    .from(siswa)
    .where(and(sql`${siswa.id} IN ${siswaIds}`, isNull(siswa.deleted_at)));
  if (siswaRows.length !== siswaIds.length) {
    throw new HTTPException(400, { message: "Salah satu siswa tidak ditemukan." });
  }

  const kelasRows = await db
    .select({ siswaId: siswaKelas.siswa_id, rombelId: siswaKelas.rombel_id })
    .from(siswaKelas)
    .where(and(sql`${siswaKelas.siswa_id} IN ${siswaIds}`, eq(siswaKelas.period_id, periodId)));
  const rombelBySiswa = new Map(kelasRows.map((k) => [k.siswaId, k.rombelId]));

  const judulRaport = nullIfEmpty(input.judulRaport) ?? buildJudulRaportDefault(input.capaian, input.namaKegiatan, input.tingkat);
  const keteranganRaport =
    nullIfEmpty(input.keteranganRaport) ??
    buildKeteranganRaportDefault(nullIfEmpty(input.penyelenggara), SEMESTER_LABELS[periode.semester], periode.year_label);

  const now = new Date().toISOString();
  const statements = siswaIds.map((siswaId) =>
    db.insert(prestasi).values({
      id: generateId(),
      period_id: periodId,
      siswa_id: siswaId,
      rombel_id: rombelBySiswa.get(siswaId) ?? null,
      nama_kegiatan: input.namaKegiatan,
      bidang: input.bidang,
      tingkat: input.tingkat,
      capaian: input.capaian,
      jenis: input.jenis,
      penyelenggara: nullIfEmpty(input.penyelenggara),
      tanggal: input.tanggal,
      keterangan: nullIfEmpty(input.keterangan),
      sertifikat_file_id: input.sertifikatFileId,
      tampil_di_raport: input.tampilDiRaport,
      judul_raport: judulRaport,
      keterangan_raport: keteranganRaport,
      dicatat_oleh: actorUserId,
      created_at: now,
      updated_at: now,
    }),
  );

  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  return { count: siswaIds.length };
}

export async function updatePrestasi(db: Database, id: string, input: UpdatePrestasiInput): Promise<void> {
  const existing = await db.query.prestasi.findFirst({ where: and(eq(prestasi.id, id), isNull(prestasi.deleted_at)) });
  if (!existing) throw new HTTPException(404, { message: "Prestasi tidak ditemukan." });

  await db
    .update(prestasi)
    .set({
      nama_kegiatan: input.namaKegiatan,
      bidang: input.bidang,
      tingkat: input.tingkat,
      capaian: input.capaian,
      jenis: input.jenis,
      penyelenggara: nullIfEmpty(input.penyelenggara),
      tanggal: input.tanggal,
      keterangan: nullIfEmpty(input.keterangan),
      sertifikat_file_id: input.sertifikatFileId,
      tampil_di_raport: input.tampilDiRaport,
      judul_raport: input.judulRaport,
      keterangan_raport: input.keteranganRaport,
      updated_at: new Date().toISOString(),
    })
    .where(eq(prestasi.id, id));
}

export async function deletePrestasi(db: Database, id: string): Promise<void> {
  const existing = await db.query.prestasi.findFirst({ where: and(eq(prestasi.id, id), isNull(prestasi.deleted_at)) });
  if (!existing) throw new HTTPException(404, { message: "Prestasi tidak ditemukan." });

  await db
    .update(prestasi)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(prestasi.id, id));
}

/** Maks MAKS_PRESTASI_RAPORT prestasi tampil_di_raport urut tingkat tertinggi lalu terbaru — dipakai Tahap 6. */
function urutkanDanPotongPrestasiRaport(rows: (typeof prestasi.$inferSelect)[]): PrestasiRaportItem[] {
  return rows
    .sort((a, b) => {
      const urutanDiff = PRESTASI_TINGKAT_URUTAN[b.tingkat] - PRESTASI_TINGKAT_URUTAN[a.tingkat];
      return urutanDiff !== 0 ? urutanDiff : b.tanggal.localeCompare(a.tanggal);
    })
    .slice(0, MAKS_PRESTASI_RAPORT)
    .map((r) => ({
      judulRaport: r.judul_raport,
      keteranganRaport: r.keterangan_raport,
      tingkat: r.tingkat,
      tanggal: r.tanggal,
    }));
}

export async function getPrestasiRaport(db: Database, siswaId: string, periodId: string): Promise<PrestasiRaportItem[]> {
  const rows = await db.query.prestasi.findMany({
    where: and(
      eq(prestasi.siswa_id, siswaId),
      eq(prestasi.period_id, periodId),
      eq(prestasi.tampil_di_raport, true),
      isNull(prestasi.deleted_at),
    ),
  });
  return urutkanDanPotongPrestasiRaport(rows);
}

/** Versi batch `getPrestasiRaport()` — satu query untuk banyak siswa (dipakai Raport Kelas), bukan N query per siswa. */
export async function getPrestasiRaportBatch(
  db: Database,
  siswaIds: string[],
  periodId: string,
): Promise<Map<string, PrestasiRaportItem[]>> {
  if (siswaIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(prestasi)
    .where(
      and(
        sql`${prestasi.siswa_id} IN ${siswaIds}`,
        eq(prestasi.period_id, periodId),
        eq(prestasi.tampil_di_raport, true),
        isNull(prestasi.deleted_at),
      ),
    );

  const bySiswa = new Map<string, (typeof prestasi.$inferSelect)[]>();
  for (const r of rows) {
    const arr = bySiswa.get(r.siswa_id) ?? [];
    arr.push(r);
    bySiswa.set(r.siswa_id, arr);
  }

  const hasil = new Map<string, PrestasiRaportItem[]>();
  for (const siswaId of siswaIds) hasil.set(siswaId, urutkanDanPotongPrestasiRaport(bySiswa.get(siswaId) ?? []));
  return hasil;
}

