/**
 * Seed mapel default (Tahap 2) — terpisah dari scripts/seed.ts karena tabel
 * `mapel` baru ditambahkan lewat migrasi 0001 dan harus bisa dijalankan
 * dengan aman di database yang SUDAH berisi data (Tahap 1 sudah live di
 * production), bukan hanya database kosong. Idempotent: dilewati kalau
 * sudah ada baris di tabel `mapel`.
 */
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { generateId } from "../src/server/lib/id";

const DB_BINDING = "DB";
const target = process.argv.includes("--remote") ? "--remote" : "--local";
const wranglerEntry = path.resolve("node_modules/wrangler/bin/wrangler.js");

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}
function sqlBool(value: boolean): string {
  return value ? "1" : "0";
}
function sqlNum(value: number): string {
  return String(value);
}

function runWrangler(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [wranglerEntry, ...args], { encoding: "utf-8" });
  if (result.error) throw result.error;
  return { stdout: result.stdout ?? "", status: result.status ?? 1 };
}

interface MapelSeed {
  kode: string;
  nama: string;
  jenis: "akademik" | "muatan_lokal" | "kegiatan";
}

const MAPEL_LIST: MapelSeed[] = [
  { kode: "Pai", nama: "Pendidikan Agama Islam", jenis: "akademik" },
  { kode: "PKN", nama: "Pendidikan Pancasila", jenis: "akademik" },
  { kode: "B.Indo", nama: "Bahasa Indonesia", jenis: "akademik" },
  { kode: "Mate", nama: "Matematika", jenis: "akademik" },
  { kode: "IPA", nama: "Ilmu Pengetahuan Alam", jenis: "akademik" },
  { kode: "IPS", nama: "Ilmu Pengetahuan Sosial", jenis: "akademik" },
  { kode: "B.Ingg", nama: "Bahasa Inggris", jenis: "akademik" },
  { kode: "PJOK", nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan", jenis: "akademik" },
  { kode: "TIK", nama: "Informatika", jenis: "akademik" },
  { kode: "Seni", nama: "Seni Budaya / Prakarya", jenis: "akademik" },
  { kode: "Sunda", nama: "Bahasa Sunda", jenis: "muatan_lokal" },
  { kode: "BK", nama: "Bimbingan Konseling", jenis: "kegiatan" },
  { kode: "Tahfidz", nama: "Tahfidz", jenis: "kegiatan" },
  { kode: "Mulok Kepesantrenan", nama: "Mulok Kepesantrenan", jenis: "kegiatan" },
];

const DEFAULT_PREDIKAT = JSON.stringify([
  { batas_bawah: 0, label: "cukup baik" },
  { batas_bawah: 75, label: "baik" },
  { batas_bawah: 90, label: "sangat baik" },
]);
const DEFAULT_TINGKAT = JSON.stringify(["VII", "VIII", "IX"]);

async function main() {
  console.log(`\n== Seed mapel default (${target.replace("--", "")}) ==\n`);

  const check = runWrangler([
    "d1",
    "execute",
    DB_BINDING,
    target,
    "--command",
    "SELECT COUNT(*) as c FROM mapel",
    "--json",
  ]);
  if (check.status === 0) {
    try {
      const parsed = JSON.parse(check.stdout);
      const count = parsed?.[0]?.results?.[0]?.c ?? 0;
      if (count > 0) {
        console.log("Tabel mapel sudah berisi data. Seed dilewati (idempotent).");
        return;
      }
    } catch {
      // tabel belum ada / migrasi belum diterapkan — lanjut, nanti INSERT akan gagal jelas
    }
  }

  const ts = new Date().toISOString();
  const statements: string[] = [];

  MAPEL_LIST.forEach((m, i) => {
    statements.push(
      `INSERT INTO mapel (id, nama, kode_jadwal, alias_kode, jenis, induk_mapel_id, tampil_raport, urutan_raport, tingkat_berlaku, predikat_config, is_active, created_at, updated_at, deleted_at) VALUES ` +
        `(${sqlString(generateId())}, ${sqlString(m.nama)}, ${sqlString(m.kode)}, ${sqlString("[]")}, ${sqlString(m.jenis)}, NULL, ${sqlBool(true)}, ${sqlNum(i + 1)}, ${sqlString(DEFAULT_TINGKAT)}, ${sqlString(DEFAULT_PREDIKAT)}, ${sqlBool(true)}, ${sqlString(ts)}, ${sqlString(ts)}, NULL);`,
    );
  });

  const tmpDir = mkdtempSync(path.join(tmpdir(), "smpam-seed-mapel-"));
  const sqlFile = path.join(tmpDir, `seed-${randomUUID()}.sql`);
  writeFileSync(sqlFile, statements.join("\n"), "utf-8");

  console.log(`Menjalankan ${statements.length} statement ke target ${target.replace("--", "")}...`);
  const exec = runWrangler(["d1", "execute", DB_BINDING, target, "--file", sqlFile]);
  rmSync(tmpDir, { recursive: true, force: true });

  if (exec.status !== 0) {
    console.error("Seed mapel gagal. Pastikan migrasi 0001 sudah diterapkan.");
    process.exit(1);
  }

  console.log(`\n✅ ${MAPEL_LIST.length} mapel default berhasil ditambahkan.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
