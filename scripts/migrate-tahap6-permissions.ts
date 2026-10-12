/**
 * Menambahkan role_permissions untuk modul-modul Tahap 6 (Raport) ke
 * database yang SUDAH berisi data — tidak bisa pakai scripts/seed.ts
 * karena itu menolak jalan kalau tabel users sudah terisi.
 *
 * Satu script dipakai untuk SELURUH tahap 6 (diedit ulang & dijalankan
 * lagi tiap sesi menambah modul baru, pola yang sama dengan
 * migrate-tahap5-permissions.ts) — idempotent lewat INSERT OR IGNORE,
 * aman dijalankan berkali-kali. Tidak ada role baru di tahap ini.
 *
 * Sesi 6-1: pengaturan_raport, tujuan_pembelajaran, input_nilai (UI sudah
 * ada). Modul `raport_kelas`/`leger`/`cetak_raport` baru terdaftar di
 * registry (UI menyusul sesi 6-2/6-3/6-4) — Admin & Kepala Sekolah tetap
 * diberi akses sekarang supaya tidak perlu migrasi izin lagi nanti.
 * Sesi 6-2: `leger` UI sudah ada (gabung Monitoring Kelengkapan + Leger),
 * aksi `tambah` (kirim notifikasi pengingat) ditambahkan ke Admin & Wali
 * Kelas (bukan Kepala Sekolah — dia cuma "lihat semua + export").
 * Sesi 6-3: `raport_kelas` UI sudah ada (ekskul, prestasi, kehadiran,
 * catatan, kenaikan kelas, finalisasi) — aksi `tambah`/`ubah` ditambahkan
 * ke Admin & Wali Kelas. Guru (bukan wali) dapat grant minimal supaya
 * pembina ekskul bisa mengisi nilai ekskulnya sendiri (dicek service-level,
 * lihat `assertBisaIsiEkskul()`). `pengaturan_raport` aksi `tambah`/`hapus`
 * ditambahkan untuk Admin kelola master Ekskul + bank kalimat Catatan
 * Pendidik.
 * Sesi 6-4: `cetak_raport` UI (PDF + verifikasi QR) sudah ada — grant-nya
 * sudah dipasang di sesi 6-1 (Admin/Wali Kelas/Kepala Sekolah), tidak ada
 * perubahan grant di sesi ini. Guru biasa (pembina ekskul) tetap tidak
 * dapat `cetak_raport` — mencetak raport resmi bukan kewenangannya.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { generateId } from "../src/server/lib/id";
import { SYSTEM_ROLE_NAMES } from "../src/shared/constants";
import type { PermissionAction, PermissionScope } from "../src/shared/constants";

const DB_BINDING = "DB";
const target = process.argv.includes("--remote") ? "--remote" : "--local";
const wranglerEntry = path.resolve("node_modules/wrangler/bin/wrangler.js");

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function runWrangler(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [wranglerEntry, ...args], { encoding: "utf-8" });
  if (result.error) throw result.error;
  return { stdout: result.stdout ?? "", status: result.status ?? 1 };
}

interface Grant {
  roleName: string;
  module: string;
  actions: PermissionAction[];
  scope: PermissionScope;
}

const GRANTS: Grant[] = [
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "pengaturan_raport", actions: ["lihat", "tambah", "ubah", "hapus"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "tujuan_pembelajaran", actions: ["lihat", "tambah", "ubah", "hapus"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "input_nilai", actions: ["lihat", "tambah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "raport_kelas", actions: ["lihat", "tambah", "ubah", "export", "approve"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "leger", actions: ["lihat", "tambah", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "cetak_raport", actions: ["lihat", "export"], scope: "semua" },

  { roleName: SYSTEM_ROLE_NAMES.GURU, module: "tujuan_pembelajaran", actions: ["lihat", "tambah", "ubah", "hapus"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.GURU, module: "input_nilai", actions: ["lihat", "tambah"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.GURU, module: "raport_kelas", actions: ["lihat", "tambah"], scope: "milik_sendiri" },

  { roleName: SYSTEM_ROLE_NAMES.WALI_KELAS, module: "raport_kelas", actions: ["lihat", "tambah", "ubah", "export", "approve"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.WALI_KELAS, module: "leger", actions: ["lihat", "tambah", "export"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.WALI_KELAS, module: "cetak_raport", actions: ["lihat", "export"], scope: "milik_sendiri" },

  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "tujuan_pembelajaran", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "input_nilai", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "raport_kelas", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "leger", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "cetak_raport", actions: ["lihat", "export"], scope: "semua" },
];

async function main() {
  console.log(`\n== Migrasi izin Tahap 6 (${target.replace("--", "")}) ==\n`);

  const roleIdRes = runWrangler([
    "d1", "execute", DB_BINDING, target,
    "--command", "SELECT id, name FROM roles",
    "--json",
  ]);
  if (roleIdRes.status !== 0) {
    console.error("Gagal membaca tabel roles. Pastikan migrasi & seed Tahap 1 sudah diterapkan.");
    process.exit(1);
  }
  const roleRows: { id: string; name: string }[] = JSON.parse(roleIdRes.stdout)[0].results;
  const roleIdByName = new Map(roleRows.map((r) => [r.name, r.id]));

  const ts = new Date().toISOString();
  const statements: string[] = [];

  for (const grant of GRANTS) {
    const roleId = roleIdByName.get(grant.roleName);
    if (!roleId) {
      console.warn(`Role "${grant.roleName}" tidak ditemukan, dilewati.`);
      continue;
    }
    for (const action of grant.actions) {
      statements.push(
        `INSERT OR IGNORE INTO role_permissions (id, role_id, module_key, action, scope, created_at, updated_at) VALUES ` +
          `(${sqlString(generateId())}, ${sqlString(roleId)}, ${sqlString(grant.module)}, ${sqlString(action)}, ${sqlString(grant.scope)}, ${sqlString(ts)}, ${sqlString(ts)});`,
      );
    }
  }

  statements.push(
    `UPDATE settings SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT), updated_at = ${sqlString(ts)} WHERE key = 'roles_version';`,
  );

  const tmpDir = mkdtempSync(path.join(tmpdir(), "smpam-migrate-perms-"));
  const sqlFile = path.join(tmpDir, `migrate-${randomUUID()}.sql`);
  writeFileSync(sqlFile, statements.join("\n"), "utf-8");

  console.log(`Menjalankan ${statements.length} statement ke target ${target.replace("--", "")}...`);
  const exec = runWrangler(["d1", "execute", DB_BINDING, target, "--file", sqlFile]);
  rmSync(tmpDir, { recursive: true, force: true });

  if (exec.status !== 0) {
    console.error("Migrasi izin gagal.");
    process.exit(1);
  }

  console.log("\n✅ Migrasi izin Tahap 6 selesai (aman dijalankan ulang — idempotent).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
