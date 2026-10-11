import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { rombel, guru, siswa, siswaKelas } from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import type { CreateRombelInput, UpdateRombelInput } from "../../shared/schemas/rombel.schema";
import type { RombelListItem } from "../../shared/types";

async function assertNameAvailable(
  db: Database,
  periodId: string,
  nama: string,
  excludeId?: string,
): Promise<void> {
  const existing = await db.query.rombel.findFirst({
    where: and(eq(rombel.period_id, periodId), eq(rombel.nama, nama)),
  });
  if (existing && existing.id !== excludeId) {
    throw new HTTPException(409, { message: `Rombel "${nama}" sudah ada di periode ini.` });
  }
}

/** "beri peringatan jika dobel" — tidak memblokir, hanya mengembalikan pesan. */
async function checkWaliDoubleBooking(
  db: Database,
  periodId: string,
  waliGuruId: string,
  excludeRombelId?: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: rombel.id, nama: rombel.nama })
    .from(rombel)
    .where(
      and(eq(rombel.period_id, periodId), eq(rombel.wali_guru_id, waliGuruId), isNull(rombel.deleted_at)),
    );
  const other = rows.find((r) => r.id !== excludeRombelId);
  if (!other) return null;
  const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, waliGuruId) });
  return `${guruRow?.nama_lengkap ?? "Guru ini"} sudah menjadi wali kelas ${other.nama} di periode yang sama.`;
}

async function toListItems(db: Database, rows: (typeof rombel.$inferSelect)[]): Promise<RombelListItem[]> {
  if (rows.length === 0) return [];

  const waliIds = [...new Set(rows.map((r) => r.wali_guru_id).filter((v): v is string => !!v))];
  const guruRows = waliIds.length
    ? await db
        .select({ id: guru.id, namaLengkap: guru.nama_lengkap })
        .from(guru)
        .where(sql`${guru.id} IN ${waliIds}`)
    : [];
  const guruById = new Map(guruRows.map((g) => [g.id, g]));

  const countRows = await db
    .select({
      rombelId: siswaKelas.rombel_id,
      jenisKelamin: siswa.jenis_kelamin,
      count: sql<number>`COUNT(*)`,
    })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswaKelas.siswa_id, siswa.id))
    .where(sql`${siswaKelas.rombel_id} IN ${rows.map((r) => r.id)}`)
    .groupBy(siswaKelas.rombel_id, siswa.jenis_kelamin);

  const countByRombel = new Map<string, { L: number; P: number }>();
  for (const row of countRows) {
    const entry = countByRombel.get(row.rombelId) ?? { L: 0, P: 0 };
    entry[row.jenisKelamin as "L" | "P"] = Number(row.count);
    countByRombel.set(row.rombelId, entry);
  }

  return rows.map((r) => ({
    id: r.id,
    periodId: r.period_id,
    tingkat: r.tingkat,
    nama: r.nama,
    waliGuru: r.wali_guru_id
      ? { id: r.wali_guru_id, namaLengkap: guruById.get(r.wali_guru_id)?.namaLengkap ?? "—" }
      : null,
    urutan: r.urutan,
    jumlahSiswaL: countByRombel.get(r.id)?.L ?? 0,
    jumlahSiswaP: countByRombel.get(r.id)?.P ?? 0,
  }));
}

export async function listRombel(db: Database, periodId: string): Promise<RombelListItem[]> {
  const rows = await db.query.rombel.findMany({
    where: and(eq(rombel.period_id, periodId), isNull(rombel.deleted_at)),
    orderBy: [asc(rombel.tingkat), asc(rombel.urutan), asc(rombel.nama)],
  });
  return toListItems(db, rows);
}

export async function createRombel(
  db: Database,
  periodId: string,
  input: CreateRombelInput,
): Promise<{ item: RombelListItem; warning: string | null }> {
  await assertNameAvailable(db, periodId, input.nama);
  let warning: string | null = null;
  if (input.waliGuruId) {
    warning = await checkWaliDoubleBooking(db, periodId, input.waliGuruId);
  }

  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(rombel).values({
    id,
    period_id: periodId,
    tingkat: input.tingkat,
    nama: input.nama,
    wali_guru_id: input.waliGuruId,
    urutan: input.urutan,
    created_at: now,
    updated_at: now,
  });

  const row = await db.query.rombel.findFirst({ where: eq(rombel.id, id) });
  const [item] = await toListItems(db, [row!]);
  return { item: item!, warning };
}

export async function updateRombel(
  db: Database,
  id: string,
  input: UpdateRombelInput,
): Promise<{ item: RombelListItem; warning: string | null }> {
  const existing = await db.query.rombel.findFirst({ where: eq(rombel.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });

  await assertNameAvailable(db, existing.period_id, input.nama, id);
  let warning: string | null = null;
  if (input.waliGuruId) {
    warning = await checkWaliDoubleBooking(db, existing.period_id, input.waliGuruId, id);
  }

  await db
    .update(rombel)
    .set({
      tingkat: input.tingkat,
      nama: input.nama,
      wali_guru_id: input.waliGuruId,
      urutan: input.urutan,
      updated_at: new Date().toISOString(),
    })
    .where(eq(rombel.id, id));

  const row = await db.query.rombel.findFirst({ where: eq(rombel.id, id) });
  const [item] = await toListItems(db, [row!]);
  return { item: item!, warning };
}

export async function deleteRombel(db: Database, id: string): Promise<void> {
  const existing = await db.query.rombel.findFirst({ where: eq(rombel.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });

  const siswaCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(siswaKelas)
    .where(eq(siswaKelas.rombel_id, id));
  if (Number(siswaCount[0]?.count ?? 0) > 0) {
    throw new HTTPException(400, {
      message: "Tidak bisa menghapus rombel yang masih memiliki siswa. Pindahkan siswanya dulu.",
    });
  }

  await db
    .update(rombel)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(rombel.id, id));
}

export async function copyRombelFromPeriod(
  db: Database,
  targetPeriodId: string,
  sourcePeriodId: string,
  keepWaliKelas: boolean,
): Promise<{ count: number }> {
  const sourceRows = await db.query.rombel.findMany({
    where: and(eq(rombel.period_id, sourcePeriodId), isNull(rombel.deleted_at)),
  });
  if (sourceRows.length === 0) return { count: 0 };

  const existingTarget = await db.query.rombel.findMany({
    where: and(eq(rombel.period_id, targetPeriodId), isNull(rombel.deleted_at)),
  });
  const existingNames = new Set(existingTarget.map((r) => r.nama));
  const toCopy = sourceRows.filter((r) => !existingNames.has(r.nama));
  if (toCopy.length === 0) return { count: 0 };

  const now = new Date().toISOString();
  const newRows = toCopy.map((r) => ({
    id: generateId(),
    period_id: targetPeriodId,
    tingkat: r.tingkat,
    nama: r.nama,
    wali_guru_id: keepWaliKelas ? r.wali_guru_id : null,
    urutan: r.urutan,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }));

  const chunks = chunkArray(newRows, 20);
  await db.batch([
    db.insert(rombel).values(chunks[0]!),
    ...chunks.slice(1).map((chunk) => db.insert(rombel).values(chunk)),
  ]);

  return { count: newRows.length };
}

export interface SiswaInRombel {
  id: string;
  namaLengkap: string;
  nomorAbsen: number | null;
}

export async function getSiswaInRombel(
  db: Database,
  rombelId: string,
  periodId: string,
): Promise<SiswaInRombel[]> {
  const rows = await db
    .select({ id: siswa.id, namaLengkap: siswa.nama_lengkap, nomorAbsen: siswaKelas.nomor_absen })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswaKelas.siswa_id, siswa.id))
    .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)))
    .orderBy(asc(siswaKelas.nomor_absen), asc(siswa.nama_lengkap));
  return rows;
}

export async function updateNomorAbsen(
  db: Database,
  rombelId: string,
  periodId: string,
  items: { siswaId: string; nomorAbsen: number }[],
): Promise<void> {
  if (items.length === 0) return;
  const now = new Date().toISOString();
  const [first, ...rest] = items;
  const toStatement = (item: (typeof items)[number]) =>
    db
      .update(siswaKelas)
      .set({ nomor_absen: item.nomorAbsen, updated_at: now })
      .where(
        and(
          eq(siswaKelas.siswa_id, item.siswaId),
          eq(siswaKelas.rombel_id, rombelId),
          eq(siswaKelas.period_id, periodId),
        ),
      );
  await db.batch([toStatement(first!), ...rest.map(toStatement)]);
}
