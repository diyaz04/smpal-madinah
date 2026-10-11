/**
 * Menambahkan role "TU" + role_permissions untuk modul baru Tahap 4 ke
 * database yang SUDAH berisi data (local maupun production Tahap 1-3) —
 * tidak bisa pakai scripts/seed.ts karena itu menolak jalan kalau tabel
 * users sudah terisi.
 *
 * Idempotent: role dicek dulu sebelum dibuat, role_permissions pakai
 * INSERT OR IGNORE, aman dijalankan berkali-kali.
 *
 * Catatan: modul kiosk_presensi_guru/kiosk_buku_tamu SUDAH ada di
 * role_permissions Admin/Kepala Sekolah/Guru/Wali Kelas/Kiosk sejak seed
 * Tahap 1 (pra-ditulis sebelum Tahap 4 dikerjakan) — tidak perlu
 * dimigrasikan lagi. Yang benar-benar baru di Tahap 4 adalah 5 modul
 * (perangkat_kiosk, pengaturan_presensi, rekap_presensi_guru, izin_guru,
 * pengelolaan_buku_tamu) dan role TU itu sendiri.
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
function sqlBool(value: boolean): string {
  return value ? "1" : "0";
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
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "perangkat_kiosk", actions: ["lihat", "tambah", "hapus"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "pengaturan_presensi", actions: ["lihat", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "rekap_presensi_guru", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "izin_guru", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "pengelolaan_buku_tamu", actions: ["lihat", "ubah", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "perangkat_kiosk", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "rekap_presensi_guru", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "pengelolaan_buku_tamu", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.GURU, module: "rekap_presensi_guru", actions: ["lihat"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.WALI_KELAS, module: "rekap_presensi_guru", actions: ["lihat"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.TU, module: "beranda", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.TU, module: "izin_guru", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.TU, module: "pengelolaan_buku_tamu", actions: ["lihat", "ubah", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.TU, module: "rekap_presensi_guru", actions: ["lihat"], scope: "semua" },
];

async function main() {
  console.log(`\n== Migrasi izin Tahap 4 (${target.replace("--", "")}) ==\n`);

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

  if (!roleIdByName.has(SYSTEM_ROLE_NAMES.TU)) {
    const newRoleId = generateId();
    roleIdByName.set(SYSTEM_ROLE_NAMES.TU, newRoleId);
    statements.push(
      `INSERT INTO roles (id, name, description, is_locked, is_system, created_at, updated_at) VALUES ` +
        `(${sqlString(newRoleId)}, ${sqlString(SYSTEM_ROLE_NAMES.TU)}, ` +
        `${sqlString("Template: input izin/sakit/dinas guru, kelola buku tamu.")}, ` +
        `${sqlBool(false)}, ${sqlBool(true)}, ${sqlString(ts)}, ${sqlString(ts)});`,
    );
    console.log(`Role "${SYSTEM_ROLE_NAMES.TU}" akan dibuat.`);
  } else {
    console.log(`Role "${SYSTEM_ROLE_NAMES.TU}" sudah ada, dilewati.`);
  }

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

  console.log("\n✅ Migrasi izin Tahap 4 selesai (aman dijalankan ulang — idempotent).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
