/**
 * Menambahkan role "Guru Piket" + role_permissions untuk modul baru Tahap 3
 * ke database yang SUDAH berisi data (local maupun production Tahap 1/2) —
 * tidak bisa pakai scripts/seed.ts karena itu menolak jalan kalau tabel
 * users sudah terisi.
 *
 * Idempotent: role dicek dulu sebelum dibuat, role_permissions pakai
 * INSERT OR IGNORE, aman dijalankan berkali-kali.
 *
 * Catatan: modul agenda_guru/absensi_siswa/riwayat_materi SUDAH ada di
 * role_permissions Admin/Kepala Sekolah/Guru/Wali Kelas sejak seed Tahap 1
 * (sudah pra-ditulis di scripts/seed.ts sebelum Tahap 3 dikerjakan, lewat
 * MODULES.map(...) untuk Admin/Kepsek dan daftar eksplisit untuk Guru/Wali
 * Kelas) — tidak perlu dimigrasikan lagi. Yang benar-benar baru di Tahap 3
 * adalah 4 modul (kalender_akademik, izin_siswa, papan_kbm, monitoring_kbm)
 * dan role Guru Piket itu sendiri.
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
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "kalender_akademik", actions: ["lihat", "tambah", "ubah", "hapus"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "izin_siswa", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "papan_kbm", actions: ["lihat", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.ADMIN, module: "monitoring_kbm", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "kalender_akademik", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "izin_siswa", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "papan_kbm", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH, module: "monitoring_kbm", actions: ["lihat", "export"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.WALI_KELAS, module: "izin_siswa", actions: ["lihat", "tambah", "ubah"], scope: "milik_sendiri" },
  { roleName: SYSTEM_ROLE_NAMES.GURU_PIKET, module: "beranda", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.GURU_PIKET, module: "izin_siswa", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.GURU_PIKET, module: "papan_kbm", actions: ["lihat", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.GURU_PIKET, module: "monitoring_kbm", actions: ["lihat"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.GURU_PIKET, module: "agenda_guru", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
  { roleName: SYSTEM_ROLE_NAMES.GURU_PIKET, module: "absensi_siswa", actions: ["lihat"], scope: "semua" },
];

async function main() {
  console.log(`\n== Migrasi izin Tahap 3 (${target.replace("--", "")}) ==\n`);

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

  // Buat role "Guru Piket" kalau belum ada.
  if (!roleIdByName.has(SYSTEM_ROLE_NAMES.GURU_PIKET)) {
    const newRoleId = generateId();
    roleIdByName.set(SYSTEM_ROLE_NAMES.GURU_PIKET, newRoleId);
    statements.push(
      `INSERT INTO roles (id, name, description, is_locked, is_system, created_at, updated_at) VALUES ` +
        `(${sqlString(newRoleId)}, ${sqlString(SYSTEM_ROLE_NAMES.GURU_PIKET)}, ` +
        `${sqlString("Template: input izin/sakit harian semua siswa, atur guru pengganti, tandai jam kosong.")}, ` +
        `${sqlBool(false)}, ${sqlBool(true)}, ${sqlString(ts)}, ${sqlString(ts)});`,
    );
    console.log(`Role "${SYSTEM_ROLE_NAMES.GURU_PIKET}" akan dibuat.`);
  } else {
    console.log(`Role "${SYSTEM_ROLE_NAMES.GURU_PIKET}" sudah ada, dilewati.`);
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

  // Bump roles_version supaya cache izin efektif ter-invalidasi cepat.
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

  console.log("\n✅ Migrasi izin Tahap 3 selesai (aman dijalankan ulang — idempotent).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
