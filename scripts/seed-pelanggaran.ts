/**
 * Seed kategori/jenis pelanggaran + ambang sanksi default (Tahap 5) —
 * terpisah dari scripts/seed.ts karena harus bisa dijalankan dengan aman di
 * database yang SUDAH berisi data. Idempotent: dilewati kalau tabel
 * pelanggaran_kategori sudah berisi data. Semua nilai bisa diubah Admin/BK
 * lewat halaman Master Pelanggaran setelah seed ini.
 */
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { generateId } from "../src/server/lib/id";
import { DEFAULT_PELANGGARAN_JENIS, DEFAULT_SANKSI_AMBANG } from "../src/shared/constants";

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

const KATEGORI_WARNA: Record<string, string> = {
  Ringan: "#eab308",
  Sedang: "#f97316",
  Berat: "#dc2626",
};

async function main() {
  console.log(`\n== Seed pelanggaran default (${target.replace("--", "")}) ==\n`);

  const check = runWrangler([
    "d1", "execute", DB_BINDING, target,
    "--command", "SELECT COUNT(*) as c FROM pelanggaran_kategori",
    "--json",
  ]);
  if (check.status === 0) {
    try {
      const parsed = JSON.parse(check.stdout);
      const count = parsed?.[0]?.results?.[0]?.c ?? 0;
      if (count > 0) {
        console.log("Tabel pelanggaran_kategori sudah berisi data. Seed dilewati (idempotent).");
        return;
      }
    } catch {
      // tabel belum ada / migrasi belum diterapkan — lanjut, nanti INSERT akan gagal jelas
    }
  }

  const ts = new Date().toISOString();
  const statements: string[] = [];

  const kategoriNamaUnik = [...new Set(DEFAULT_PELANGGARAN_JENIS.map((j) => j.kategori))];
  const kategoriIdByNama = new Map<string, string>();
  kategoriNamaUnik.forEach((nama, i) => {
    const id = generateId();
    kategoriIdByNama.set(nama, id);
    statements.push(
      `INSERT INTO pelanggaran_kategori (id, nama, warna, urutan, created_at, updated_at, deleted_at) VALUES ` +
        `(${sqlString(id)}, ${sqlString(nama)}, ${sqlString(KATEGORI_WARNA[nama] ?? "#94a3b8")}, ${sqlNum(i + 1)}, ${sqlString(ts)}, ${sqlString(ts)}, NULL);`,
    );
  });

  for (const jenis of DEFAULT_PELANGGARAN_JENIS) {
    const kategoriId = kategoriIdByNama.get(jenis.kategori)!;
    statements.push(
      `INSERT INTO pelanggaran_jenis (id, kategori_id, nama, poin, deskripsi, aktif, created_at, updated_at, deleted_at) VALUES ` +
        `(${sqlString(generateId())}, ${sqlString(kategoriId)}, ${sqlString(jenis.nama)}, ${sqlNum(jenis.poin)}, NULL, ${sqlBool(true)}, ${sqlString(ts)}, ${sqlString(ts)}, NULL);`,
    );
  }

  for (const ambang of DEFAULT_SANKSI_AMBANG) {
    statements.push(
      `INSERT INTO sanksi_ambang (id, poin_minimal, nama, deskripsi, urutan, created_at, updated_at, deleted_at) VALUES ` +
        `(${sqlString(generateId())}, ${sqlNum(ambang.poinMinimal)}, ${sqlString(ambang.nama)}, NULL, ${sqlNum(ambang.poinMinimal)}, ${sqlString(ts)}, ${sqlString(ts)}, NULL);`,
    );
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "smpam-seed-pelanggaran-"));
  const sqlFile = path.join(tmpDir, `seed-${randomUUID()}.sql`);
  writeFileSync(sqlFile, statements.join("\n"), "utf-8");

  console.log(`Menjalankan ${statements.length} statement ke target ${target.replace("--", "")}...`);
  const exec = runWrangler(["d1", "execute", DB_BINDING, target, "--file", sqlFile]);
  rmSync(tmpDir, { recursive: true, force: true });

  if (exec.status !== 0) {
    console.error("Seed pelanggaran gagal. Pastikan migrasi skema Tahap 5 sudah diterapkan.");
    process.exit(1);
  }

  console.log(
    `\n✅ ${kategoriNamaUnik.length} kategori, ${DEFAULT_PELANGGARAN_JENIS.length} jenis, ${DEFAULT_SANKSI_AMBANG.length} ambang sanksi default berhasil ditambahkan.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
