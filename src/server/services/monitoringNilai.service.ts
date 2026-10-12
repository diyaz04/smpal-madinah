import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { pembagianTugas, rombel, mapel, guru, siswaKelas, nilaiAkhir, users } from "../db/schema";
import { kirimNotifikasi } from "./notifikasi.service";
import type { MonitoringKelengkapanCell } from "../../shared/types";

export async function getMonitoringKelengkapan(
  db: Database,
  periodId: string,
  scopedRombelIds: string[] | null,
): Promise<MonitoringKelengkapanCell[]> {
  const tugasConditions = [eq(pembagianTugas.period_id, periodId)];
  if (scopedRombelIds !== null) {
    if (scopedRombelIds.length === 0) return [];
    tugasConditions.push(sql`${pembagianTugas.rombel_id} IN ${scopedRombelIds}`);
  }

  const tugasRows = await db
    .select({
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      mapelId: mapel.id,
      mapelNama: mapel.nama,
      guruNama: guru.nama_lengkap,
    })
    .from(pembagianTugas)
    .innerJoin(rombel, eq(rombel.id, pembagianTugas.rombel_id))
    .innerJoin(mapel, eq(mapel.id, pembagianTugas.mapel_id))
    .innerJoin(guru, eq(guru.id, pembagianTugas.guru_id))
    .where(and(...tugasConditions));

  if (tugasRows.length === 0) return [];

  const cellMap = new Map<string, { rombelId: string; rombelNama: string; mapelId: string; mapelNama: string; guruNama: string[] }>();
  for (const r of tugasRows) {
    const key = `${r.rombelId}|${r.mapelId}`;
    const cell = cellMap.get(key) ?? { rombelId: r.rombelId, rombelNama: r.rombelNama, mapelId: r.mapelId, mapelNama: r.mapelNama, guruNama: [] };
    if (!cell.guruNama.includes(r.guruNama)) cell.guruNama.push(r.guruNama);
    cellMap.set(key, cell);
  }

  const rombelIds = [...new Set(tugasRows.map((r) => r.rombelId))];
  const siswaRows = await db
    .select({ rombelId: siswaKelas.rombel_id, siswaId: siswaKelas.siswa_id })
    .from(siswaKelas)
    .where(and(sql`${siswaKelas.rombel_id} IN ${rombelIds}`, eq(siswaKelas.period_id, periodId)));
  const totalSiswaByRombel = new Map<string, number>();
  for (const r of siswaRows) totalSiswaByRombel.set(r.rombelId, (totalSiswaByRombel.get(r.rombelId) ?? 0) + 1);

  const nilaiRows = await db
    .select({ rombelId: nilaiAkhir.rombel_id, mapelId: nilaiAkhir.mapel_id, nilaiAkhir: nilaiAkhir.nilai_akhir })
    .from(nilaiAkhir)
    .where(and(eq(nilaiAkhir.period_id, periodId), sql`${nilaiAkhir.rombel_id} IN ${rombelIds}`));
  const terisiByKey = new Map<string, number>();
  for (const r of nilaiRows) {
    if (r.nilaiAkhir === null) continue;
    const key = `${r.rombelId}|${r.mapelId}`;
    terisiByKey.set(key, (terisiByKey.get(key) ?? 0) + 1);
  }

  return [...cellMap.values()].map((cell) => {
    const key = `${cell.rombelId}|${cell.mapelId}`;
    const totalSiswa = totalSiswaByRombel.get(cell.rombelId) ?? 0;
    const terisi = terisiByKey.get(key) ?? 0;
    const jumlahBelumNilai = Math.max(0, totalSiswa - terisi);
    const status = terisi === 0 ? "belum" : jumlahBelumNilai === 0 && totalSiswa > 0 ? "lengkap" : "sebagian";
    return { ...cell, totalSiswa, jumlahBelumNilai, status };
  });
}

export async function kirimPengingatKelengkapan(
  db: Database,
  periodId: string,
  rombelId: string,
  mapelId: string,
): Promise<void> {
  const tugasRows = await db
    .select({ guruId: pembagianTugas.guru_id })
    .from(pembagianTugas)
    .where(and(eq(pembagianTugas.period_id, periodId), eq(pembagianTugas.rombel_id, rombelId), eq(pembagianTugas.mapel_id, mapelId)));
  if (tugasRows.length === 0) throw new HTTPException(404, { message: "Pembagian tugas tidak ditemukan." });

  const guruIds = tugasRows.map((t) => t.guruId);
  const userRows = await db.select({ id: users.id }).from(users).where(sql`${users.guru_id} IN ${guruIds}`);
  const userIds = userRows.map((u) => u.id);
  if (userIds.length === 0) return;

  const [rombelRow, mapelRow] = await Promise.all([
    db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) }),
    db.query.mapel.findFirst({ where: eq(mapel.id, mapelId) }),
  ]);

  await kirimNotifikasi(db, {
    userIds,
    judul: "Pengingat input nilai",
    isi: `Nilai ${mapelRow?.nama ?? "mapel"} untuk rombel ${rombelRow?.nama ?? ""} belum lengkap, mohon segera dilengkapi.`,
    tautan: "/akademik/input-nilai",
    modul: "input_nilai",
  });
}
