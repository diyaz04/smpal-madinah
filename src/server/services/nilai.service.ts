import { and, asc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  siswa,
  siswaKelas,
  rombel,
  mapel,
  tujuanPembelajaran,
  nilaiLingkup,
  nilaiUjian,
  nilaiAkhir,
  pembagianTugas,
} from "../db/schema";
import { generateId } from "../lib/id";
import { getGuruAssignments } from "./pembagianTugas.service";
import { getOrCreateRaportPengaturan } from "./raportPengaturan.service";
import { isRombelTerkunci } from "./raportKunciRombel.service";
import { hitungNilaiAkhir, tentukanPredikat } from "../../shared/nilai";
import type { SimpanNilaiInput } from "../../shared/schemas/nilai.schema";
import type { AuthUser } from "../../shared/types";
import type { AmpuanItem, InputNilaiKonteks, PredikatRange } from "../../shared/types";
import type { PermissionScope, Tingkat } from "../../shared/constants";

/** Daftar rombel+mapel yang boleh diakses — scope "semua" dapat semua pembagian_tugas periode itu, "milik_sendiri" cuma milik guru itu. */
export async function resolveAmpuan(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
): Promise<AmpuanItem[]> {
  if (scope === "milik_sendiri") {
    if (!user.guruId) return [];
    const rows = await getGuruAssignments(db, user.guruId, periodId);
    return rows.map((r) => ({ rombelId: r.rombelId, rombelNama: r.rombelNama, mapelId: r.mapelId, mapelNama: r.mapelNama, tingkat: r.tingkat }));
  }

  const rows = await db
    .select({
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      mapelId: mapel.id,
      mapelNama: mapel.nama,
      tingkat: rombel.tingkat,
    })
    .from(pembagianTugas)
    .innerJoin(rombel, eq(rombel.id, pembagianTugas.rombel_id))
    .innerJoin(mapel, eq(mapel.id, pembagianTugas.mapel_id))
    .where(eq(pembagianTugas.period_id, periodId))
    .orderBy(asc(rombel.tingkat), asc(rombel.nama));

  const unik = new Map<string, AmpuanItem>();
  for (const r of rows) unik.set(`${r.rombelId}|${r.mapelId}`, r);
  return [...unik.values()];
}

/** 403 kalau guru (scope milik_sendiri) mencoba akses rombel+mapel di luar pembagian_tugas-nya. */
export async function assertAmpu(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
  rombelId: string,
  mapelId: string,
): Promise<void> {
  if (scope !== "milik_sendiri") return;
  if (!user.guruId) throw new HTTPException(403, { message: "Akun ini tidak terhubung ke data guru." });

  const row = await db.query.pembagianTugas.findFirst({
    where: and(
      eq(pembagianTugas.guru_id, user.guruId),
      eq(pembagianTugas.period_id, periodId),
      eq(pembagianTugas.rombel_id, rombelId),
      eq(pembagianTugas.mapel_id, mapelId),
    ),
  });
  if (!row) throw new HTTPException(403, { message: "Anda tidak mengampu mapel ini di rombel tersebut." });
}

/** 403 kalau guru (scope milik_sendiri) mencoba kelola TP mapel+tingkat yang tidak pernah dia ajar di rombel manapun. */
export async function assertAmpuMapelTingkat(
  db: Database,
  user: AuthUser,
  scope: PermissionScope,
  periodId: string,
  mapelId: string,
  tingkat: Tingkat,
): Promise<void> {
  if (scope !== "milik_sendiri") return;
  if (!user.guruId) throw new HTTPException(403, { message: "Akun ini tidak terhubung ke data guru." });

  const row = await db
    .select({ id: pembagianTugas.id })
    .from(pembagianTugas)
    .innerJoin(rombel, eq(rombel.id, pembagianTugas.rombel_id))
    .where(
      and(
        eq(pembagianTugas.guru_id, user.guruId),
        eq(pembagianTugas.period_id, periodId),
        eq(pembagianTugas.mapel_id, mapelId),
        eq(rombel.tingkat, tingkat),
      ),
    )
    .limit(1);
  if (row.length === 0) throw new HTTPException(403, { message: "Anda tidak mengampu mapel ini di tingkat tersebut." });
}

function parsePredikatConfig(json: string): PredikatRange[] {
  const raw = JSON.parse(json) as { batas_bawah: number; label: string }[];
  return raw.map((r) => ({ batasBawah: r.batas_bawah, label: r.label }));
}

export async function getInputNilaiKonteks(
  db: Database,
  periodId: string,
  rombelId: string,
  mapelId: string,
): Promise<InputNilaiKonteks> {
  const rombelRow = await db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) });
  if (!rombelRow) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });
  const mapelRow = await db.query.mapel.findFirst({ where: eq(mapel.id, mapelId) });
  if (!mapelRow) throw new HTTPException(404, { message: "Mapel tidak ditemukan." });

  const [tpRows, siswaRows, pengaturan, terkunci] = await Promise.all([
    db.query.tujuanPembelajaran.findMany({
      where: and(
        eq(tujuanPembelajaran.period_id, periodId),
        eq(tujuanPembelajaran.mapel_id, mapelId),
        eq(tujuanPembelajaran.tingkat, rombelRow.tingkat),
      ),
      orderBy: [asc(tujuanPembelajaran.urutan)],
    }),
    db
      .select({ id: siswa.id, nama: siswa.nama_lengkap, nomorAbsen: siswaKelas.nomor_absen })
      .from(siswaKelas)
      .innerJoin(siswa, eq(siswa.id, siswaKelas.siswa_id))
      .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)))
      .orderBy(asc(siswaKelas.nomor_absen), asc(siswa.nama_lengkap)),
    getOrCreateRaportPengaturan(db, periodId),
    isRombelTerkunci(db, periodId, rombelId),
  ]);

  const siswaIds = siswaRows.map((s) => s.id);
  const [lingkupRows, ujianRows] = siswaIds.length
    ? await Promise.all([
        db
          .select({ siswaId: nilaiLingkup.siswa_id, tpId: nilaiLingkup.tp_id, nilai: nilaiLingkup.nilai })
          .from(nilaiLingkup)
          .where(and(eq(nilaiLingkup.period_id, periodId), eq(nilaiLingkup.mapel_id, mapelId), sql`${nilaiLingkup.siswa_id} IN ${siswaIds}`)),
        db
          .select({ siswaId: nilaiUjian.siswa_id, jenis: nilaiUjian.jenis, nilai: nilaiUjian.nilai })
          .from(nilaiUjian)
          .where(and(eq(nilaiUjian.period_id, periodId), eq(nilaiUjian.mapel_id, mapelId), sql`${nilaiUjian.siswa_id} IN ${siswaIds}`)),
      ])
    : [[], []];

  const lingkupBySiswa = new Map<string, Record<string, number | null>>();
  for (const r of lingkupRows) {
    const m = lingkupBySiswa.get(r.siswaId) ?? {};
    m[r.tpId] = r.nilai;
    lingkupBySiswa.set(r.siswaId, m);
  }
  const ujianBySiswa = new Map<string, { sts: number | null; sas: number | null }>();
  for (const r of ujianRows) {
    const m = ujianBySiswa.get(r.siswaId) ?? { sts: null, sas: null };
    if (r.jenis === "STS") m.sts = r.nilai;
    else m.sas = r.nilai;
    ujianBySiswa.set(r.siswaId, m);
  }

  const predikatConfig = parsePredikatConfig(mapelRow.predikat_config);
  const bobot = { bobotTp: pengaturan.bobotTp, bobotSts: pengaturan.bobotSts, bobotSas: pengaturan.bobotSas };
  const tpIds = tpRows.map((tp) => tp.id);

  const rows = siswaRows.map((s) => {
    const nilaiTp = lingkupBySiswa.get(s.id) ?? {};
    const ujian = ujianBySiswa.get(s.id) ?? { sts: null, sas: null };
    const nilaiAkhirDihitung = hitungNilaiAkhir(
      tpIds.map((tpId) => nilaiTp[tpId] ?? null),
      ujian.sts,
      ujian.sas,
      bobot,
      pengaturan.pembulatanDesimal,
    );
    return {
      siswaId: s.id,
      namaLengkap: s.nama,
      nomorAbsen: s.nomorAbsen,
      nilaiTp,
      nilaiSts: ujian.sts,
      nilaiSas: ujian.sas,
      nilaiAkhir: nilaiAkhirDihitung,
      predikat: tentukanPredikat(nilaiAkhirDihitung, predikatConfig),
    };
  });

  return {
    tpList: tpRows.map((tp) => ({ id: tp.id, kode: tp.kode, deskripsi: tp.deskripsi })),
    rows,
    bobot,
    pembulatanDesimal: pengaturan.pembulatanDesimal,
    predikatConfig,
    terkunci,
  };
}

export async function simpanNilai(
  db: Database,
  input: SimpanNilaiInput,
  periodId: string,
  actorUserId: string,
): Promise<{ count: number }> {
  const rombelRow = await db.query.rombel.findFirst({ where: eq(rombel.id, input.rombelId) });
  if (!rombelRow) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });
  const mapelRow = await db.query.mapel.findFirst({ where: eq(mapel.id, input.mapelId) });
  if (!mapelRow) throw new HTTPException(404, { message: "Mapel tidak ditemukan." });

  if (await isRombelTerkunci(db, periodId, input.rombelId)) {
    throw new HTTPException(400, { message: "Nilai rombel ini sudah terkunci, tidak bisa diubah." });
  }

  const tpRows = await db.query.tujuanPembelajaran.findMany({
    where: and(
      eq(tujuanPembelajaran.period_id, periodId),
      eq(tujuanPembelajaran.mapel_id, input.mapelId),
      eq(tujuanPembelajaran.tingkat, rombelRow.tingkat),
    ),
  });
  const validTpIds = new Set(tpRows.map((tp) => tp.id));

  const siswaIds = input.rows.map((r) => r.siswaId);
  const pengaturan = await getOrCreateRaportPengaturan(db, periodId);
  const bobot = { bobotTp: pengaturan.bobotTp, bobotSts: pengaturan.bobotSts, bobotSas: pengaturan.bobotSas };
  const predikatConfig = parsePredikatConfig(mapelRow.predikat_config);

  const now = new Date().toISOString();

  const lingkupValues = input.rows.flatMap((row) =>
    [...validTpIds]
      .filter((tpId) => tpId in row.nilaiTp)
      .map((tpId) => ({
        id: generateId(),
        period_id: periodId,
        siswa_id: row.siswaId,
        mapel_id: input.mapelId,
        tp_id: tpId,
        nilai: row.nilaiTp[tpId] ?? null,
        created_at: now,
        updated_at: now,
      })),
  );

  const ujianValues = input.rows.flatMap((row) => [
    {
      id: generateId(),
      period_id: periodId,
      siswa_id: row.siswaId,
      mapel_id: input.mapelId,
      jenis: "STS" as const,
      nilai: row.nilaiSts,
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      period_id: periodId,
      siswa_id: row.siswaId,
      mapel_id: input.mapelId,
      jenis: "SAS" as const,
      nilai: row.nilaiSas,
      created_at: now,
      updated_at: now,
    },
  ]);

  const akhirValues = input.rows.map((row) => {
    const tpIdsRelevan = [...validTpIds];
    const nilaiAkhirDihitung = hitungNilaiAkhir(
      tpIdsRelevan.map((tpId) => row.nilaiTp[tpId] ?? null),
      row.nilaiSts,
      row.nilaiSas,
      bobot,
      pengaturan.pembulatanDesimal,
    );
    return {
      id: generateId(),
      period_id: periodId,
      siswa_id: row.siswaId,
      rombel_id: input.rombelId,
      mapel_id: input.mapelId,
      nilai_akhir: nilaiAkhirDihitung,
      predikat: tentukanPredikat(nilaiAkhirDihitung, predikatConfig),
      tp_capaian_id: null,
      deskripsi: null,
      deskripsi_manual: false,
      diisi_oleh: actorUserId,
      final: false,
      created_at: now,
      updated_at: now,
    };
  });

  const statements = [
    db.delete(nilaiLingkup).where(and(eq(nilaiLingkup.period_id, periodId), eq(nilaiLingkup.mapel_id, input.mapelId), sql`${nilaiLingkup.siswa_id} IN ${siswaIds}`)),
    db.delete(nilaiUjian).where(and(eq(nilaiUjian.period_id, periodId), eq(nilaiUjian.mapel_id, input.mapelId), sql`${nilaiUjian.siswa_id} IN ${siswaIds}`)),
    db.delete(nilaiAkhir).where(and(eq(nilaiAkhir.period_id, periodId), eq(nilaiAkhir.rombel_id, input.rombelId), eq(nilaiAkhir.mapel_id, input.mapelId))),
    ...(lingkupValues.length ? [db.insert(nilaiLingkup).values(lingkupValues)] : []),
    db.insert(nilaiUjian).values(ujianValues),
    db.insert(nilaiAkhir).values(akhirValues),
  ];

  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);

  return { count: input.rows.length };
}
