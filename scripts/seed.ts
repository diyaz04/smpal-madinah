/**
 * Seed data awal Tahap 1: role default + izinnya, satu akun Admin (password
 * acak ditampilkan sekali di terminal), satu periode aktif, dan pengaturan
 * sekolah awal.
 *
 * Dijalankan lewat `npm run seed:local` / `npm run seed:remote`. Script ini
 * menghasilkan satu file SQL (INSERT berisi nilai yang sudah dihitung,
 * termasuk hash password) lalu mengeksekusinya lewat
 * `wrangler d1 execute DB --local|--remote --file=...` — pendekatan paling
 * sederhana & stabil karena tidak butuh driver D1 tambahan (better-sqlite3
 * untuk lokal, D1 HTTP API untuk remote) dan memakai satu jalur yang sama
 * untuk lokal maupun production. Lihat DECISIONS.md.
 */
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { MODULES } from "../src/shared/modules";
import {
  SYSTEM_ROLE_NAMES,
  type PermissionAction,
  type PermissionScope,
} from "../src/shared/constants";
import { generateId } from "../src/server/lib/id";
import {
  hashPassword,
  generateTempPassword,
  DEFAULT_PBKDF2_ITERATIONS,
} from "../src/server/lib/pbkdf2";

const DB_BINDING = "DB";

const target = process.argv.includes("--remote") ? "--remote" : "--local";

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

function nowIso(): string {
  return new Date().toISOString();
}

// Panggil langsung entry JS wrangler lewat `node` (bukan npx/wrangler.cmd),
// supaya tidak perlu lewat shell sama sekali — jadi aman untuk path yang
// mengandung spasi (mis. "C:\website mkks\SMP Al-Madinah") dan tidak kena
// batasan Node di Windows soal menjalankan .cmd/.bat tanpa shell.
const wranglerEntry = path.resolve("node_modules/wrangler/bin/wrangler.js");

function runWrangler(args: string[]): { stdout: string; status: number } {
  const result = spawnSync(process.execPath, [wranglerEntry, ...args], {
    encoding: "utf-8",
  });
  if (result.error) throw result.error;
  return { stdout: result.stdout ?? "", status: result.status ?? 1 };
}

async function main() {
  console.log(`\n== Seed database (${target.replace("--", "")}) ==\n`);

  // Cegah seed dobel: hentikan kalau tabel users sudah berisi data.
  const check = runWrangler([
    "d1",
    "execute",
    DB_BINDING,
    target,
    "--command",
    "SELECT COUNT(*) as c FROM users",
    "--json",
  ]);
  if (check.status === 0) {
    try {
      const parsed = JSON.parse(check.stdout);
      const count = parsed?.[0]?.results?.[0]?.c ?? 0;
      if (count > 0) {
        console.error(
          "Database sudah berisi data user. Seed dibatalkan supaya tidak terjadi duplikasi.\n" +
            "Kalau memang ingin seed ulang dari kosong, hapus database lokal/terapkan migrasi baru dulu.",
        );
        process.exit(1);
      }
    } catch {
      // Tabel belum ada / belum dimigrasi — lanjut, nanti INSERT akan gagal
      // dengan pesan jelas kalau migrasi memang belum diterapkan.
    }
  }

  const statements: string[] = [];
  const ts = nowIso();

  // --- Roles -----------------------------------------------------------
  type RolePermDef = { module: string; actions: PermissionAction[]; scope: PermissionScope };
  type RoleDef = {
    name: string;
    description: string;
    isLocked: boolean;
    permissions: RolePermDef[];
  };

  const roleDefs: RoleDef[] = [
    {
      name: SYSTEM_ROLE_NAMES.ADMIN,
      description: "Akses penuh ke seluruh sistem. Role ini dikunci.",
      isLocked: true,
      permissions: MODULES.map((m) => ({ module: m.key, actions: m.aksi, scope: "semua" })),
    },
    {
      name: SYSTEM_ROLE_NAMES.KEPALA_SEKOLAH,
      description: "Melihat seluruh modul, dapat approve dan export.",
      isLocked: false,
      permissions: MODULES.map((m) => ({
        module: m.key,
        actions: m.aksi.filter((a) => a === "lihat" || a === "approve" || a === "export"),
        scope: "semua" as const,
      })).filter((p) => p.actions.length > 0),
    },
    {
      name: SYSTEM_ROLE_NAMES.GURU,
      description: "Agenda & absensi, presensi, dan input nilai mapel yang diajar.",
      isLocked: false,
      permissions: [
        { module: "beranda", actions: ["lihat"], scope: "semua" },
        { module: "agenda_guru", actions: ["lihat", "tambah", "ubah"], scope: "milik_sendiri" },
        { module: "absensi_siswa", actions: ["lihat", "tambah", "ubah"], scope: "milik_sendiri" },
        { module: "riwayat_materi", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "kiosk_presensi_guru", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "rekap_presensi_guru", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "raport", actions: ["lihat", "ubah"], scope: "milik_sendiri" },
        { module: "data_siswa", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "jadwal_pelajaran", actions: ["lihat"], scope: "milik_sendiri" },
      ],
    },
    {
      name: SYSTEM_ROLE_NAMES.WALI_KELAS,
      description: "Seperti Guru, ditambah raport dan rekap kelas yang diwalikan.",
      isLocked: false,
      permissions: [
        { module: "beranda", actions: ["lihat"], scope: "semua" },
        { module: "agenda_guru", actions: ["lihat", "tambah", "ubah"], scope: "milik_sendiri" },
        { module: "absensi_siswa", actions: ["lihat", "tambah", "ubah"], scope: "milik_sendiri" },
        { module: "riwayat_materi", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "kiosk_presensi_guru", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "rekap_presensi_guru", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "raport", actions: ["lihat", "ubah", "export"], scope: "milik_sendiri" },
        { module: "data_siswa", actions: ["lihat", "ubah"], scope: "milik_sendiri" },
        { module: "jadwal_pelajaran", actions: ["lihat"], scope: "milik_sendiri" },
        { module: "izin_siswa", actions: ["lihat", "tambah", "ubah"], scope: "milik_sendiri" },
      ],
    },
    {
      name: SYSTEM_ROLE_NAMES.GURU_PIKET,
      description: "Template: input izin/sakit harian semua siswa, atur guru pengganti, tandai jam kosong.",
      isLocked: false,
      permissions: [
        { module: "beranda", actions: ["lihat"], scope: "semua" },
        { module: "izin_siswa", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
        { module: "papan_kbm", actions: ["lihat", "ubah"], scope: "semua" },
        { module: "monitoring_kbm", actions: ["lihat"], scope: "semua" },
        { module: "agenda_guru", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
        { module: "absensi_siswa", actions: ["lihat"], scope: "semua" },
      ],
    },
    {
      name: SYSTEM_ROLE_NAMES.BK_KESISWAAN,
      description: "Mengelola data pelanggaran dan prestasi siswa.",
      isLocked: false,
      permissions: [
        { module: "beranda", actions: ["lihat"], scope: "semua" },
        { module: "data_siswa", actions: ["lihat"], scope: "semua" },
        {
          module: "pelanggaran",
          actions: ["lihat", "tambah", "ubah", "hapus", "export"],
          scope: "semua",
        },
        {
          module: "prestasi",
          actions: ["lihat", "tambah", "ubah", "hapus", "export"],
          scope: "semua",
        },
      ],
    },
    {
      name: SYSTEM_ROLE_NAMES.KIOSK,
      description: "Hanya akses halaman kiosk: presensi guru dan buku tamu.",
      isLocked: false,
      permissions: [
        { module: "kiosk_presensi_guru", actions: ["lihat"], scope: "semua" },
        { module: "kiosk_buku_tamu", actions: ["lihat"], scope: "semua" },
      ],
    },
    {
      name: SYSTEM_ROLE_NAMES.TU,
      description: "Template: input izin/sakit/dinas guru, kelola buku tamu.",
      isLocked: false,
      permissions: [
        { module: "beranda", actions: ["lihat"], scope: "semua" },
        { module: "izin_guru", actions: ["lihat", "tambah", "ubah"], scope: "semua" },
        { module: "pengelolaan_buku_tamu", actions: ["lihat", "ubah", "export"], scope: "semua" },
        { module: "rekap_presensi_guru", actions: ["lihat"], scope: "semua" },
      ],
    },
  ];

  const roleIdByName = new Map<string, string>();

  for (const role of roleDefs) {
    const roleId = generateId();
    roleIdByName.set(role.name, roleId);
    statements.push(
      `INSERT INTO roles (id, name, description, is_locked, is_system, created_at, updated_at) VALUES ` +
        `(${sqlString(roleId)}, ${sqlString(role.name)}, ${sqlString(role.description)}, ` +
        `${sqlBool(role.isLocked)}, ${sqlBool(true)}, ${sqlString(ts)}, ${sqlString(ts)});`,
    );
    for (const perm of role.permissions) {
      for (const action of perm.actions) {
        statements.push(
          `INSERT INTO role_permissions (id, role_id, module_key, action, scope, created_at, updated_at) VALUES ` +
            `(${sqlString(generateId())}, ${sqlString(roleId)}, ${sqlString(perm.module)}, ` +
            `${sqlString(action)}, ${sqlString(perm.scope)}, ${sqlString(ts)}, ${sqlString(ts)});`,
        );
      }
    }
  }

  // --- Admin user --------------------------------------------------------
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword, DEFAULT_PBKDF2_ITERATIONS);
  const adminUserId = generateId();

  statements.push(
    `INSERT INTO users (id, username, password_hash, password_salt, password_iterations, ` +
      `must_change_password, full_name, email, phone, photo_file_id, account_type, status, ` +
      `primary_color, guru_id, failed_login_attempts, locked_until, last_login_at, created_at, updated_at, deleted_at) VALUES ` +
      `(${sqlString(adminUserId)}, ${sqlString("admin")}, ${sqlString(passwordHash.hash)}, ` +
      `${sqlString(passwordHash.salt)}, ${sqlNum(passwordHash.iterations)}, ${sqlBool(true)}, ` +
      `${sqlString("Administrator")}, NULL, NULL, NULL, ${sqlString("STAFF")}, ${sqlString("ACTIVE")}, ` +
      `NULL, NULL, 0, NULL, NULL, ${sqlString(ts)}, ${sqlString(ts)}, NULL);`,
  );

  const adminRoleId = roleIdByName.get(SYSTEM_ROLE_NAMES.ADMIN);
  if (!adminRoleId) throw new Error("Role Admin tidak ditemukan saat seeding user_roles");
  statements.push(
    `INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES ` +
      `(${sqlString(generateId())}, ${sqlString(adminUserId)}, ${sqlString(adminRoleId)}, ${sqlString(ts)});`,
  );

  // --- Academic period -----------------------------------------------------
  const periodId = generateId();
  statements.push(
    `INSERT INTO academic_periods (id, year_label, semester, start_date, end_date, is_active, created_at, updated_at, deleted_at) VALUES ` +
      `(${sqlString(periodId)}, ${sqlString("2026/2027")}, ${sqlString("GANJIL")}, ` +
      `${sqlString("2026-07-13")}, ${sqlString("2026-12-19")}, ${sqlBool(true)}, ` +
      `${sqlString(ts)}, ${sqlString(ts)}, NULL);`,
  );

  // --- Settings ------------------------------------------------------------
  const schoolProfile = {
    nama: "SMP Al-Madinah",
    npsn: "",
    alamat: "",
    kecamatan: "",
    kabupaten_kota: "",
    provinsi: "",
    telepon: "",
    email: "",
    website: "",
    kepala_sekolah_nama: "",
    kepala_sekolah_nip: "",
  };
  const branding = {
    logo_file_id: null,
    kop_file_id: null,
    default_primary_color: "#4f46e5",
  };

  const settingsRows: Array<[string, unknown]> = [
    ["school_profile", schoolProfile],
    ["branding", branding],
    ["activity_log_retention_days", 180],
    ["roles_version", 1],
  ];
  for (const [key, value] of settingsRows) {
    statements.push(
      `INSERT INTO settings (key, value, updated_at) VALUES ` +
        `(${sqlString(key)}, ${sqlString(JSON.stringify(value))}, ${sqlString(ts)});`,
    );
  }

  // --- Tulis & eksekusi ------------------------------------------------
  const tmpDir = mkdtempSync(path.join(tmpdir(), "smpam-seed-"));
  const sqlFile = path.join(tmpDir, `seed-${randomUUID()}.sql`);
  writeFileSync(sqlFile, statements.join("\n"), "utf-8");

  console.log(`Menjalankan ${statements.length} statement seed ke target ${target.replace("--", "")}...`);
  const exec = runWrangler(["d1", "execute", DB_BINDING, target, "--file", sqlFile]);
  rmSync(tmpDir, { recursive: true, force: true });

  if (exec.status !== 0) {
    console.error("Seed gagal. Pastikan migrasi sudah diterapkan terlebih dahulu (npm run db:migrate:local/remote).");
    process.exit(1);
  }

  console.log("\n✅ Seed selesai.\n");
  console.log("Akun Admin:");
  console.log(`  Username : admin`);
  console.log(`  Password : ${tempPassword}  (wajib diganti saat login pertama)`);
  console.log("\nSimpan password ini — tidak akan ditampilkan lagi.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
