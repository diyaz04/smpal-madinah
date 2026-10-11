import { and, eq, sql, ne, lt, or, desc, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import {
  agenda,
  absensi,
  jadwalPengganti,
  rombel,
  mapel,
  guru,
  siswa,
  siswaKelas,
  izinHarianSiswa,
  rekapHarianRombel,
  absensiHarian,
  jadwalVersi,
} from "../db/schema";
import { getPertemuanUntukTanggal } from "./pertemuan.service";
import { recomputeStatusHarianRombel } from "./statusHarian.service";
import { getSetting } from "./settings.service";
import { generateId } from "../lib/id";
import { nullIfEmpty } from "../lib/text";
import { getHariFromTanggal, addDays } from "../../shared/tanggal";
import { nowWib } from "../lib/waktu";
import { normalizeCursorLimit, buildCursorResult, decodeCursor } from "../lib/paginate";
import { DEFAULT_AGENDA_BATAS_EDIT } from "../../shared/constants";
import type { SubmitAgendaInput } from "../../shared/schemas/agenda.schema";
import type {
  JadwalHariIniItem,
  JadwalHariIniStatus,
  AgendaFormContext,
  AbsensiItem,
  RiwayatMateriItem,
  CursorPaginatedResult,
} from "../../shared/types";
import type { PermissionScope } from "../../shared/constants";

export function determineStatus(tanggal: string, slotMulai: string, slotSelesai: string): JadwalHariIniStatus {
  const { tanggal: todayWib, jam: nowJam } = nowWib();
  if (tanggal > todayWib) return "belum_waktunya";
  if (tanggal < todayWib) return "belum_diisi";
  if (nowJam < slotMulai) return "belum_waktunya";
  if (nowJam < slotSelesai) return "bisa_diisi";
  return "belum_diisi";
}

export async function getJadwalHariIni(
  db: Database,
  guruId: string,
  tanggal: string,
  periodId: string,
): Promise<JadwalHariIniItem[]> {
  const hari = getHariFromTanggal(tanggal);
  if (!hari) return [];

  const perRombel = await getPertemuanUntukTanggal(db, periodId, hari);
  if (perRombel.length === 0) return [];

  const penggantiRows = await db.query.jadwalPengganti.findMany({
    where: eq(jadwalPengganti.tanggal, tanggal),
  });
  const penggantiBySlotRombel = new Map(penggantiRows.map((p) => [`${p.jadwal_slot_id}|${p.rombel_id}`, p]));

  // Kumpulkan pertemuan relevan: milik sendiri (dan belum dialihkan ke pengganti lain) + yang digantikan guru ini.
  type Relevant = { rombelId: string; pertemuan: (typeof perRombel)[number]["pertemuan"][number]; isPengganti: boolean; guruAsliId: string | null };
  const relevant: Relevant[] = [];

  for (const { rombelId, pertemuan } of perRombel) {
    for (const p of pertemuan) {
      const anyPenggantiForSlot = p.slotIds.some((sid) => penggantiBySlotRombel.has(`${sid}|${rombelId}`));
      const penggantiEntry = p.slotIds
        .map((sid) => penggantiBySlotRombel.get(`${sid}|${rombelId}`))
        .find((v) => v);

      if (p.guruIds.includes(guruId) && !anyPenggantiForSlot) {
        relevant.push({ rombelId, pertemuan: p, isPengganti: false, guruAsliId: null });
      } else if (penggantiEntry?.guru_pengganti_id === guruId) {
        relevant.push({ rombelId, pertemuan: p, isPengganti: true, guruAsliId: penggantiEntry.guru_asli_id });
      }
    }
  }
  if (relevant.length === 0) return [];

  const rombelIds = [...new Set(relevant.map((r) => r.rombelId))];
  const mapelIds = [...new Set(relevant.map((r) => r.pertemuan.mapelId).filter((v): v is string => !!v))];
  const guruAsliIds = [...new Set(relevant.map((r) => r.guruAsliId).filter((v): v is string => !!v))];

  const rombelRows = rombelIds.length
    ? await db.select({ id: rombel.id, nama: rombel.nama }).from(rombel).where(sql`${rombel.id} IN ${rombelIds}`)
    : [];
  const mapelRows = mapelIds.length
    ? await db.select({ id: mapel.id, nama: mapel.nama }).from(mapel).where(sql`${mapel.id} IN ${mapelIds}`)
    : [];
  const guruRows = guruAsliIds.length
    ? await db.select({ id: guru.id, nama: guru.nama_lengkap }).from(guru).where(sql`${guru.id} IN ${guruAsliIds}`)
    : [];
  const rombelNamaById = new Map(rombelRows.map((r) => [r.id, r.nama]));
  const mapelNamaById = new Map(mapelRows.map((m) => [m.id, m.nama]));
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));

  const agendaRows = await db
    .select({ id: agenda.id, rombelId: agenda.rombel_id, slotMulai: agenda.slot_mulai })
    .from(agenda)
    .where(and(eq(agenda.tanggal, tanggal), sql`${agenda.rombel_id} IN ${rombelIds}`));
  const agendaByKey = new Map(agendaRows.map((a) => [`${a.rombelId}|${a.slotMulai}`, a.id]));

  const agendaIds = agendaRows.map((a) => a.id);
  const tidakHadirRows = agendaIds.length
    ? await db
        .select({ agendaId: absensi.agenda_id, count: sql<number>`COUNT(*)` })
        .from(absensi)
        .where(sql`${absensi.agenda_id} IN ${agendaIds}`)
        .groupBy(absensi.agenda_id)
    : [];
  const tidakHadirByAgenda = new Map(tidakHadirRows.map((r) => [r.agendaId, Number(r.count)]));

  return relevant.map(({ rombelId, pertemuan: p, isPengganti, guruAsliId }) => {
    const agendaId = agendaByKey.get(`${rombelId}|${p.slotMulai}`) ?? null;
    return {
      rombelId,
      rombelNama: rombelNamaById.get(rombelId) ?? "—",
      mapelId: p.mapelId,
      mapelNama: p.mapelId ? (mapelNamaById.get(p.mapelId) ?? null) : null,
      jamKeMulai: p.jamKeMulai,
      jamKeSelesai: p.jamKeSelesai,
      slotMulai: p.slotMulai,
      slotSelesai: p.slotSelesai,
      jumlahJp: p.jumlahJp,
      status: agendaId ? "sudah_diisi" : determineStatus(tanggal, p.slotMulai, p.slotSelesai),
      isPengganti,
      guruAsliNama: guruAsliId ? (guruNamaById.get(guruAsliId) ?? null) : null,
      agendaId,
      jumlahTidakHadir: agendaId ? (tidakHadirByAgenda.get(agendaId) ?? 0) : null,
    };
  }).sort((a, b) => a.slotMulai.localeCompare(b.slotMulai));
}

interface AgendaFormParams {
  rombelId: string;
  mapelId: string | null;
  tanggal: string;
  slotMulai: string;
  guruId: string;
}

export async function getAgendaFormContext(db: Database, params: AgendaFormParams): Promise<AgendaFormContext> {
  const hari = getHariFromTanggal(params.tanggal);
  if (!hari) throw new HTTPException(400, { message: "Tanggal tidak valid." });

  const perRombel = await getPertemuanUntukTanggal(db, await resolvePeriodIdFromRombel(db, params.rombelId), hari, {
    rombelId: params.rombelId,
  });
  const pertemuan = perRombel[0]?.pertemuan.find((p) => p.slotMulai === params.slotMulai);
  if (!pertemuan) throw new HTTPException(404, { message: "Pertemuan tidak ditemukan di jadwal aktif." });

  const rombelRow = await db.query.rombel.findFirst({ where: eq(rombel.id, params.rombelId) });
  if (!rombelRow) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });
  const mapelRow = pertemuan.mapelId
    ? await db.query.mapel.findFirst({ where: eq(mapel.id, pertemuan.mapelId) })
    : null;

  // Materi terakhir di kelas ini utk mapel ini.
  const materiTerakhirRow = pertemuan.mapelId
    ? await db
        .select({ tanggal: agenda.tanggal, materi: agenda.materi, guruId: agenda.guru_id })
        .from(agenda)
        .where(
          and(
            eq(agenda.rombel_id, params.rombelId),
            eq(agenda.mapel_id, pertemuan.mapelId),
            eq(agenda.status, "terisi"),
            ne(agenda.tanggal, params.tanggal),
          ),
        )
        .orderBy(desc(agenda.tanggal))
        .limit(1)
    : [];
  let materiTerakhir: AgendaFormContext["materiTerakhir"] = null;
  if (materiTerakhirRow.length > 0) {
    const row = materiTerakhirRow[0]!;
    const guruRow = await db.query.guru.findFirst({ where: eq(guru.id, row.guruId) });
    materiTerakhir = { tanggal: row.tanggal, materi: row.materi, guruNama: guruRow?.nama_lengkap ?? "—" };
  }

  // Saran materi dari kelas paralel (guru + mapel sama, rombel beda).
  const saranRows = pertemuan.mapelId
    ? await db
        .select({ materi: agenda.materi })
        .from(agenda)
        .where(
          and(
            eq(agenda.guru_id, params.guruId),
            eq(agenda.mapel_id, pertemuan.mapelId),
            ne(agenda.rombel_id, params.rombelId),
            eq(agenda.status, "terisi"),
          ),
        )
        .orderBy(desc(agenda.tanggal))
        .limit(5)
    : [];
  const saranMateri = [...new Set(saranRows.map((r) => r.materi))];

  // Roster siswa + prefill.
  const rosterRows = await db
    .select({
      id: siswa.id,
      namaLengkap: siswa.nama_lengkap,
      fotoFileId: siswa.foto_file_id,
      nomorAbsen: siswaKelas.nomor_absen,
    })
    .from(siswaKelas)
    .innerJoin(siswa, eq(siswaKelas.siswa_id, siswa.id))
    .where(and(eq(siswaKelas.rombel_id, params.rombelId), eq(siswaKelas.period_id, rombelRow.period_id)))
    .orderBy(asc(siswaKelas.nomor_absen));

  const existingAgendaRow = await db.query.agenda.findFirst({
    where: and(eq(agenda.rombel_id, params.rombelId), eq(agenda.tanggal, params.tanggal), eq(agenda.slot_mulai, params.slotMulai)),
  });

  const siswaIds = rosterRows.map((r) => r.id);
  const prefillMap = new Map<string, { status: AbsensiItem["status"]; sumber: AbsensiItem["sumberPrefill"] }>();

  if (existingAgendaRow) {
    // Edit: prefill dari absensi yang sudah tersimpan.
    const existingAbsensi = await db.query.absensi.findMany({ where: eq(absensi.agenda_id, existingAgendaRow.id) });
    for (const a of existingAbsensi) prefillMap.set(a.siswa_id, { status: a.status, sumber: null });
  } else {
    // Baru: prefill dari jam sebelumnya hari sama, lalu ditimpa izin harian (lebih otoritatif).
    const earlierAbsensi = await db
      .select({ siswaId: absensi.siswa_id, status: absensi.status, slotMulai: agenda.slot_mulai })
      .from(absensi)
      .innerJoin(agenda, eq(absensi.agenda_id, agenda.id))
      .where(
        and(
          eq(agenda.rombel_id, params.rombelId),
          eq(agenda.tanggal, params.tanggal),
          sql`${agenda.slot_mulai} < ${params.slotMulai}`,
        ),
      );
    const latestBySiswa = new Map<string, { status: string; slotMulai: string }>();
    for (const r of earlierAbsensi) {
      if (!["A", "S", "I"].includes(r.status)) continue;
      const existingLatest = latestBySiswa.get(r.siswaId);
      if (!existingLatest || r.slotMulai > existingLatest.slotMulai) {
        latestBySiswa.set(r.siswaId, { status: r.status, slotMulai: r.slotMulai });
      }
    }
    for (const [sid, v] of latestBySiswa) {
      prefillMap.set(sid, { status: v.status as AbsensiItem["status"], sumber: "jam_sebelumnya" });
    }

    if (siswaIds.length > 0) {
      const izinRows = await db
        .select({ siswaId: izinHarianSiswa.siswa_id, status: izinHarianSiswa.status })
        .from(izinHarianSiswa)
        .where(
          and(
            sql`${izinHarianSiswa.siswa_id} IN ${siswaIds}`,
            sql`${izinHarianSiswa.tanggal_mulai} <= ${params.tanggal}`,
            sql`${izinHarianSiswa.tanggal_selesai} >= ${params.tanggal}`,
            sql`${izinHarianSiswa.deleted_at} IS NULL`,
          ),
        );
      for (const r of izinRows) {
        prefillMap.set(r.siswaId, { status: r.status as AbsensiItem["status"], sumber: "izin_harian" });
      }
    }
  }

  const existingAbsensiRows = existingAgendaRow
    ? await db.query.absensi.findMany({ where: eq(absensi.agenda_id, existingAgendaRow.id) })
    : [];
  const ketByS = new Map(existingAbsensiRows.map((a) => [a.siswa_id, a.keterangan]));

  const siswaList: AbsensiItem[] = rosterRows.map((r) => {
    const prefill = prefillMap.get(r.id);
    return {
      siswaId: r.id,
      namaLengkap: r.namaLengkap,
      nomorAbsen: r.nomorAbsen,
      fotoFileId: r.fotoFileId,
      status: prefill?.status ?? null,
      keterangan: ketByS.get(r.id) ?? null,
      sumberPrefill: prefill?.sumber ?? null,
    };
  });

  return {
    rombelId: params.rombelId,
    rombelNama: rombelRow.nama,
    mapelId: pertemuan.mapelId,
    mapelNama: mapelRow?.nama ?? null,
    tanggal: params.tanggal,
    hari,
    jamKeMulai: pertemuan.jamKeMulai,
    jamKeSelesai: pertemuan.jamKeSelesai,
    slotMulai: pertemuan.slotMulai,
    slotSelesai: pertemuan.slotSelesai,
    jumlahJp: pertemuan.jumlahJp,
    materiTerakhir,
    saranMateri,
    siswa: siswaList,
    existingAgenda: existingAgendaRow
      ? {
          id: existingAgendaRow.id,
          materi: existingAgendaRow.materi,
          kegiatan: existingAgendaRow.kegiatan,
          catatan: existingAgendaRow.catatan,
          status: existingAgendaRow.status,
        }
      : null,
  };
}

async function resolvePeriodIdFromRombel(db: Database, rombelId: string): Promise<string> {
  const row = await db.query.rombel.findFirst({ where: eq(rombel.id, rombelId) });
  if (!row) throw new HTTPException(404, { message: "Rombel tidak ditemukan." });
  return row.period_id;
}

export async function submitAgenda(
  db: Database,
  input: SubmitAgendaInput,
  actor: { userId: string; guruId: string | null },
  scope: PermissionScope,
): Promise<{ agendaId: string }> {
  const periodId = await resolvePeriodIdFromRombel(db, input.rombelId);
  const hari = getHariFromTanggal(input.tanggal);
  if (!hari) throw new HTTPException(400, { message: "Tanggal tidak valid." });

  const perRombel = await getPertemuanUntukTanggal(db, periodId, hari, { rombelId: input.rombelId });
  const pertemuan = perRombel[0]?.pertemuan.find((p) => p.slotMulai === input.slotMulai);
  if (!pertemuan) throw new HTTPException(404, { message: "Pertemuan tidak ditemukan di jadwal aktif." });

  const versiAktif = await db.query.jadwalVersi.findFirst({
    where: and(eq(jadwalVersi.period_id, periodId), eq(jadwalVersi.status, "aktif")),
    columns: { id: true },
  });

  const penggantiRow = await db.query.jadwalPengganti.findFirst({
    where: and(eq(jadwalPengganti.rombel_id, input.rombelId), eq(jadwalPengganti.tanggal, input.tanggal)),
  });
  const isPenggantiUntukSlot = penggantiRow && pertemuan.slotIds.includes(penggantiRow.jadwal_slot_id);

  if (scope === "milik_sendiri") {
    const guruId = actor.guruId;
    if (!guruId) throw new HTTPException(403, { message: "Akun ini tidak terhubung ke data guru." });
    const adalahGuruAsli = pertemuan.guruIds.includes(guruId);
    const adalahPengganti = isPenggantiUntukSlot && penggantiRow!.guru_pengganti_id === guruId;
    if (!adalahGuruAsli && !adalahPengganti) {
      throw new HTTPException(403, { message: "Anda tidak terjadwal mengajar di pertemuan ini." });
    }
  }

  const { tanggal: todayWib, jam: nowJam } = nowWib();
  const existing = await db.query.agenda.findFirst({
    where: and(eq(agenda.rombel_id, input.rombelId), eq(agenda.tanggal, input.tanggal), eq(agenda.slot_mulai, input.slotMulai)),
  });

  if (!existing) {
    if (input.tanggal > todayWib || (input.tanggal === todayWib && nowJam < pertemuan.slotMulai)) {
      throw new HTTPException(400, { message: "Belum waktunya mengisi agenda ini." });
    }
  }

  if (existing && scope === "milik_sendiri") {
    const batasEditSetting = await getSetting<{ hariSetelah: number; jam: string }>(db, "agenda_batas_edit");
    const batasEdit = batasEditSetting ?? DEFAULT_AGENDA_BATAS_EDIT;
    const batasTanggal = addDays(input.tanggal, batasEdit.hariSetelah);
    const lewatBatas = todayWib > batasTanggal || (todayWib === batasTanggal && nowJam > batasEdit.jam);
    if (lewatBatas) {
      throw new HTTPException(403, { message: "Batas waktu edit agenda sudah lewat. Hubungi Admin untuk perubahan." });
    }
  }

  const rosterRows = await db
    .select({ siswaId: siswaKelas.siswa_id })
    .from(siswaKelas)
    .where(and(eq(siswaKelas.rombel_id, input.rombelId), eq(siswaKelas.period_id, periodId)));
  const rosterIds = new Set(rosterRows.map((r) => r.siswaId));
  const invalidSiswa = input.absensi.find((a) => !rosterIds.has(a.siswaId));
  if (invalidSiswa) {
    throw new HTTPException(400, { message: "Ada siswa yang bukan anggota rombel ini." });
  }

  const now = new Date().toISOString();
  const diisiTerlambat = existing
    ? existing.diisi_terlambat
    : input.tanggal < todayWib || (input.tanggal === todayWib && nowJam >= pertemuan.slotSelesai);
  const guruJadwalId = pertemuan.guruIds[0] ?? actor.guruId ?? "";
  const jumlahSiswa = rosterIds.size;
  const agendaId = existing?.id ?? generateId();

  const mapelId = input.mapelId ?? pertemuan.mapelId;
  const guruJadwalIdFinal = isPenggantiUntukSlot ? penggantiRow!.guru_asli_id : guruJadwalId;

  const absensiStatements = [
    existing
      ? db
          .update(agenda)
          .set({
            mapel_id: mapelId,
            materi: input.materi,
            kegiatan: nullIfEmpty(input.kegiatan),
            catatan: nullIfEmpty(input.catatan),
            status: input.status,
            is_pengganti: !!isPenggantiUntukSlot,
            jumlah_siswa: jumlahSiswa,
            diubah_pada: now,
          })
          .where(eq(agenda.id, agendaId))
      : db.insert(agenda).values({
          id: agendaId,
          period_id: periodId,
          tanggal: input.tanggal,
          rombel_id: input.rombelId,
          mapel_id: mapelId,
          guru_id: actor.guruId ?? guruJadwalId,
          guru_jadwal_id: guruJadwalIdFinal,
          jadwal_versi_id: versiAktif?.id ?? "",
          hari,
          jam_ke_mulai: pertemuan.jamKeMulai,
          jam_ke_selesai: pertemuan.jamKeSelesai,
          slot_mulai: input.slotMulai,
          slot_selesai: pertemuan.slotSelesai,
          jumlah_jp: pertemuan.jumlahJp,
          materi: input.materi,
          kegiatan: nullIfEmpty(input.kegiatan),
          catatan: nullIfEmpty(input.catatan),
          status: input.status,
          is_pengganti: !!isPenggantiUntukSlot,
          diisi_terlambat: diisiTerlambat,
          jumlah_siswa: jumlahSiswa,
          diisi_pada: now,
          diubah_pada: now,
        }),
    db.delete(absensi).where(eq(absensi.agenda_id, agendaId)),
    ...(input.absensi.length > 0
      ? [
          db.insert(absensi).values(
            input.absensi.map((a) => ({
              id: generateId(),
              agenda_id: agendaId,
              siswa_id: a.siswaId,
              status: a.status,
              keterangan: nullIfEmpty(a.keterangan),
            })),
          ),
        ]
      : []),
  ];
  const [firstStmt, ...restStmt] = absensiStatements;
  await db.batch([firstStmt!, ...restStmt]);

  await recomputeStatusHarianRombel(db, input.rombelId, input.tanggal, periodId);
  await upsertRekapHarianRombel(db, input.rombelId, input.tanggal, periodId, perRombel[0]?.pertemuan.length ?? 0);

  return { agendaId };
}

export async function upsertRekapHarianRombel(
  db: Database,
  rombelId: string,
  tanggal: string,
  periodId: string,
  jpTerjadwal: number,
): Promise<void> {
  const agendaRows = await db
    .select({ status: agenda.status, jumlahJp: agenda.jumlah_jp, id: agenda.id })
    .from(agenda)
    .where(and(eq(agenda.rombel_id, rombelId), eq(agenda.tanggal, tanggal)));
  const jpTerisi = agendaRows.filter((a) => a.status === "terisi").reduce((sum, a) => sum + a.jumlahJp, 0);
  const jpKosong = agendaRows.filter((a) => a.status === "jam_kosong").reduce((sum, a) => sum + a.jumlahJp, 0);

  const statusCountRows = await db
    .select({ status: absensiHarian.status, count: sql<number>`COUNT(*)` })
    .from(absensiHarian)
    .where(and(eq(absensiHarian.rombel_id, rombelId), eq(absensiHarian.tanggal, tanggal)))
    .groupBy(absensiHarian.status);
  const counts = { S: 0, I: 0, A: 0 };
  for (const row of statusCountRows) counts[row.status] = Number(row.count);

  const jumlahSiswaRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(siswaKelas)
    .where(and(eq(siswaKelas.rombel_id, rombelId), eq(siswaKelas.period_id, periodId)));

  const now = new Date().toISOString();
  const existing = await db.query.rekapHarianRombel.findFirst({
    where: and(eq(rekapHarianRombel.rombel_id, rombelId), eq(rekapHarianRombel.tanggal, tanggal)),
  });
  const values = {
    jumlah_siswa: Number(jumlahSiswaRow[0]?.count ?? 0),
    jumlah_s: counts.S,
    jumlah_i: counts.I,
    jumlah_a: counts.A,
    jp_terjadwal: jpTerjadwal,
    jp_terisi: jpTerisi,
    jp_kosong: jpKosong,
    updated_at: now,
  };
  if (existing) {
    await db.update(rekapHarianRombel).set(values).where(eq(rekapHarianRombel.id, existing.id));
  } else {
    await db.insert(rekapHarianRombel).values({
      id: generateId(),
      rombel_id: rombelId,
      period_id: periodId,
      tanggal,
      ...values,
    });
  }
}

export interface RiwayatMateriQuery {
  cursor?: string;
  limit?: number;
  rombelId?: string;
  mapelId?: string;
  guruId?: string;
}

/**
 * `agenda.tanggal` dipakai sebagai `created_at` untuk cursor — aman karena
 * string tanggal (YYYY-MM-DD) ASCII-sortable persis seperti timestamp.
 */
export async function listRiwayatMateri(
  db: Database,
  query: RiwayatMateriQuery,
  scopedRombelIds: string[] | null,
): Promise<CursorPaginatedResult<RiwayatMateriItem>> {
  const limit = normalizeCursorLimit(query.limit);
  const conditions = [eq(agenda.status, "terisi")];

  if (query.rombelId) conditions.push(eq(agenda.rombel_id, query.rombelId));
  if (query.mapelId) conditions.push(eq(agenda.mapel_id, query.mapelId));
  if (query.guruId) conditions.push(eq(agenda.guru_id, query.guruId));
  if (scopedRombelIds !== null) {
    if (scopedRombelIds.length === 0) return { items: [], nextCursor: null };
    conditions.push(sql`${agenda.rombel_id} IN ${scopedRombelIds}`);
  }
  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(lt(agenda.tanggal, decoded.createdAt), and(eq(agenda.tanggal, decoded.createdAt), lt(agenda.id, decoded.id)))!,
      );
    }
  }

  const rows = await db
    .select({
      id: agenda.id,
      created_at: agenda.tanggal,
      tanggal: agenda.tanggal,
      jamKeMulai: agenda.jam_ke_mulai,
      materi: agenda.materi,
      kegiatan: agenda.kegiatan,
      catatan: agenda.catatan,
      guruId: agenda.guru_id,
      rombelId: agenda.rombel_id,
      isPengganti: agenda.is_pengganti,
    })
    .from(agenda)
    .where(and(...conditions))
    .orderBy(desc(agenda.tanggal), desc(agenda.id))
    .limit(limit + 1);

  const { items, nextCursor } = buildCursorResult(rows, limit);

  const guruIds = [...new Set(items.map((r) => r.guruId))];
  const rombelIds = [...new Set(items.map((r) => r.rombelId))];
  const agendaIds = items.map((r) => r.id);

  const [guruRows, rombelRows, tidakHadirRows] = await Promise.all([
    guruIds.length
      ? db.select({ id: guru.id, nama: guru.nama_lengkap }).from(guru).where(sql`${guru.id} IN ${guruIds}`)
      : Promise.resolve([]),
    rombelIds.length
      ? db.select({ id: rombel.id, nama: rombel.nama }).from(rombel).where(sql`${rombel.id} IN ${rombelIds}`)
      : Promise.resolve([]),
    agendaIds.length
      ? db
          .select({ agendaId: absensi.agenda_id, count: sql<number>`COUNT(*)` })
          .from(absensi)
          .where(sql`${absensi.agenda_id} IN ${agendaIds}`)
          .groupBy(absensi.agenda_id)
      : Promise.resolve([]),
  ]);
  const guruNamaById = new Map(guruRows.map((g) => [g.id, g.nama]));
  const rombelNamaById = new Map(rombelRows.map((r) => [r.id, r.nama]));
  const tidakHadirByAgenda = new Map(tidakHadirRows.map((r) => [r.agendaId, Number(r.count)]));

  return {
    nextCursor,
    items: items.map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      jamKeMulai: r.jamKeMulai,
      materi: r.materi,
      kegiatan: r.kegiatan,
      catatan: r.catatan,
      guruNama: guruNamaById.get(r.guruId) ?? "—",
      isPengganti: r.isPengganti,
      jumlahTidakHadir: tidakHadirByAgenda.get(r.id) ?? 0,
      rombelNama: rombelNamaById.get(r.rombelId) ?? "—",
    })),
  };
}
