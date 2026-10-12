import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  rekapPoinSiswa,
  siswa,
  siswaKelas,
  rombel,
  academicPeriods,
  pelanggaran,
  pelanggaranJenis,
  pelanggaranKategori,
} from "../db/schema";
import type { RekapPeringkatPoinItem, RekapKategoriRombelItem, RekapJenisBulananItem } from "../../shared/types";
import type { Tingkat } from "../../shared/constants";

async function getRombelInfoBySiswa(
  db: Database,
  tahunAjaran: string,
): Promise<Map<string, { id: string; nama: string; tingkat: Tingkat }>> {
  const rows = await db
    .select({
      siswaId: siswaKelas.siswa_id,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      tingkat: rombel.tingkat,
    })
    .from(siswaKelas)
    .innerJoin(rombel, eq(siswaKelas.rombel_id, rombel.id))
    .innerJoin(academicPeriods, eq(siswaKelas.period_id, academicPeriods.id))
    .where(eq(academicPeriods.year_label, tahunAjaran));

  const map = new Map<string, { id: string; nama: string; tingkat: Tingkat }>();
  for (const r of rows) map.set(r.siswaId, { id: r.rombelId, nama: r.rombelNama, tingkat: r.tingkat });
  return map;
}

export interface PeringkatPoinQuery {
  tahunAjaran: string;
  tingkat?: Tingkat;
  rombelId?: string;
  limit?: number;
}

/** Peringkat poin tertinggi — membaca rekap_poin_siswa, bukan memindai tabel pelanggaran. */
export async function getPeringkatPoin(
  db: Database,
  query: PeringkatPoinQuery,
  scopedRombelIds: string[] | null,
): Promise<RekapPeringkatPoinItem[]> {
  const rows = await db
    .select({ siswaId: rekapPoinSiswa.siswa_id, totalPoin: rekapPoinSiswa.total_poin, jumlahPelanggaran: rekapPoinSiswa.jumlah_pelanggaran })
    .from(rekapPoinSiswa)
    .where(and(eq(rekapPoinSiswa.tahun_ajaran, query.tahunAjaran), sql`${rekapPoinSiswa.total_poin} > 0`))
    .orderBy(desc(rekapPoinSiswa.total_poin))
    .limit(Math.min(200, Math.max(1, query.limit ?? 50)));

  if (rows.length === 0) return [];

  const siswaIds = rows.map((r) => r.siswaId);
  const [siswaRows, rombelInfoBySiswa] = await Promise.all([
    db.select({ id: siswa.id, nama: siswa.nama_lengkap }).from(siswa).where(sql`${siswa.id} IN ${siswaIds}`),
    getRombelInfoBySiswa(db, query.tahunAjaran),
  ]);
  const siswaNamaById = new Map(siswaRows.map((s) => [s.id, s.nama]));

  let items: RekapPeringkatPoinItem[] = rows.map((r) => {
    const info = rombelInfoBySiswa.get(r.siswaId);
    return {
      siswaId: r.siswaId,
      siswaNama: siswaNamaById.get(r.siswaId) ?? "—",
      rombelId: info?.id ?? null,
      rombelNama: info?.nama ?? null,
      tingkat: info?.tingkat ?? null,
      totalPoin: r.totalPoin,
      jumlahPelanggaran: r.jumlahPelanggaran,
    };
  });

  if (query.tingkat) items = items.filter((i) => i.tingkat === query.tingkat);
  if (query.rombelId) items = items.filter((i) => i.rombelId === query.rombelId);
  if (scopedRombelIds !== null) items = items.filter((i) => i.rombelId !== null && scopedRombelIds.includes(i.rombelId));

  return items;
}

/** Jumlah pelanggaran per kategori per rombel — agregat terfilter tahun ajaran, bukan laporan lintas-tahun penuh. */
export async function getRekapKategoriPerRombel(
  db: Database,
  tahunAjaran: string,
  scopedRombelIds: string[] | null,
): Promise<RekapKategoriRombelItem[]> {
  const conditions = [eq(pelanggaran.tahun_ajaran, tahunAjaran), eq(pelanggaran.status, "tercatat")];
  if (scopedRombelIds !== null) {
    if (scopedRombelIds.length === 0) return [];
    conditions.push(sql`${pelanggaran.rombel_id} IN ${scopedRombelIds}`);
  }

  const rows = await db
    .select({
      rombelId: pelanggaran.rombel_id,
      rombelNama: rombel.nama,
      kategoriId: pelanggaranKategori.id,
      kategoriNama: pelanggaranKategori.nama,
      kategoriWarna: pelanggaranKategori.warna,
      jumlah: sql<number>`count(*)`,
    })
    .from(pelanggaran)
    .innerJoin(rombel, eq(pelanggaran.rombel_id, rombel.id))
    .innerJoin(pelanggaranJenis, eq(pelanggaran.jenis_id, pelanggaranJenis.id))
    .innerJoin(pelanggaranKategori, eq(pelanggaranJenis.kategori_id, pelanggaranKategori.id))
    .where(and(...conditions))
    .groupBy(pelanggaran.rombel_id, pelanggaranKategori.id)
    .orderBy(rombel.nama, pelanggaranKategori.urutan);

  // innerJoin ke `rombel` sudah menjamin rombelId tidak null (pelanggaran tanpa rombel tidak ikut join).
  return rows.map((r) => ({ ...r, rombelId: r.rombelId! }));
}

/** Jumlah pelanggaran per jenis per bulan — agregat pakai index pelanggaran(period_id, tanggal)/tahun_ajaran, bukan loop per-tanggal. */
export async function getRekapJenisPerBulan(
  db: Database,
  tahunAjaran: string,
  scopedRombelIds: string[] | null,
): Promise<RekapJenisBulananItem[]> {
  const conditions = [eq(pelanggaran.tahun_ajaran, tahunAjaran), eq(pelanggaran.status, "tercatat")];
  if (scopedRombelIds !== null) {
    if (scopedRombelIds.length === 0) return [];
    conditions.push(sql`${pelanggaran.rombel_id} IN ${scopedRombelIds}`);
  }

  const bulanExpr = sql<string>`substr(${pelanggaran.tanggal}, 1, 7)`;

  const rows = await db
    .select({
      bulan: bulanExpr,
      jenisId: pelanggaranJenis.id,
      jenisNama: pelanggaranJenis.nama,
      kategoriNama: pelanggaranKategori.nama,
      jumlah: sql<number>`count(*)`,
      totalPoin: sql<number>`sum(${pelanggaran.poin})`,
    })
    .from(pelanggaran)
    .innerJoin(pelanggaranJenis, eq(pelanggaran.jenis_id, pelanggaranJenis.id))
    .innerJoin(pelanggaranKategori, eq(pelanggaranJenis.kategori_id, pelanggaranKategori.id))
    .where(and(...conditions))
    .groupBy(bulanExpr, pelanggaranJenis.id)
    .orderBy(bulanExpr);

  return rows;
}
