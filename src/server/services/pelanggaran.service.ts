import { and, desc, eq, gte, isNull, lte, lt, or, sql, type SQL } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  pelanggaran,
  pelanggaranJenis,
  pelanggaranKategori,
  rekapPoinSiswa,
  sanksiAmbang,
  sanksiSiswa,
  siswa,
  siswaKelas,
  rombel,
  users,
  academicPeriods,
} from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import { tentukanAmbangBaruTercapai } from "../../shared/sanksi";
import type { CreatePelanggaranInput } from "../../shared/schemas/pelanggaran.schema";
import type { PelanggaranItem, CursorPaginatedResult } from "../../shared/types";

export interface PelanggaranQuery {
  cursor?: string;
  limit?: number;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  rombelId?: string;
  kategoriId?: string;
  jenisId?: string;
  pelaporUserId?: string;
  siswaId?: string;
}

/**
 * Cakupan "milik_sendiri" khusus modul ini: pelapor_user_id = diri sendiri
 * (Guru mencatat siapa saja tapi hanya lihat catatan sendiri) ATAU rombel
 * yang dia walikan (Wali Kelas lihat semua pelanggaran rombelnya) — beda
 * dari getScopedRombelIds() yang juga mengikutkan rombel yang diajar,
 * karena di modul ini guru pengajar non-wali TIDAK boleh lihat laporan
 * guru lain untuk rombel yang sama.
 */
async function getWaliRombelIds(db: Database, guruId: string, periodId: string): Promise<string[]> {
  const rows = await db
    .select({ id: rombel.id })
    .from(rombel)
    .where(and(eq(rombel.wali_guru_id, guruId), eq(rombel.period_id, periodId)));
  return rows.map((r) => r.id);
}

export async function listPelanggaran(
  db: Database,
  query: PelanggaranQuery,
  periodId: string,
  scope: { isMilikSendiri: boolean; userId: string; guruId: string | null },
): Promise<CursorPaginatedResult<PelanggaranItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions: SQL[] = [];

  if (scope.isMilikSendiri) {
    const waliRombelIds = scope.guruId ? await getWaliRombelIds(db, scope.guruId, periodId) : [];
    conditions.push(
      waliRombelIds.length > 0
        ? or(eq(pelanggaran.pelapor_user_id, scope.userId), sql`${pelanggaran.rombel_id} IN ${waliRombelIds}`)!
        : eq(pelanggaran.pelapor_user_id, scope.userId),
    );
  }

  if (query.siswaId) conditions.push(eq(pelanggaran.siswa_id, query.siswaId));
  if (query.tanggalMulai) conditions.push(gte(pelanggaran.tanggal, query.tanggalMulai));
  if (query.tanggalSelesai) conditions.push(lte(pelanggaran.tanggal, query.tanggalSelesai));
  if (query.rombelId) conditions.push(eq(pelanggaran.rombel_id, query.rombelId));
  if (query.jenisId) conditions.push(eq(pelanggaran.jenis_id, query.jenisId));
  if (query.pelaporUserId) conditions.push(eq(pelanggaran.pelapor_user_id, query.pelaporUserId));

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(pelanggaran.created_at, decoded.createdAt),
          and(eq(pelanggaran.created_at, decoded.createdAt), lt(pelanggaran.id, decoded.id)),
        )!,
      );
    }
  }

  let jenisIdsForKategori: string[] | null = null;
  if (query.kategoriId) {
    const jenisRows = await db
      .select({ id: pelanggaranJenis.id })
      .from(pelanggaranJenis)
      .where(eq(pelanggaranJenis.kategori_id, query.kategoriId));
    jenisIdsForKategori = jenisRows.map((r) => r.id);
    if (jenisIdsForKategori.length === 0) return { items: [], nextCursor: null };
    conditions.push(sql`${pelanggaran.jenis_id} IN ${jenisIdsForKategori}`);
  }

  const rows = await db
    .select({
      id: pelanggaran.id,
      created_at: pelanggaran.created_at,
      siswaId: pelanggaran.siswa_id,
      rombelId: pelanggaran.rombel_id,
      jenisId: pelanggaran.jenis_id,
      poin: pelanggaran.poin,
      tanggal: pelanggaran.tanggal,
      waktu: pelanggaran.waktu,
      lokasi: pelanggaran.lokasi,
      keterangan: pelanggaran.keterangan,
      fotoFileId: pelanggaran.foto_file_id,
      pelaporUserId: pelanggaran.pelapor_user_id,
      status: pelanggaran.status,
      alasanBatal: pelanggaran.alasan_batal,
    })
    .from(pelanggaran)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pelanggaran.created_at), desc(pelanggaran.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(rows, limit);
  if (items.length === 0) return { items: [], nextCursor };

  const siswaIds = [...new Set(items.map((r) => r.siswaId))];
  const rombelIds = [...new Set(items.map((r) => r.rombelId).filter((v): v is string => !!v))];
  const jenisIds = [...new Set(items.map((r) => r.jenisId))];
  const pelaporIds = [...new Set(items.map((r) => r.pelaporUserId))];

  const [siswaRows, rombelRows, jenisRows, pelaporRows] = await Promise.all([
    db.select({ id: siswa.id, nama: siswa.nama_lengkap }).from(siswa).where(sql`${siswa.id} IN ${siswaIds}`),
    rombelIds.length
      ? db.select({ id: rombel.id, nama: rombel.nama }).from(rombel).where(sql`${rombel.id} IN ${rombelIds}`)
      : Promise.resolve([]),
    db
      .select({
        id: pelanggaranJenis.id,
        nama: pelanggaranJenis.nama,
        kategoriNama: pelanggaranKategori.nama,
        kategoriWarna: pelanggaranKategori.warna,
      })
      .from(pelanggaranJenis)
      .innerJoin(pelanggaranKategori, eq(pelanggaranJenis.kategori_id, pelanggaranKategori.id))
      .where(sql`${pelanggaranJenis.id} IN ${jenisIds}`),
    db.select({ id: users.id, nama: users.full_name }).from(users).where(sql`${users.id} IN ${pelaporIds}`),
  ]);

  const siswaById = new Map(siswaRows.map((s) => [s.id, s.nama]));
  const rombelById = new Map(rombelRows.map((r) => [r.id, r.nama]));
  const jenisById = new Map(jenisRows.map((j) => [j.id, j]));
  const pelaporById = new Map(pelaporRows.map((u) => [u.id, u.nama]));

  return {
    nextCursor,
    items: items.map((r) => {
      const jenis = jenisById.get(r.jenisId);
      return {
        id: r.id,
        siswaId: r.siswaId,
        siswaNama: siswaById.get(r.siswaId) ?? "—",
        rombelId: r.rombelId,
        rombelNama: r.rombelId ? rombelById.get(r.rombelId) ?? null : null,
        jenisId: r.jenisId,
        jenisNama: jenis?.nama ?? "—",
        kategoriNama: jenis?.kategoriNama ?? "—",
        kategoriWarna: jenis?.kategoriWarna ?? "#94a3b8",
        poin: r.poin,
        tanggal: r.tanggal,
        waktu: r.waktu,
        lokasi: r.lokasi,
        keterangan: r.keterangan,
        fotoFileId: r.fotoFileId,
        pelaporUserId: r.pelaporUserId,
        pelaporNama: pelaporById.get(r.pelaporUserId) ?? "—",
        status: r.status,
        alasanBatal: r.alasanBatal,
        createdAt: r.created_at,
      };
    }),
  };
}

export async function createPelanggaran(
  db: Database,
  input: CreatePelanggaranInput,
  periodId: string,
  actorUserId: string,
): Promise<{ count: number }> {
  const periode = await db.query.academicPeriods.findFirst({ where: eq(academicPeriods.id, periodId) });
  if (!periode) throw new HTTPException(400, { message: "Periode tidak ditemukan." });
  const tahunAjaran = periode.year_label;

  const jenis = await db.query.pelanggaranJenis.findFirst({
    where: and(eq(pelanggaranJenis.id, input.jenisId), isNull(pelanggaranJenis.deleted_at)),
  });
  if (!jenis || !jenis.aktif) {
    throw new HTTPException(400, { message: "Jenis pelanggaran tidak ditemukan atau sudah nonaktif." });
  }

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

  const existingRekapRows = await db
    .select()
    .from(rekapPoinSiswa)
    .where(and(sql`${rekapPoinSiswa.siswa_id} IN ${siswaIds}`, eq(rekapPoinSiswa.tahun_ajaran, tahunAjaran)));
  const rekapBySiswa = new Map(existingRekapRows.map((r) => [r.siswa_id, r]));

  const ambangList = await db.query.sanksiAmbang.findMany({ where: isNull(sanksiAmbang.deleted_at) });

  const existingSanksiRows = await db
    .select({ siswaId: sanksiSiswa.siswa_id, ambangId: sanksiSiswa.ambang_id })
    .from(sanksiSiswa)
    .where(and(sql`${sanksiSiswa.siswa_id} IN ${siswaIds}`, eq(sanksiSiswa.tahun_ajaran, tahunAjaran)));
  const sanksiAmbangIdsBySiswa = new Map<string, Set<string>>();
  for (const row of existingSanksiRows) {
    const set = sanksiAmbangIdsBySiswa.get(row.siswaId) ?? new Set<string>();
    set.add(row.ambangId);
    sanksiAmbangIdsBySiswa.set(row.siswaId, set);
  }

  const now = new Date().toISOString();

  const statements = siswaIds.flatMap((siswaId) => {
    const existingRekap = rekapBySiswa.get(siswaId);
    const totalPoinBaru = (existingRekap?.total_poin ?? 0) + jenis.poin;

    const rekapStatement = existingRekap
      ? db
          .update(rekapPoinSiswa)
          .set({
            total_poin: totalPoinBaru,
            jumlah_pelanggaran: existingRekap.jumlah_pelanggaran + 1,
            terakhir_pada: input.tanggal,
            updated_at: now,
          })
          .where(eq(rekapPoinSiswa.id, existingRekap.id))
      : db.insert(rekapPoinSiswa).values({
          id: generateId(),
          siswa_id: siswaId,
          tahun_ajaran: tahunAjaran,
          total_poin: totalPoinBaru,
          jumlah_pelanggaran: 1,
          terakhir_pada: input.tanggal,
          updated_at: now,
        });

    const sudahTercapai = sanksiAmbangIdsBySiswa.get(siswaId) ?? new Set<string>();
    const ambangBaru = tentukanAmbangBaruTercapai(
      totalPoinBaru,
      ambangList.map((a) => ({ id: a.id, poinMinimal: a.poin_minimal })),
      sudahTercapai,
    );
    const sanksiStatements = ambangBaru.map((ambang) =>
      db.insert(sanksiSiswa).values({
        id: generateId(),
        siswa_id: siswaId,
        tahun_ajaran: tahunAjaran,
        ambang_id: ambang.id,
        tercapai_pada: input.tanggal,
        status: "belum",
        created_at: now,
        updated_at: now,
      }),
    );

    return [
      db.insert(pelanggaran).values({
        id: generateId(),
        period_id: periodId,
        tahun_ajaran: tahunAjaran,
        siswa_id: siswaId,
        rombel_id: rombelBySiswa.get(siswaId) ?? null,
        jenis_id: jenis.id,
        poin: jenis.poin,
        tanggal: input.tanggal,
        waktu: input.waktu,
        lokasi: nullIfEmpty(input.lokasi),
        keterangan: nullIfEmpty(input.keterangan),
        foto_file_id: input.fotoFileId,
        pelapor_user_id: actorUserId,
        status: "tercatat" as const,
        created_at: now,
        updated_at: now,
      }),
      rekapStatement,
      ...sanksiStatements,
    ];
  });

  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  return { count: siswaIds.length };
}

export async function batalkanPelanggaran(
  db: Database,
  id: string,
  alasanBatal: string,
  actorUserId: string,
): Promise<void> {
  const existing = await db.query.pelanggaran.findFirst({ where: eq(pelanggaran.id, id) });
  if (!existing) throw new HTTPException(404, { message: "Catatan pelanggaran tidak ditemukan." });
  if (existing.status === "dibatalkan") {
    throw new HTTPException(400, { message: "Catatan ini sudah dibatalkan." });
  }

  const rekap = await db.query.rekapPoinSiswa.findFirst({
    where: and(eq(rekapPoinSiswa.siswa_id, existing.siswa_id), eq(rekapPoinSiswa.tahun_ajaran, existing.tahun_ajaran)),
  });
  const terakhirRow = rekap
    ? await db.query.pelanggaran.findFirst({
        where: and(
          eq(pelanggaran.siswa_id, existing.siswa_id),
          eq(pelanggaran.tahun_ajaran, existing.tahun_ajaran),
          eq(pelanggaran.status, "tercatat"),
          sql`${pelanggaran.id} != ${id}`,
        ),
        orderBy: [desc(pelanggaran.tanggal)],
      })
    : null;

  const now = new Date().toISOString();
  const pelanggaranStatement = db
    .update(pelanggaran)
    .set({
      status: "dibatalkan" as const,
      alasan_batal: alasanBatal,
      dibatalkan_oleh: actorUserId,
      dibatalkan_pada: now,
      updated_at: now,
    })
    .where(eq(pelanggaran.id, id));

  if (!rekap) {
    await db.batch([pelanggaranStatement]);
    return;
  }

  const rekapStatement = db
    .update(rekapPoinSiswa)
    .set({
      total_poin: Math.max(0, rekap.total_poin - existing.poin),
      jumlah_pelanggaran: Math.max(0, rekap.jumlah_pelanggaran - 1),
      terakhir_pada: terakhirRow?.tanggal ?? null,
      updated_at: now,
    })
    .where(eq(rekapPoinSiswa.id, rekap.id));

  await db.batch([pelanggaranStatement, rekapStatement]);
}
