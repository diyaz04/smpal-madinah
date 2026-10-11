import { and, eq, isNull, lte, gte, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { agenda, guru, kalenderEntri } from "../db/schema";
import { getPertemuanUntukTanggal } from "./pertemuan.service";
import { getHariFromTanggal } from "../../shared/tanggal";
import type { RekapMengajarGuruItem } from "../../shared/types";
import type { Hari } from "../../shared/constants";

const HARI_LIST: Hari[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export interface RekapMengajarQuery {
  bulan: string; // YYYY-MM
  guruId?: string;
}

/**
 * Rekap keterlaksanaan mengajar per guru untuk satu bulan. jpTerjadwal
 * dihitung dari jadwal MINGGUAN (6 panggilan getPertemuanUntukTanggal, satu
 * per hari SENIN-SABTU — jadwal_versi aktif tidak bergantung tanggal spesifik)
 * dikalikan jumlah kemunculan tiap hari-of-week dalam bulan itu (dikurangi
 * hari libur kalender akademik), BUKAN dengan loop per-tanggal (hemat kuota —
 * tetap di bawah 50 subrequest Workers meskipun untuk 1 bulan penuh).
 * Realisasi (terisi/digantikan/kosong/terlambat) diagregasi langsung dari
 * tabel agenda bulan tsb.
 */
export async function getRekapMengajarGuru(
  db: Database,
  periodId: string,
  query: RekapMengajarQuery,
): Promise<RekapMengajarGuruItem[]> {
  const [tahun, bulanNum] = query.bulan.split("-").map(Number) as [number, number];
  const tanggalAwal = `${query.bulan}-01`;
  const jumlahHariBulan = new Date(tahun, bulanNum, 0).getDate();
  const tanggalAkhir = `${query.bulan}-${String(jumlahHariBulan).padStart(2, "0")}`;

  const jpPerGuruPerHari = new Map<string, Map<Hari, number>>();
  for (const hari of HARI_LIST) {
    const perRombel = await getPertemuanUntukTanggal(db, periodId, hari);
    for (const { pertemuan } of perRombel) {
      for (const p of pertemuan) {
        for (const guruId of p.guruIds) {
          const m = jpPerGuruPerHari.get(guruId) ?? new Map<Hari, number>();
          m.set(hari, (m.get(hari) ?? 0) + p.jumlahJp);
          jpPerGuruPerHari.set(guruId, m);
        }
      }
    }
  }

  const entriLibur = await db.query.kalenderEntri.findMany({
    where: and(
      eq(kalenderEntri.period_id, periodId),
      eq(kalenderEntri.kbm_ditiadakan, true),
      eq(kalenderEntri.cakupan, "SEMUA"),
      isNull(kalenderEntri.deleted_at),
      lte(kalenderEntri.tanggal_mulai, tanggalAkhir),
      gte(kalenderEntri.tanggal_selesai, tanggalAwal),
    ),
  });
  function isLiburTanggal(tanggal: string): boolean {
    return entriLibur.some((e) => tanggal >= e.tanggal_mulai && tanggal <= e.tanggal_selesai);
  }

  const kemunculanHari = new Map<Hari, number>();
  for (let d = 1; d <= jumlahHariBulan; d++) {
    const tanggal = `${query.bulan}-${String(d).padStart(2, "0")}`;
    const hari = getHariFromTanggal(tanggal);
    if (!hari || isLiburTanggal(tanggal)) continue;
    kemunculanHari.set(hari, (kemunculanHari.get(hari) ?? 0) + 1);
  }

  const jpTerjadwalByGuru = new Map<string, number>();
  for (const [guruId, m] of jpPerGuruPerHari) {
    let total = 0;
    for (const [hari, jp] of m) total += jp * (kemunculanHari.get(hari) ?? 0);
    jpTerjadwalByGuru.set(guruId, total);
  }

  const agendaRows = await db
    .select({
      guruId: agenda.guru_id,
      guruJadwalId: agenda.guru_jadwal_id,
      status: agenda.status,
      isPengganti: agenda.is_pengganti,
      diisiTerlambat: agenda.diisi_terlambat,
      jumlahJp: agenda.jumlah_jp,
    })
    .from(agenda)
    .where(and(sql`${agenda.tanggal} >= ${tanggalAwal}`, sql`${agenda.tanggal} <= ${tanggalAkhir}`));

  interface Stat {
    jpTerisiSendiri: number;
    jpDigantikan: number;
    jpKosong: number;
    jpTerlambat: number;
    jpIsiSebagaiPengganti: number;
  }
  const statByGuru = new Map<string, Stat>();
  function ensure(guruId: string): Stat {
    const existing = statByGuru.get(guruId);
    if (existing) return existing;
    const fresh: Stat = { jpTerisiSendiri: 0, jpDigantikan: 0, jpKosong: 0, jpTerlambat: 0, jpIsiSebagaiPengganti: 0 };
    statByGuru.set(guruId, fresh);
    return fresh;
  }

  for (const row of agendaRows) {
    if (row.isPengganti) {
      if (row.status === "terisi") {
        ensure(row.guruJadwalId).jpDigantikan += row.jumlahJp;
        ensure(row.guruId).jpIsiSebagaiPengganti += row.jumlahJp;
      } else {
        ensure(row.guruJadwalId).jpKosong += row.jumlahJp;
      }
    } else if (row.status === "jam_kosong") {
      ensure(row.guruId).jpKosong += row.jumlahJp;
    } else {
      const s = ensure(row.guruId);
      s.jpTerisiSendiri += row.jumlahJp;
      if (row.diisiTerlambat) s.jpTerlambat += row.jumlahJp;
    }
  }

  let guruIds = new Set<string>([...jpTerjadwalByGuru.keys(), ...statByGuru.keys()]);
  if (query.guruId) guruIds = new Set(guruIds.has(query.guruId) ? [query.guruId] : []);
  if (guruIds.size === 0) return [];

  const guruRows = await db
    .select({ id: guru.id, nama: guru.nama_lengkap })
    .from(guru)
    .where(sql`${guru.id} IN ${[...guruIds]}`);
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));

  return [...guruIds]
    .map((guruId) => {
      const jpTerjadwal = jpTerjadwalByGuru.get(guruId) ?? 0;
      const s = statByGuru.get(guruId) ?? {
        jpTerisiSendiri: 0,
        jpDigantikan: 0,
        jpKosong: 0,
        jpTerlambat: 0,
        jpIsiSebagaiPengganti: 0,
      };
      const persenKeterlaksanaan = jpTerjadwal > 0 ? Math.round((s.jpTerisiSendiri / jpTerjadwal) * 1000) / 10 : 0;
      return {
        guruId,
        guruNama: guruNamaById.get(guruId) ?? "—",
        jpTerjadwal,
        ...s,
        persenKeterlaksanaan,
      };
    })
    .sort((a, b) => a.guruNama.localeCompare(b.guruNama));
}
