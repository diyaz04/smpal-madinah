import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { siswa, siswaKelas, rombel, mapel, nilaiAkhir, legerPeringkat } from "../db/schema";
import { generateId } from "../lib/id";
import { hitungPeringkat } from "../../shared/peringkat";
import type { LegerKelas } from "../../shared/types";

/** Mapel yang punya sub (induk) tidak dapat kolom nilai sendiri — induk cuma tampil di raport (Tahap 6-4) sebagai judul grup. */
async function getMapelLeafUntukRaport(db: Database): Promise<{ id: string; nama: string; urutan: number }[]> {
  const semuaMapel = await db.query.mapel.findMany({
    where: and(isNull(mapel.deleted_at), eq(mapel.is_active, true), eq(mapel.tampil_raport, true)),
    orderBy: [asc(mapel.urutan_raport)],
  });
  const indukIds = new Set(semuaMapel.map((m) => m.induk_mapel_id).filter((v): v is string => !!v));
  return semuaMapel.filter((m) => !indukIds.has(m.id)).map((m) => ({ id: m.id, nama: m.nama, urutan: m.urutan_raport }));
}

export async function getLeger(db: Database, periodId: string, rombelId: string): Promise<LegerKelas> {
  const rombelRow = await db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) });
  if (!rombelRow) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });

  const [mapelColumns, siswaRows] = await Promise.all([
    getMapelLeafUntukRaport(db),
    db
      .select({ id: siswa.id, nama: siswa.nama_lengkap, nomorAbsen: siswaKelas.nomor_absen })
      .from(siswaKelas)
      .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
      .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)))
      .orderBy(asc(siswaKelas.nomor_absen), asc(siswa.nama_lengkap)),
  ]);

  const siswaIds = siswaRows.map((s) => s.id);
  const nilaiRows = siswaIds.length
    ? await db
        .select({ siswaId: nilaiAkhir.siswa_id, mapelId: nilaiAkhir.mapel_id, nilaiAkhir: nilaiAkhir.nilai_akhir })
        .from(nilaiAkhir)
        .where(and(eq(nilaiAkhir.period_id, periodId), eq(nilaiAkhir.rombel_id, rombelId), sql`${nilaiAkhir.siswa_id} IN ${siswaIds}`))
    : [];
  const nilaiBySiswa = new Map<string, Record<string, number | null>>();
  for (const r of nilaiRows) {
    const m = nilaiBySiswa.get(r.siswaId) ?? {};
    m[r.mapelId] = r.nilaiAkhir;
    nilaiBySiswa.set(r.siswaId, m);
  }

  const rekapAwal = siswaRows.map((s) => {
    const nilaiPerMapel = nilaiBySiswa.get(s.id) ?? {};
    const terisi = mapelColumns.map((m) => nilaiPerMapel[m.id] ?? null).filter((n): n is number => n !== null);
    const jumlah = terisi.reduce((sum, n) => sum + n, 0);
    const rataRata = terisi.length > 0 ? jumlah / terisi.length : null;
    return { siswaId: s.id, namaLengkap: s.nama, nomorAbsen: s.nomorAbsen, nilaiPerMapel, jumlah, rataRata };
  });

  const peringkatHasil = hitungPeringkat(rekapAwal.map((r) => ({ siswaId: r.siswaId, jumlah: r.jumlah })));
  const peringkatBySiswa = new Map(peringkatHasil.map((p) => [p.siswaId, p.peringkat]));

  const rows = rekapAwal.map((r) => ({ ...r, peringkat: peringkatBySiswa.get(r.siswaId) ?? null }));

  if (rows.length > 0) {
    const now = new Date().toISOString();
    const statements = [
      db.delete(legerPeringkat).where(and(eq(legerPeringkat.period_id, periodId), eq(legerPeringkat.rombel_id, rombelId))),
      db.insert(legerPeringkat).values(
        rows.map((r) => ({
          id: generateId(),
          period_id: periodId,
          rombel_id: rombelId,
          siswa_id: r.siswaId,
          jumlah_nilai: r.jumlah,
          rata_rata: r.rataRata,
          peringkat: r.peringkat ?? 0,
          dihitung_pada: now,
        })),
      ),
    ];
    await db.batch([statements[0]!, statements[1]!]);
  }

  return {
    mapelColumns: mapelColumns.map((m) => ({ id: m.id, nama: m.nama, urutan: m.urutan })),
    rows,
  };
}
