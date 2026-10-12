import { and, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  sanksiSiswa,
  sanksiAmbang,
  siswa,
  siswaKelas,
  rombel,
  rekapPoinSiswa,
  tindakLanjut,
  users,
} from "../db/schema";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import type { CreateTindakLanjutInput } from "../../shared/schemas/tindakLanjut.schema";
import type { SanksiSiswaItem, TindakLanjutItem } from "../../shared/types";
import type { SanksiSiswaStatus } from "../../shared/constants";

export interface SanksiAktifQuery {
  status?: SanksiSiswaStatus;
  rombelId?: string;
}

export async function listSanksiAktif(
  db: Database,
  query: SanksiAktifQuery,
  tahunAjaran: string,
  periodId: string,
  scopedRombelIds: string[] | null,
): Promise<SanksiSiswaItem[]> {
  const conditions = [eq(sanksiSiswa.tahun_ajaran, tahunAjaran)];
  if (query.status) conditions.push(eq(sanksiSiswa.status, query.status));

  const rows = await db
    .select({
      id: sanksiSiswa.id,
      siswaId: sanksiSiswa.siswa_id,
      siswaNama: siswa.nama_lengkap,
      noHpOrtu: siswa.no_hp_ortu,
      ambangId: sanksiSiswa.ambang_id,
      ambangNama: sanksiAmbang.nama,
      poinMinimal: sanksiAmbang.poin_minimal,
      tercapaiPada: sanksiSiswa.tercapai_pada,
      status: sanksiSiswa.status,
    })
    .from(sanksiSiswa)
    .innerJoin(siswa, eq(sanksiSiswa.siswa_id, siswa.id))
    .innerJoin(sanksiAmbang, eq(sanksiSiswa.ambang_id, sanksiAmbang.id))
    .where(and(...conditions))
    .orderBy(desc(sanksiSiswa.tercapai_pada));

  if (rows.length === 0) return [];

  const siswaIds = [...new Set(rows.map((r) => r.siswaId))];
  const [kelasRows, rekapRows] = await Promise.all([
    db
      .select({ siswaId: siswaKelas.siswa_id, rombelId: siswaKelas.rombel_id })
      .from(siswaKelas)
      .where(and(sql`${siswaKelas.siswa_id} IN ${siswaIds}`, eq(siswaKelas.period_id, periodId))),
    db
      .select({ siswaId: rekapPoinSiswa.siswa_id, totalPoin: rekapPoinSiswa.total_poin })
      .from(rekapPoinSiswa)
      .where(and(sql`${rekapPoinSiswa.siswa_id} IN ${siswaIds}`, eq(rekapPoinSiswa.tahun_ajaran, tahunAjaran))),
  ]);
  const rombelBySiswa = new Map(kelasRows.map((k) => [k.siswaId, k.rombelId]));
  const totalPoinBySiswa = new Map(rekapRows.map((r) => [r.siswaId, r.totalPoin]));

  const rombelIds = [...new Set(kelasRows.map((k) => k.rombelId))];
  const rombelRows = rombelIds.length
    ? await db.select({ id: rombel.id, nama: rombel.nama }).from(rombel).where(sql`${rombel.id} IN ${rombelIds}`)
    : [];
  const rombelNamaById = new Map(rombelRows.map((r) => [r.id, r.nama]));

  let items: SanksiSiswaItem[] = rows.map((r) => {
    const rombelId = rombelBySiswa.get(r.siswaId) ?? null;
    return {
      id: r.id,
      siswaId: r.siswaId,
      siswaNama: r.siswaNama,
      rombelId,
      rombelNama: rombelId ? rombelNamaById.get(rombelId) ?? null : null,
      totalPoin: totalPoinBySiswa.get(r.siswaId) ?? 0,
      tahunAjaran,
      ambangId: r.ambangId,
      ambangNama: r.ambangNama,
      poinMinimal: r.poinMinimal,
      tercapaiPada: r.tercapaiPada,
      status: r.status,
      noHpOrtu: r.noHpOrtu,
    };
  });

  if (query.rombelId) items = items.filter((i) => i.rombelId === query.rombelId);
  if (scopedRombelIds !== null) items = items.filter((i) => i.rombelId !== null && scopedRombelIds.includes(i.rombelId));

  return items;
}

export async function listRiwayatTindakLanjut(db: Database, sanksiSiswaId: string): Promise<TindakLanjutItem[]> {
  const rows = await db
    .select({
      id: tindakLanjut.id,
      sanksiSiswaId: tindakLanjut.sanksi_siswa_id,
      pelanggaranId: tindakLanjut.pelanggaran_id,
      tanggal: tindakLanjut.tanggal,
      jenis: tindakLanjut.jenis,
      hasil: tindakLanjut.hasil,
      petugasUserId: tindakLanjut.petugas_user_id,
      petugasNama: users.full_name,
      lampiranFileId: tindakLanjut.lampiran_file_id,
    })
    .from(tindakLanjut)
    .innerJoin(users, eq(tindakLanjut.petugas_user_id, users.id))
    .where(eq(tindakLanjut.sanksi_siswa_id, sanksiSiswaId))
    .orderBy(desc(tindakLanjut.tanggal));

  return rows;
}

export async function createTindakLanjut(
  db: Database,
  input: CreateTindakLanjutInput,
  actorUserId: string,
): Promise<{ id: string }> {
  const sanksi = await db.query.sanksiSiswa.findFirst({ where: eq(sanksiSiswa.id, input.sanksiSiswaId) });
  if (!sanksi) throw new HTTPException(404, { message: "Sanksi tidak ditemukan." });
  if (sanksi.status === "dibatalkan") {
    throw new HTTPException(400, { message: "Sanksi ini sudah dibatalkan otomatis (poin sudah turun di bawah ambang)." });
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db.batch([
    db.insert(tindakLanjut).values({
      id,
      sanksi_siswa_id: input.sanksiSiswaId,
      pelanggaran_id: null,
      tanggal: input.tanggal,
      jenis: input.jenis,
      hasil: nullIfEmpty(input.hasil),
      petugas_user_id: actorUserId,
      lampiran_file_id: input.lampiranFileId,
      created_at: now,
      updated_at: now,
    }),
    db.update(sanksiSiswa).set({ status: input.statusBaru, updated_at: now }).where(eq(sanksiSiswa.id, input.sanksiSiswaId)),
  ]);

  return { id };
}
