import { and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  guru,
  guruAlias,
  guruTugasTambahan,
  users,
  userRoles,
  rombel,
  pembagianTugas,
  mapel,
  jadwalIsiGuru,
  jadwalIsi,
  jadwalSlot,
  jadwalVersi,
} from "../db/schema";
import { generateId } from "../lib/id";
import { chunkArray } from "../lib/chunk";
import { nullIfEmpty } from "../lib/text";
import { hashPassword, generateTempPassword, DEFAULT_PBKDF2_ITERATIONS } from "../lib/pbkdf2";
import { assertRoleIdsExist, deactivateUser, reactivateUser } from "./users.service";
import { paginate, type OffsetPaginatedResult } from "../lib/paginate";
import type { CreateGuruInput, UpdateGuruInput, GuruListQuery, BuatAkunGuruInput } from "../../shared/schemas/guru.schema";
import type { GuruRef, GuruListItem, GuruDetail } from "../../shared/types";

/** Daftar ringkas guru aktif — dipakai dropdown pemilihan (wali kelas, pengajar, dll.). */
export async function listGuruSimple(db: Database): Promise<GuruRef[]> {
  const rows = await db
    .select({ id: guru.id, namaLengkap: guru.nama_lengkap })
    .from(guru)
    .where(and(isNull(guru.deleted_at), eq(guru.is_active, true)))
    .orderBy(asc(guru.nama_lengkap));
  return rows;
}

async function assertNipAvailable(db: Database, nip: string | null, excludeId?: string): Promise<void> {
  if (!nip) return;
  const existing = await db.query.guru.findFirst({
    where: and(eq(guru.nip, nip), isNull(guru.deleted_at)),
  });
  if (existing && existing.id !== excludeId) {
    throw new HTTPException(409, { message: `NIP "${nip}" sudah dipakai guru lain.` });
  }
}

export async function listGuru(
  db: Database,
  query: GuruListQuery,
): Promise<OffsetPaginatedResult<GuruListItem>> {
  const conditions = [isNull(guru.deleted_at)];
  if (query.status) conditions.push(eq(guru.is_active, query.status === "active"));
  if (query.search) {
    const prefix = `${query.search}%`;
    conditions.push(or(like(guru.nama_lengkap, prefix), like(guru.nip, prefix))!);
  }

  const result = await paginate(
    (limit, offset) =>
      db
        .select({
          id: guru.id,
          nip: guru.nip,
          namaLengkap: guru.nama_lengkap,
          jenisKelamin: guru.jenis_kelamin,
          statusKepegawaian: guru.status_kepegawaian,
          isActive: guru.is_active,
          fotoFileId: guru.foto_file_id,
        })
        .from(guru)
        .where(and(...conditions))
        .orderBy(asc(guru.nama_lengkap))
        .limit(limit)
        .offset(offset),
    { page: query.page, pageSize: query.pageSize },
  );

  if (result.items.length === 0) return { ...result, items: [] };

  const guruIds = result.items.map((g) => g.id);
  const akunRows = await db
    .select({ guruId: users.guru_id })
    .from(users)
    .where(and(sql`${users.guru_id} IN ${guruIds}`, isNull(users.deleted_at)));
  const withAkun = new Set(akunRows.map((r) => r.guruId));

  return { ...result, items: result.items.map((g) => ({ ...g, punyaAkun: withAkun.has(g.id) })) };
}

export async function getGuruDetail(db: Database, id: string, periodId: string): Promise<GuruDetail | null> {
  const row = await db.query.guru.findFirst({ where: eq(guru.id, id) });
  if (!row || row.deleted_at) return null;

  const aliasRows = await db.query.guruAlias.findMany({ where: eq(guruAlias.guru_id, id) });
  const tugasRows = await db.query.guruTugasTambahan.findMany({
    where: and(eq(guruTugasTambahan.guru_id, id), eq(guruTugasTambahan.period_id, periodId)),
  });
  const waliRombel = await db.query.rombel.findFirst({
    where: and(eq(rombel.wali_guru_id, id), eq(rombel.period_id, periodId), isNull(rombel.deleted_at)),
  });
  const mengajarRows = await db
    .select({
      mapelId: mapel.id,
      mapelNama: mapel.nama,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
    })
    .from(pembagianTugas)
    .innerJoin(mapel, eq(pembagianTugas.mapel_id, mapel.id))
    .innerJoin(rombel, eq(pembagianTugas.rombel_id, rombel.id))
    .where(and(eq(pembagianTugas.guru_id, id), eq(pembagianTugas.period_id, periodId)));

  const jpRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(jadwalIsiGuru)
    .innerJoin(jadwalIsi, eq(jadwalIsiGuru.jadwal_isi_id, jadwalIsi.id))
    .innerJoin(jadwalSlot, eq(jadwalIsi.jadwal_slot_id, jadwalSlot.id))
    .innerJoin(jadwalVersi, eq(jadwalSlot.jadwal_versi_id, jadwalVersi.id))
    .where(
      and(
        eq(jadwalIsiGuru.guru_id, id),
        eq(jadwalVersi.period_id, periodId),
        eq(jadwalVersi.status, "aktif"),
        eq(jadwalSlot.jenis_slot, "kbm"),
      ),
    );

  const userRow = await db.query.users.findFirst({
    where: and(eq(users.guru_id, id), isNull(users.deleted_at)),
  });

  return {
    id: row.id,
    nip: row.nip,
    namaLengkap: row.nama_lengkap,
    jenisKelamin: row.jenis_kelamin,
    statusKepegawaian: row.status_kepegawaian,
    isActive: row.is_active,
    fotoFileId: row.foto_file_id,
    punyaAkun: !!userRow,
    namaTanpaGelar: row.nama_tanpa_gelar,
    nuptk: row.nuptk,
    tempatLahir: row.tempat_lahir,
    tanggalLahir: row.tanggal_lahir,
    noHp: row.no_hp,
    email: row.email,
    alamat: row.alamat,
    tanggalMulaiTugas: row.tanggal_mulai_tugas,
    aliasNama: aliasRows.map((a) => a.alias_nama),
    waliKelasRombel: waliRombel ? { id: waliRombel.id, nama: waliRombel.nama } : null,
    tugasTambahan: tugasRows.map((t) => ({ id: t.id, namaTugas: t.nama_tugas, keterangan: t.keterangan })),
    mengajar: mengajarRows,
    totalJpPerMinggu: Number(jpRow[0]?.count ?? 0),
    userId: userRow?.id ?? null,
    username: userRow?.username ?? null,
  };
}

function toDbValues(input: CreateGuruInput) {
  return {
    nip: nullIfEmpty(input.nip),
    nuptk: nullIfEmpty(input.nuptk),
    nama_lengkap: input.namaLengkap,
    nama_tanpa_gelar: input.namaTanpaGelar,
    jenis_kelamin: input.jenisKelamin,
    tempat_lahir: nullIfEmpty(input.tempatLahir),
    tanggal_lahir: input.tanggalLahir,
    no_hp: nullIfEmpty(input.noHp),
    email: nullIfEmpty(input.email),
    alamat: nullIfEmpty(input.alamat),
    status_kepegawaian: input.statusKepegawaian,
    tanggal_mulai_tugas: nullIfEmpty(input.tanggalMulaiTugas),
    is_active: input.isActive,
  };
}

export async function createGuru(db: Database, input: CreateGuruInput): Promise<GuruListItem> {
  await assertNipAvailable(db, nullIfEmpty(input.nip));

  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(guru).values({ id, ...toDbValues(input), created_at: now, updated_at: now });

  const row = await db.query.guru.findFirst({ where: eq(guru.id, id) });
  return {
    id: row!.id,
    nip: row!.nip,
    namaLengkap: row!.nama_lengkap,
    jenisKelamin: row!.jenis_kelamin,
    statusKepegawaian: row!.status_kepegawaian,
    isActive: row!.is_active,
    fotoFileId: row!.foto_file_id,
    punyaAkun: false,
  };
}

export async function updateGuru(db: Database, id: string, input: UpdateGuruInput): Promise<GuruListItem> {
  const existing = await db.query.guru.findFirst({ where: eq(guru.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  await assertNipAvailable(db, nullIfEmpty(input.nip), id);

  await db
    .update(guru)
    .set({ ...toDbValues(input), updated_at: new Date().toISOString() })
    .where(eq(guru.id, id));

  const row = await db.query.guru.findFirst({ where: eq(guru.id, id) });
  const userRow = await db.query.users.findFirst({
    where: and(eq(users.guru_id, id), isNull(users.deleted_at)),
  });
  return {
    id: row!.id,
    nip: row!.nip,
    namaLengkap: row!.nama_lengkap,
    jenisKelamin: row!.jenis_kelamin,
    statusKepegawaian: row!.status_kepegawaian,
    isActive: row!.is_active,
    fotoFileId: row!.foto_file_id,
    punyaAkun: !!userRow,
  };
}

export async function deleteGuru(db: Database, id: string, periodId: string): Promise<void> {
  const existing = await db.query.guru.findFirst({ where: eq(guru.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const waliRombel = await db.query.rombel.findFirst({
    where: and(eq(rombel.wali_guru_id, id), eq(rombel.period_id, periodId), isNull(rombel.deleted_at)),
  });
  if (waliRombel) {
    throw new HTTPException(400, {
      message: `Tidak bisa menghapus guru yang masih menjadi wali kelas ${waliRombel.nama}.`,
    });
  }

  const tugasRow = await db.query.pembagianTugas.findFirst({
    where: and(eq(pembagianTugas.guru_id, id), eq(pembagianTugas.period_id, periodId)),
  });
  if (tugasRow) {
    throw new HTTPException(400, {
      message: "Tidak bisa menghapus guru yang masih punya tugas mengajar di periode ini.",
    });
  }

  const userRow = await db.query.users.findFirst({
    where: and(eq(users.guru_id, id), isNull(users.deleted_at)),
  });
  if (userRow) {
    throw new HTTPException(400, {
      message: "Tidak bisa menghapus guru yang masih punya akun login aktif. Nonaktifkan akunnya dulu.",
    });
  }

  await db
    .update(guru)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(eq(guru.id, id));
}

/** Cascade: menonaktifkan/mengaktifkan guru ikut menonaktifkan/mengaktifkan akun login-nya (jika ada). */
export async function setGuruActive(db: Database, id: string, isActive: boolean): Promise<void> {
  const existing = await db.query.guru.findFirst({ where: eq(guru.id, id) });
  if (!existing || existing.deleted_at) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  await db
    .update(guru)
    .set({ is_active: isActive, updated_at: new Date().toISOString() })
    .where(eq(guru.id, id));

  const userRow = await db.query.users.findFirst({
    where: and(eq(users.guru_id, id), isNull(users.deleted_at)),
  });
  if (userRow) {
    if (isActive) await reactivateUser(db, userRow.id);
    else await deactivateUser(db, userRow.id);
  }
}

export async function buatAkunGuru(
  db: Database,
  guruId: string,
  input: BuatAkunGuruInput,
): Promise<{ userId: string; username: string; tempPassword: string }> {
  const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!guruRow || guruRow.deleted_at) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const existingAkun = await db.query.users.findFirst({
    where: and(eq(users.guru_id, guruId), isNull(users.deleted_at)),
  });
  if (existingAkun) {
    throw new HTTPException(409, { message: "Guru ini sudah punya akun login." });
  }

  await assertRoleIdsExist(db, input.roleIds);

  const clash = await db.query.users.findFirst({ where: eq(users.username, input.username) });
  if (clash) throw new HTTPException(409, { message: "Username sudah dipakai." });

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword, DEFAULT_PBKDF2_ITERATIONS);
  const now = new Date().toISOString();
  const userId = generateId();

  await db.insert(users).values({
    id: userId,
    username: input.username,
    password_hash: passwordHash.hash,
    password_salt: passwordHash.salt,
    password_iterations: passwordHash.iterations,
    must_change_password: true,
    full_name: guruRow.nama_lengkap,
    email: guruRow.email,
    phone: guruRow.no_hp,
    account_type: "STAFF",
    status: "ACTIVE",
    guru_id: guruId,
    created_at: now,
    updated_at: now,
  });

  await db.insert(userRoles).values(
    input.roleIds.map((roleId) => ({
      id: generateId(),
      user_id: userId,
      role_id: roleId,
      created_at: now,
    })),
  );

  return { userId, username: input.username, tempPassword };
}

export async function addGuruAlias(db: Database, guruId: string, aliasNama: string): Promise<void> {
  const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!guruRow || guruRow.deleted_at) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const existing = await db.query.guruAlias.findFirst({
    where: and(eq(guruAlias.guru_id, guruId), eq(guruAlias.alias_nama, aliasNama)),
  });
  if (existing) return;

  await db.insert(guruAlias).values({
    id: generateId(),
    guru_id: guruId,
    alias_nama: aliasNama,
    created_at: new Date().toISOString(),
  });
}

export async function removeGuruAlias(db: Database, guruId: string, aliasNama: string): Promise<void> {
  await db
    .delete(guruAlias)
    .where(and(eq(guruAlias.guru_id, guruId), eq(guruAlias.alias_nama, aliasNama)));
}

export async function addTugasTambahan(
  db: Database,
  guruId: string,
  periodId: string,
  namaTugas: string,
  keterangan: string | null,
): Promise<void> {
  const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, guruId) });
  if (!guruRow || guruRow.deleted_at) throw new HTTPException(404, { message: "Guru tidak ditemukan." });

  const now = new Date().toISOString();
  await db.insert(guruTugasTambahan).values({
    id: generateId(),
    guru_id: guruId,
    period_id: periodId,
    nama_tugas: namaTugas,
    keterangan,
    created_at: now,
    updated_at: now,
  });
}

export async function removeTugasTambahan(db: Database, id: string): Promise<void> {
  await db.delete(guruTugasTambahan).where(eq(guruTugasTambahan.id, id));
}

export async function importGuruCommit(db: Database, rows: CreateGuruInput[]): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  const nipList = rows.map((r) => nullIfEmpty(r.nip)).filter((v): v is string => !!v);
  if (nipList.length > 0) {
    const clashes = await db
      .select({ nip: guru.nip })
      .from(guru)
      .where(and(sql`${guru.nip} IN ${nipList}`, isNull(guru.deleted_at)));
    if (clashes.length > 0) {
      throw new HTTPException(409, {
        message: `NIP berikut sudah terpakai: ${clashes.map((c) => c.nip).join(", ")}`,
      });
    }
  }

  const now = new Date().toISOString();
  const newRows = rows.map((r) => ({ id: generateId(), ...toDbValues(r), created_at: now, updated_at: now }));

  const chunks = chunkArray(newRows, 30);
  await db.batch([
    db.insert(guru).values(chunks[0]!),
    ...chunks.slice(1).map((chunk) => db.insert(guru).values(chunk)),
  ]);

  return { count: newRows.length };
}

export async function exportGuru(db: Database): Promise<GuruDetail[]> {
  const rows = await db.query.guru.findMany({ where: isNull(guru.deleted_at), orderBy: [asc(guru.nama_lengkap)] });
  const aliasRows = await db.query.guruAlias.findMany();
  const aliasByGuru = new Map<string, string[]>();
  for (const a of aliasRows) {
    const arr = aliasByGuru.get(a.guru_id) ?? [];
    arr.push(a.alias_nama);
    aliasByGuru.set(a.guru_id, arr);
  }
  const userRows = await db.query.users.findMany({ where: isNull(users.deleted_at) });
  const userByGuru = new Map(userRows.filter((u) => u.guru_id).map((u) => [u.guru_id as string, u]));

  return rows.map((row) => ({
    id: row.id,
    nip: row.nip,
    namaLengkap: row.nama_lengkap,
    jenisKelamin: row.jenis_kelamin,
    statusKepegawaian: row.status_kepegawaian,
    isActive: row.is_active,
    fotoFileId: row.foto_file_id,
    punyaAkun: userByGuru.has(row.id),
    namaTanpaGelar: row.nama_tanpa_gelar,
    nuptk: row.nuptk,
    tempatLahir: row.tempat_lahir,
    tanggalLahir: row.tanggal_lahir,
    noHp: row.no_hp,
    email: row.email,
    alamat: row.alamat,
    tanggalMulaiTugas: row.tanggal_mulai_tugas,
    aliasNama: aliasByGuru.get(row.id) ?? [],
    waliKelasRombel: null,
    tugasTambahan: [],
    mengajar: [],
    totalJpPerMinggu: 0,
    userId: userByGuru.get(row.id)?.id ?? null,
    username: userByGuru.get(row.id)?.username ?? null,
  }));
}
