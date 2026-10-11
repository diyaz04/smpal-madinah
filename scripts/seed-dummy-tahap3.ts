/**
 * Generator data dummy Tahap 3 (dev only) — 30 hari agenda + absensi untuk
 * rombel/jadwal yang SUDAH ada di database (tidak membuat rombel/siswa/guru
 * baru), supaya tidak ada FK yang menggantung dan konsisten dengan data nyata
 * yang sudah ada. Dipakai untuk mengukur volume data nyata & menguji query di
 * bawah beban, BUKAN untuk demo tampilan (jadwal yang ada saat ini tipis,
 * jadi hasilnya proporsional dengan jadwal nyata yang sudah diisi).
 *
 * SENGAJA tidak ada varian --remote: script ini HANYA boleh jalan ke --local,
 * supaya tidak mungkin tidak sengaja menimpa data produksi. Dijalankan lewat
 * `npm run seed:dummy:local`.
 *
 * Memakai fungsi murni yang sama dengan server (groupPertemuan,
 * computeStatusHarian) supaya hasilnya konsisten dengan logika asli, bukan
 * logika duplikat yang bisa menyimpang.
 */
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { groupPertemuan, type PertemuanSlotInput, type PertemuanIsiInput } from "../src/shared/pertemuan";
import { computeStatusHarian, type StatusHarianEntry } from "../src/shared/statusHarian";
import { getHariFromTanggal, addDays } from "../src/shared/tanggal";
import { generateId } from "../src/server/lib/id";
import type { Hari, AbsensiPertemuanStatus, AbsensiHarianStatus } from "../src/shared/constants";

const DB_BINDING = "DB";
const JUMLAH_HARI = 30;

if (process.argv.includes("--remote")) {
  console.error("Script ini hanya boleh jalan ke database lokal. Jangan tambahkan --remote.");
  process.exit(1);
}

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}
function sqlBool(value: boolean): string {
  return value ? "1" : "0";
}
function sqlNum(value: number | null): string {
  return value === null ? "NULL" : String(value);
}
function nowIso(): string {
  return new Date().toISOString();
}

const wranglerEntry = path.resolve("node_modules/wrangler/bin/wrangler.js");
function runWrangler(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [wranglerEntry, ...args], { encoding: "utf-8" });
  if (result.error) throw result.error;
  return { stdout: result.stdout ?? "", status: result.status ?? 1 };
}
function queryJson<T>(sql: string): T[] {
  const res = runWrangler(["d1", "execute", DB_BINDING, "--local", "--command", sql, "--json"]);
  if (res.status !== 0) throw new Error(`Query gagal: ${sql}`);
  const parsed = JSON.parse(res.stdout);
  return parsed?.[0]?.results ?? [];
}

// Bobot status absen per siswa per pertemuan (dummy, condong Hadir).
const STATUS_WEIGHTS: { status: AbsensiPertemuanStatus | null; weight: number }[] = [
  { status: null, weight: 85 }, // Hadir
  { status: "S", weight: 6 },
  { status: "I", weight: 4 },
  { status: "A", weight: 3 },
  { status: "T", weight: 1 },
  { status: "D", weight: 1 },
];
function randomStatus(): AbsensiPertemuanStatus | null {
  const total = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of STATUS_WEIGHTS) {
    r -= w.weight;
    if (r <= 0) return w.status;
  }
  return null;
}

async function main() {
  console.log("\n== Generator Data Dummy Tahap 3 (lokal) ==\n");

  const periodRows = queryJson<{ id: string }>("SELECT id FROM academic_periods WHERE is_active = 1 LIMIT 1");
  const periodId = periodRows[0]?.id;
  if (!periodId) {
    console.error("Tidak ada tahun ajaran aktif. Jalankan seed Tahap 1 & atur tahun ajaran aktif dulu.");
    process.exit(1);
  }

  const versiRows = queryJson<{ id: string }>(
    `SELECT id FROM jadwal_versi WHERE period_id = ${sqlString(periodId)} AND status = 'aktif' LIMIT 1`,
  );
  const versiAktifId = versiRows[0]?.id;
  if (!versiAktifId) {
    console.error("Tidak ada jadwal_versi aktif. Isi & aktifkan Jadwal Pelajaran dulu (Tahap 2) sebelum menjalankan ini.");
    process.exit(1);
  }

  const slotRows = queryJson<{
    id: string;
    hari: Hari;
    urutan: number;
    jam_ke: number | null;
    jam_mulai: string;
    jam_selesai: string;
    jenis_slot: "kbm" | "istirahat" | "upacara" | "kegiatan";
  }>(`SELECT id, hari, urutan, jam_ke, jam_mulai, jam_selesai, jenis_slot FROM jadwal_slot WHERE jadwal_versi_id = ${sqlString(versiAktifId)} ORDER BY hari, urutan`);

  const isiRows = queryJson<{ id: string; jadwal_slot_id: string; rombel_id: string; mapel_id: string | null }>(
    `SELECT id, jadwal_slot_id, rombel_id, mapel_id FROM jadwal_isi WHERE jadwal_slot_id IN (${slotRows.map((s) => sqlString(s.id)).join(",") || "''"})`,
  );
  const isiIds = isiRows.map((i) => i.id);
  const guruRows = isiIds.length
    ? queryJson<{ jadwal_isi_id: string; guru_id: string }>(
        `SELECT jadwal_isi_id, guru_id FROM jadwal_isi_guru WHERE jadwal_isi_id IN (${isiIds.map((id) => sqlString(id)).join(",")})`,
      )
    : [];
  const guruByIsi = new Map<string, string[]>();
  for (const g of guruRows) {
    const arr = guruByIsi.get(g.jadwal_isi_id) ?? [];
    arr.push(g.guru_id);
    guruByIsi.set(g.jadwal_isi_id, arr);
  }

  const rombelIds = [...new Set(isiRows.map((i) => i.rombel_id))];
  if (rombelIds.length === 0) {
    console.error("Belum ada jadwal_isi (jadwal kosong semua). Isi Jadwal Pelajaran dulu sebelum menjalankan ini.");
    process.exit(1);
  }

  const siswaKelasRows = queryJson<{ siswa_id: string; rombel_id: string }>(
    `SELECT siswa_id, rombel_id FROM siswa_kelas WHERE period_id = ${sqlString(periodId)} AND rombel_id IN (${rombelIds.map((id) => sqlString(id)).join(",")})`,
  );
  const siswaByRombel = new Map<string, string[]>();
  for (const sk of siswaKelasRows) {
    const arr = siswaByRombel.get(sk.rombel_id) ?? [];
    arr.push(sk.siswa_id);
    siswaByRombel.set(sk.rombel_id, arr);
  }

  const existingAgendaRows = queryJson<{ rombel_id: string; tanggal: string; slot_mulai: string }>(
    `SELECT rombel_id, tanggal, slot_mulai FROM agenda WHERE tanggal >= ${sqlString(addDays(new Date().toISOString().slice(0, 10), -JUMLAH_HARI))}`,
  );
  const existingKeys = new Set(existingAgendaRows.map((a) => `${a.rombel_id}|${a.tanggal}|${a.slot_mulai}`));

  // Kelompokkan slot per hari, lalu groupPertemuan per rombel (fungsi murni yg sama dgn server).
  const slotsByHari = new Map<Hari, PertemuanSlotInput[]>();
  for (const s of slotRows) {
    const arr = slotsByHari.get(s.hari) ?? [];
    arr.push({ slotId: s.id, urutan: s.urutan, jamKe: s.jam_ke, jamMulai: s.jam_mulai, jamSelesai: s.jam_selesai, jenisSlot: s.jenis_slot });
    slotsByHari.set(s.hari, arr);
  }
  const isiByRombelHari = new Map<string, PertemuanIsiInput[]>(); // key: rombelId|hari
  for (const isi of isiRows) {
    const slot = slotRows.find((s) => s.id === isi.jadwal_slot_id);
    if (!slot) continue;
    const key = `${isi.rombel_id}|${slot.hari}`;
    const arr = isiByRombelHari.get(key) ?? [];
    arr.push({ slotId: isi.jadwal_slot_id, mapelId: isi.mapel_id, guruIds: guruByIsi.get(isi.id) ?? [] });
    isiByRombelHari.set(key, arr);
  }

  const statements: string[] = [];
  const now = nowIso();
  const today = new Date().toISOString().slice(0, 10);

  let agendaCount = 0;
  let absensiCount = 0;
  const absensiHarianByKey = new Map<string, { siswaId: string; rombelId: string; tanggal: string; status: AbsensiHarianStatus }>();
  const rekapByKey = new Map<string, { rombelId: string; tanggal: string; jumlahSiswa: number; jumlahS: number; jumlahI: number; jumlahA: number; jpTerjadwal: number; jpTerisi: number }>();

  for (let i = JUMLAH_HARI; i >= 0; i--) {
    const tanggal = addDays(today, -i);
    const hari = getHariFromTanggal(tanggal);
    if (!hari) continue;
    const slotsHariIni = slotsByHari.get(hari);
    if (!slotsHariIni) continue;

    for (const rombelId of rombelIds) {
      const isiRombelHari = isiByRombelHari.get(`${rombelId}|${hari}`);
      if (!isiRombelHari || isiRombelHari.length === 0) continue;

      const pertemuanList = groupPertemuan(slotsHariIni, isiRombelHari);
      const siswaIds = siswaByRombel.get(rombelId) ?? [];
      const rekapKey = `${rombelId}|${tanggal}`;
      let jpTerjadwalHariIni = 0;
      let jpTerisiHariIni = 0;

      const entriesBySiswa = new Map<string, StatusHarianEntry[]>();

      for (const p of pertemuanList) {
        jpTerjadwalHariIni += p.jumlahJp;
        const key = `${rombelId}|${tanggal}|${p.slotMulai}`;
        if (existingKeys.has(key)) continue; // sudah ada agenda nyata — jangan ditimpa
        if (siswaIds.length === 0) continue;

        const guruId = p.guruIds[0];
        if (!guruId) continue;

        jpTerisiHariIni += p.jumlahJp;
        const agendaId = generateId();
        agendaCount++;
        statements.push(
          `INSERT INTO agenda (id, period_id, tanggal, rombel_id, mapel_id, guru_id, guru_jadwal_id, jadwal_versi_id, hari, jam_ke_mulai, jam_ke_selesai, slot_mulai, slot_selesai, jumlah_jp, materi, kegiatan, catatan, status, is_pengganti, diisi_terlambat, jumlah_siswa, diisi_pada, diubah_pada) VALUES ` +
            `(${sqlString(agendaId)}, ${sqlString(periodId)}, ${sqlString(tanggal)}, ${sqlString(rombelId)}, ${sqlString(p.mapelId)}, ${sqlString(guruId)}, ${sqlString(guruId)}, ${sqlString(versiAktifId)}, ${sqlString(hari)}, ${sqlNum(p.jamKeMulai)}, ${sqlNum(p.jamKeSelesai)}, ${sqlString(p.slotMulai)}, ${sqlString(p.slotSelesai)}, ${sqlNum(p.jumlahJp)}, ${sqlString("[Dummy] Materi " + tanggal)}, NULL, NULL, 'terisi', ${sqlBool(false)}, ${sqlBool(false)}, ${sqlNum(siswaIds.length)}, ${sqlString(now)}, ${sqlString(now)});`,
        );

        for (const siswaId of siswaIds) {
          const status = randomStatus();
          const entries = entriesBySiswa.get(siswaId) ?? [];
          entries.push({ jumlahJp: p.jumlahJp, status });
          entriesBySiswa.set(siswaId, entries);
          if (status !== null) {
            absensiCount++;
            statements.push(
              `INSERT INTO absensi (id, agenda_id, siswa_id, status, keterangan) VALUES (${sqlString(generateId())}, ${sqlString(agendaId)}, ${sqlString(siswaId)}, ${sqlString(status)}, NULL);`,
            );
          }
        }
      }

      if (jpTerisiHariIni === 0) continue; // rombel ini tidak digenerate hari ini (sudah ada data nyata / tidak ada jadwal)

      for (const [siswaId, entries] of entriesBySiswa) {
        const computed = computeStatusHarian(entries);
        if (computed === "H") continue;
        absensiHarianByKey.set(`${siswaId}|${tanggal}`, { siswaId, rombelId, tanggal, status: computed });
      }

      const rekap = rekapByKey.get(rekapKey) ?? { rombelId, tanggal, jumlahSiswa: siswaIds.length, jumlahS: 0, jumlahI: 0, jumlahA: 0, jpTerjadwal: jpTerjadwalHariIni, jpTerisi: jpTerisiHariIni };
      rekapByKey.set(rekapKey, rekap);
    }
  }

  for (const { siswaId, rombelId, tanggal, status } of absensiHarianByKey.values()) {
    statements.push(
      `INSERT INTO absensi_harian (id, siswa_id, rombel_id, period_id, tanggal, status, sumber, keterangan, diubah_oleh, created_at, updated_at) VALUES ` +
        `(${sqlString(generateId())}, ${sqlString(siswaId)}, ${sqlString(rombelId)}, ${sqlString(periodId)}, ${sqlString(tanggal)}, ${sqlString(status)}, 'otomatis', NULL, NULL, ${sqlString(now)}, ${sqlString(now)});`,
    );
    const rekapKey = `${rombelId}|${tanggal}`;
    const rekap = rekapByKey.get(rekapKey);
    if (rekap) {
      if (status === "S") rekap.jumlahS++;
      else if (status === "I") rekap.jumlahI++;
      else if (status === "A") rekap.jumlahA++;
    }
  }

  for (const r of rekapByKey.values()) {
    statements.push(
      `INSERT INTO rekap_harian_rombel (id, rombel_id, period_id, tanggal, jumlah_siswa, jumlah_s, jumlah_i, jumlah_a, jp_terjadwal, jp_terisi, jp_kosong, updated_at) VALUES ` +
        `(${sqlString(generateId())}, ${sqlString(r.rombelId)}, ${sqlString(periodId)}, ${sqlString(r.tanggal)}, ${sqlNum(r.jumlahSiswa)}, ${sqlNum(r.jumlahS)}, ${sqlNum(r.jumlahI)}, ${sqlNum(r.jumlahA)}, ${sqlNum(r.jpTerjadwal)}, ${sqlNum(r.jpTerisi)}, ${sqlNum(0)}, ${sqlString(now)});`,
    );
  }

  if (statements.length === 0) {
    console.log("Tidak ada data baru untuk digenerate (semua tanggal 30 hari terakhir sudah terisi, atau jadwal masih kosong).");
    return;
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "smpam-dummy-"));
  const sqlFile = path.join(tmpDir, `dummy-${randomUUID()}.sql`);
  writeFileSync(sqlFile, statements.join("\n"), "utf-8");

  console.log(`Menjalankan ${statements.length} statement (agenda: ${agendaCount}, absensi: ${absensiCount}, absensi_harian: ${absensiHarianByKey.size}, rekap_harian_rombel: ${rekapByKey.size})...`);
  const exec = runWrangler(["d1", "execute", DB_BINDING, "--local", "--file", sqlFile]);
  rmSync(tmpDir, { recursive: true, force: true });

  if (exec.status !== 0) {
    console.error("Generate dummy gagal.");
    process.exit(1);
  }

  console.log("\n✅ Data dummy selesai digenerate.\n");
  console.log(`Rentang: ${JUMLAH_HARI} hari terakhir (sampai ${today})`);
  console.log(`Rombel dicakup: ${rombelIds.length}`);
  console.log(`agenda       : +${agendaCount} baris`);
  console.log(`absensi      : +${absensiCount} baris (hanya pengecualian non-Hadir)`);
  console.log(`absensi_harian: +${absensiHarianByKey.size} baris`);
  console.log(`rekap_harian_rombel: +${rekapByKey.size} baris\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
