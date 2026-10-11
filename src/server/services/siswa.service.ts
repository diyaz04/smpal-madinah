import { and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { siswa, siswaKelas, rombel, academicPeriods } from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import { nullIfEmpty } from "../lib/text";
import { paginate, type OffsetPaginatedResult } from "../lib/paginate";
import { SEMESTER_LABELS } from "../../shared/constants";
import type {
  CreateSiswaInput,
  UpdateSiswaInput,
  SiswaListQuery,
} from "../../shared/schemas/siswa.schema";
import type { SiswaListItem, SiswaDetail } from "../../shared/types";

async function assertNisAvailable(db: Database, nis: string, excludeId?: string): Promise<void> {
  const existing = await db.query.siswa.findFirst({ where: eq(siswa.nis, nis) });
  if (existing && existing.id !== excludeId) {
    throw new HTTPException(409, { message: `NIS "${nis}" sudah dipakai siswa lain.` });
  }
}

async function assertNisnAvailable(db: Database, nisn: string, excludeId?: string): Promise<void> {
  const existing = await db.query.siswa.findFirst({ where: eq(siswa.nisn, nisn) });
  if (existing && existing.id !== excludeId) {
    throw new HTTPException(409, { message: `NISN "${nisn}" sudah dipakai siswa lain.` });
  }
}

async function upsertSiswaKelas(
  db: Database,
  siswaId: string,
  periodId: string,
  rombelId: string | null,
): Promise<void> {
  const existing = await db.query.siswaKelas.findFirst({
    where: and(eq(siswaKelas.siswa_id, siswaId), eq(siswaKelas.period_id, periodId)),
  });
  const now = new Date().toISOString();

  if (!rombelId) {
    if (existing) await db.delete(siswaKelas).where(eq(siswaKelas.id, existing.id));
    return;
  }

  if (existing) {
    if (existing.rombel_id === rombelId) return;
    await db
      .update(siswaKelas)
      .set({ rombel_id: rombelId, updated_at: now })
      .where(eq(siswaKelas.id, existing.id));
  } else {
    await db.insert(siswaKelas).values({
      id: generateId(),
      siswa_id: siswaId,
      rombel_id: rombelId,
      period_id: periodId,
      nomor_absen: null,
      created_at: now,
      updated_at: now,
    });
  }
}

export async function listSiswa(
  db: Database,
  query: SiswaListQuery,
  periodId: string,
  scopedRombelIds: string[] | null,
): Promise<OffsetPaginatedResult<SiswaListItem>> {
  const conditions = [isNull(siswa.deleted_at)];
  if (query.status) conditions.push(eq(siswa.status, query.status));
  if (query.search) {
    const prefix = `${query.search}%`;
    conditions.push(or(like(siswa.nama_lengkap, prefix), like(siswa.nis, prefix), like(siswa.nisn, prefix))!);
  }
  if (query.rombelId) conditions.push(eq(siswaKelas.rombel_id, query.rombelId));
  if (scopedRombelIds !== null) {
    if (scopedRombelIds.length === 0) {
      return { items: [], page: query.page ?? 1, pageSize: query.pageSize ?? 20, hasNext: false };
    }
    conditions.push(sql`${siswaKelas.rombel_id} IN ${scopedRombelIds}`);
  }

  const result = await paginate(
    (limit, offset) =>
      db
        .select({
          id: siswa.id,
          nis: siswa.nis,
          nisn: siswa.nisn,
          namaLengkap: siswa.nama_lengkap,
          jenisKelamin: siswa.jenis_kelamin,
          status: siswa.status,
          fotoFileId: siswa.foto_file_id,
          rombelId: rombel.id,
          rombelNama: rombel.nama,
          rombelTingkat: rombel.tingkat,
          nomorAbsen: siswaKelas.nomor_absen,
        })
        .from(siswa)
        .leftJoin(
          siswaKelas,
          and(eq(siswaKelas.siswa_id, siswa.id), eq(siswaKelas.period_id, periodId)),
        )
        .leftJoin(rombel, eq(rombel.id, siswaKelas.rombel_id))
        .where(and(...conditions))
        .orderBy(asc(siswa.nama_lengkap))
        .limit(limit)
        .offset(offset),
    { page: query.page, pageSize: query.pageSize },
  );

  return {
    ...result,
    items: result.items.map((r) => ({
      id: r.id,
      nis: r.nis,
      nisn: r.nisn,
      namaLengkap: r.namaLengkap,
      jenisKelamin: r.jenisKelamin,
      status: r.status,
      fotoFileId: r.fotoFileId,
      rombel: r.rombelId ? { id: r.rombelId, nama: r.rombelNama!, tingkat: r.rombelTingkat! } : null,
      nomorAbsen: r.nomorAbsen,
    })),
  };
}

export async function getSiswaDetail(
  db: Database,
  id: string,
  periodId: string,
): Promise<SiswaDetail | null> {
  const row = await db.query.siswa.findFirst({ where: eq(siswa.id, id) });
  if (!row || row.deleted_at) return null;

  const riwayatRows = await db
    .select({
      periodId: siswaKelas.period_id,
      yearLabel: academicPeriods.year_label,
      semester: academicPeriods.semester,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      rombelTingkat: rombel.tingkat,
      nomorAbsen: siswaKelas.nomor_absen,
    })
    .from(siswaKelas)
    .innerJoin(rombel, eq(rombel.id, siswaKelas.rombel_id))
    .innerJoin(academicPeriods, eq(academicPeriods.id, siswaKelas.period_id))
    .where(eq(siswaKelas.siswa_id, id));

  const currentRow = riwayatRows.find((r) => r.periodId === periodId) ?? null;

  return {
    id: row.id,
    nis: row.nis,
    nisn: row.nisn,
    namaLengkap: row.nama_lengkap,
    jenisKelamin: row.jenis_kelamin,
    status: row.status,
    fotoFileId: row.foto_file_id,
    rombel: currentRow
      ? { id: currentRow.rombelId, nama: currentRow.rombelNama, tingkat: currentRow.rombelTingkat }
      : null,
    nomorAbsen: currentRow?.nomorAbsen ?? null,
    namaPanggilan: row.nama_panggilan,
    tempatLahir: row.tempat_lahir,
    tanggalLahir: row.tanggal_lahir,
    agama: row.agama,
    alamat: row.alamat,
    namaAyah: row.nama_ayah,
    namaIbu: row.nama_ibu,
    namaWali: row.nama_wali,
    noHpOrtu: row.no_hp_ortu,
    pekerjaanOrtu: row.pekerjaan_ortu,
    statusTanggal: row.status_tanggal,
    statusKeterangan: row.status_keterangan,
    riwayatKelas: riwayatRows.map((r) => ({
      periodId: r.periodId,
      periodLabel: `${r.yearLabel} — ${SEMESTER_LABELS[r.semester]}`,
      rombelId: r.rombelId,
      rombelNama: r.rombelNama,
      nomorAbsen: r.nomorAbsen,
    })),
  };
}

/** Rombel ID siswa ini di periode tertentu, atau null kalau belum ditempatkan — dipakai pemeriksaan scope. */
export async function getSiswaRombelId(db: Database, siswaId: string, periodId: string): Promise<string | null> {
  const row = await db.query.siswaKelas.findFirst({
    where: and(eq(siswaKelas.siswa_id, siswaId), eq(siswaKelas.period_id, periodId)),
  });
  return row?.rombel_id ?? null;
}

function toDbValues(input: CreateSiswaInput) {
  return {
    nis: input.nis,
    nisn: input.nisn,
    nama_lengkap: input.namaLengkap,
    nama_panggilan: nullIfEmpty(input.namaPanggilan),
    jenis_kelamin: input.jenisKelamin,
    tempat_lahir: nullIfEmpty(input.tempatLahir),
    tanggal_lahir: nullIfEmpty(input.tanggalLahir),
    agama: nullIfEmpty(input.agama),
    alamat: nullIfEmpty(input.alamat),
    nama_ayah: nullIfEmpty(input.namaAyah),
    nama_ibu: nullIfEmpty(input.namaIbu),
    nama_wali: nullIfEmpty(input.namaWali),
    no_hp_ortu: nullIfEmpty(input.noHpOrtu),
    pekerjaan_ortu: nullIfEmpty(input.pekerjaanOrtu),
    status: input.status,
    status_keterangan: nullIfEmpty(input.statusKeterangan),
  };
}

export async function createSiswa(
  db: Database,
  input: CreateSiswaInput,
  periodId: string,
): Promise<SiswaListItem> {
  await assertNisAvailable(db, input.nis);
  await assertNisnAvailable(db, input.nisn);

  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(siswa).values({
    id,
    ...toDbValues(input),
    status_tanggal: now,
    created_at: now,
    updated_at: now,
  });

  if (input.rombelId) await upsertSiswaKelas(db, id, periodId, input.rombelId);

  const detail = await getSiswaDetail(db, id, periodId);
  return detail!;
}

export async function updateSiswa(
  db: Database,
  id: string,
  input: UpdateSiswaInput,
  periodId: string,
): Promise<SiswaListItem> {
  const existing = await db.query.siswa.findFirst({ where: eq(siswa.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Siswa tidak ditemukan." });

  await assertNisAvailable(db, input.nis, id);
  await assertNisnAvailable(db, input.nisn, id);

  const now = new Date().toISOString();
  const statusChanged = existing.status !== input.status;
  await db
    .update(siswa)
    .set({
      ...toDbValues(input),
      status_tanggal: statusChanged ? now : existing.status_tanggal,
      updated_at: now,
    })
    .where(eq(siswa.id, id));

  await upsertSiswaKelas(db, id, periodId, input.rombelId);

  const detail = await getSiswaDetail(db, id, periodId);
  return detail!;
}

export async function deleteSiswa(db: Database, id: string): Promise<void> {
  const existing = await db.query.siswa.findFirst({ where: eq(siswa.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Siswa tidak ditemukan." });

  await db
    .update(siswa)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(siswa.id, id));
}

export async function bulkPindahRombel(
  db: Database,
  siswaIds: string[],
  rombelId: string,
  periodId: string,
): Promise<{ count: number }> {
  const rombelRow = await db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) });
  if (!rombelRow || rombelRow.deleted_at) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });

  // Satu query utk semua penempatan yang sudah ada, lalu satu db.batch() utk
  // semua update/insert — menghindari 2*N subrequest kalau diproses per-siswa.
  const existingRows = await db
    .select({ id: siswaKelas.id, siswaId: siswaKelas.siswa_id })
    .from(siswaKelas)
    .where(and(sql`${siswaKelas.siswa_id} IN ${siswaIds}`, eq(siswaKelas.period_id, periodId)));
  const existingBySiswa = new Map(existingRows.map((r) => [r.siswaId, r.id]));

  const now = new Date().toISOString();
  const statements = siswaIds.map((siswaId) => {
    const existingId = existingBySiswa.get(siswaId);
    if (existingId) {
      return db
        .update(siswaKelas)
        .set({ rombel_id: rombelId, updated_at: now })
        .where(eq(siswaKelas.id, existingId));
    }
    return db.insert(siswaKelas).values({
      id: generateId(),
      siswa_id: siswaId,
      rombel_id: rombelId,
      period_id: periodId,
      nomor_absen: null,
      created_at: now,
      updated_at: now,
    });
  });
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);

  return { count: siswaIds.length };
}

export async function bulkUbahStatus(
  db: Database,
  siswaIds: string[],
  status: CreateSiswaInput["status"],
  statusKeterangan: string | null,
): Promise<{ count: number }> {
  if (siswaIds.length === 0) return { count: 0 };
  const now = new Date().toISOString();
  const [firstId, ...restIds] = siswaIds;
  const toStatement = (siswaId: string) =>
    db
      .update(siswa)
      .set({ status, status_tanggal: now, status_keterangan: statusKeterangan, updated_at: now })
      .where(eq(siswa.id, siswaId));
  await db.batch([toStatement(firstId!), ...restIds.map(toStatement)]);
  return { count: siswaIds.length };
}

export async function importSiswaCommit(
  db: Database,
  rows: CreateSiswaInput[],
  periodId: string,
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  const nisList = rows.map((r) => r.nis);
  const nisnList = rows.map((r) => r.nisn);
  const clashes = await db
    .select({ nis: siswa.nis, nisn: siswa.nisn })
    .from(siswa)
    .where(or(sql`${siswa.nis} IN ${nisList}`, sql`${siswa.nisn} IN ${nisnList}`));
  if (clashes.length > 0) {
    throw new HTTPException(409, {
      message: `NIS/NISN berikut sudah terpakai: ${clashes.map((c) => `${c.nis}/${c.nisn}`).join(", ")}`,
    });
  }

  const now = new Date().toISOString();
  const newRows = rows.map((r) => ({
    id: generateId(),
    ...toDbValues(r),
    status_tanggal: now,
    created_at: now,
    updated_at: now,
  }));

  const chunks = chunkArray(newRows, 25);
  await db.batch([
    db.insert(siswa).values(chunks[0]!),
    ...chunks.slice(1).map((chunk) => db.insert(siswa).values(chunk)),
  ]);

  const placements = rows
    .map((r, i) => ({ siswaId: newRows[i]!.id, rombelId: r.rombelId }))
    .filter((p): p is { siswaId: string; rombelId: string } => !!p.rombelId);
  if (placements.length > 0) {
    const placementRows = placements.map((p) => ({
      id: generateId(),
      siswa_id: p.siswaId,
      rombel_id: p.rombelId,
      period_id: periodId,
      nomor_absen: null,
      created_at: now,
      updated_at: now,
    }));
    const pChunks = chunkArray(placementRows, 30);
    await db.batch([
      db.insert(siswaKelas).values(pChunks[0]!),
      ...pChunks.slice(1).map((chunk) => db.insert(siswaKelas).values(chunk)),
    ]);
  }

  return { count: newRows.length };
}

/**
 * Data ekspor flat (bukan lewat getSiswaDetail per baris — itu akan jadi
 * N+1 query dan gampang melebihi batas 50 subrequest/invocation D1 untuk
 * sekolah dengan ratusan siswa). Dua query saja: semua siswa + semua
 * penempatan rombel periode ini, digabung di memori.
 */
export async function exportSiswa(db: Database, periodId: string): Promise<SiswaDetail[]> {
  const rows = await db.query.siswa.findMany({
    where: isNull(siswa.deleted_at),
    orderBy: [asc(siswa.nama_lengkap)],
  });

  const placementRows = await db
    .select({
      siswaId: siswaKelas.siswa_id,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      rombelTingkat: rombel.tingkat,
      nomorAbsen: siswaKelas.nomor_absen,
    })
    .from(siswaKelas)
    .innerJoin(rombel, eq(rombel.id, siswaKelas.rombel_id))
    .where(eq(siswaKelas.period_id, periodId));
  const placementBySiswa = new Map(placementRows.map((p) => [p.siswaId, p]));

  return rows.map((row) => {
    const placement = placementBySiswa.get(row.id);
    return {
      id: row.id,
      nis: row.nis,
      nisn: row.nisn,
      namaLengkap: row.nama_lengkap,
      jenisKelamin: row.jenis_kelamin,
      status: row.status,
      fotoFileId: row.foto_file_id,
      rombel: placement
        ? { id: placement.rombelId, nama: placement.rombelNama, tingkat: placement.rombelTingkat }
        : null,
      nomorAbsen: placement?.nomorAbsen ?? null,
      namaPanggilan: row.nama_panggilan,
      tempatLahir: row.tempat_lahir,
      tanggalLahir: row.tanggal_lahir,
      agama: row.agama,
      alamat: row.alamat,
      namaAyah: row.nama_ayah,
      namaIbu: row.nama_ibu,
      namaWali: row.nama_wali,
      noHpOrtu: row.no_hp_ortu,
      pekerjaanOrtu: row.pekerjaan_ortu,
      statusTanggal: row.status_tanggal,
      statusKeterangan: row.status_keterangan,
      riwayatKelas: [],
    };
  });
}
