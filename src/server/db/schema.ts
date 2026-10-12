import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import {
  ACCOUNT_TYPES,
  USER_STATUSES,
  PERMISSION_ACTIONS,
  PERMISSION_SCOPES,
  SEMESTERS,
  ACTIVITY_ACTIONS,
  FILE_PREFIXES,
  TINGKAT_LIST,
  JENIS_KELAMIN_LIST,
  SISWA_STATUSES,
  MAPEL_JENIS_LIST,
  STATUS_KEPEGAWAIAN_LIST,
  HARI_LIST,
  JENIS_SLOT_LIST,
  JADWAL_VERSI_STATUSES,
  KALENDER_JENIS_LIST,
  KALENDER_CAKUPAN_LIST,
  AGENDA_STATUS_LIST,
  ABSENSI_PERTEMUAN_STATUS_LIST,
  ABSENSI_HARIAN_STATUS_LIST,
  ABSENSI_HARIAN_SUMBER_LIST,
  IZIN_STATUS_LIST,
  PENGGANTI_STATUS_LIST,
  KIOSK_DEVICE_STATUS_LIST,
  WAJAH_SUMBER_LIST,
  PRESENSI_JENIS_LIST,
  PRESENSI_METODE_LIST,
  PRESENSI_STATUS_LIST,
  PRESENSI_SUMBER_LIST,
  REKAP_PRESENSI_STATUS_LIST,
  IZIN_GURU_JENIS_LIST,
  IZIN_GURU_STATUS_LIST,
  TAMU_JENIS_LIST,
  TAMU_STATUS_KUNJUNGAN_LIST,
  PELANGGARAN_STATUS_LIST,
  SANKSI_SISWA_STATUS_LIST,
  TINDAK_LANJUT_JENIS_LIST,
  PRESTASI_BIDANG_LIST,
  PRESTASI_TINGKAT_LIST,
  PRESTASI_JENIS_LIST,
} from "../../shared/constants";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => nanoid());

const timestamps = {
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
};

const softDelete = {
  deleted_at: text("deleted_at"),
};

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable(
  "users",
  {
    id: id(),
    username: text("username").notNull(),
    password_hash: text("password_hash").notNull(),
    password_salt: text("password_salt").notNull(),
    password_iterations: integer("password_iterations").notNull(),
    must_change_password: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(true),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    photo_file_id: text("photo_file_id"),
    account_type: text("account_type", { enum: ACCOUNT_TYPES })
      .notNull()
      .default("STAFF"),
    status: text("status", { enum: USER_STATUSES }).notNull().default("ACTIVE"),
    primary_color: text("primary_color"),
    guru_id: text("guru_id"),
    failed_login_attempts: integer("failed_login_attempts").notNull().default(0),
    locked_until: text("locked_until"),
    last_login_at: text("last_login_at"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("users_username_unique").on(t.username),
    index("users_status_idx").on(t.status),
    index("users_guru_id_idx").on(t.guru_id),
    check("users_account_type_check", sql`${t.account_type} IN ('STAFF','KIOSK')`),
    check("users_status_check", sql`${t.status} IN ('ACTIVE','INACTIVE')`),
  ],
);

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // token itself (random base64url)
    user_id: text("user_id").notNull(),
    expires_at: text("expires_at").notNull(),
    created_at: text("created_at").notNull(),
    last_active_at: text("last_active_at").notNull(),
    ip: text("ip"),
    user_agent: text("user_agent"),
  },
  (t) => [
    index("sessions_user_id_idx").on(t.user_id),
    index("sessions_expires_at_idx").on(t.expires_at),
  ],
);

// ---------------------------------------------------------------------------
// roles
// ---------------------------------------------------------------------------
export const roles = sqliteTable(
  "roles",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    is_locked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
    is_system: integer("is_system", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("roles_name_unique").on(t.name)],
);

// ---------------------------------------------------------------------------
// role_permissions
// ---------------------------------------------------------------------------
export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: id(),
    role_id: text("role_id").notNull(),
    module_key: text("module_key").notNull(),
    action: text("action", { enum: PERMISSION_ACTIONS }).notNull(),
    scope: text("scope", { enum: PERMISSION_SCOPES }).notNull().default("semua"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("role_permissions_unique").on(t.role_id, t.module_key, t.action),
    index("role_permissions_role_id_idx").on(t.role_id),
    check(
      "role_permissions_action_check",
      sql`${t.action} IN ('lihat','tambah','ubah','hapus','export','approve')`,
    ),
    check("role_permissions_scope_check", sql`${t.scope} IN ('semua','milik_sendiri')`),
  ],
);

// ---------------------------------------------------------------------------
// user_roles
// ---------------------------------------------------------------------------
export const userRoles = sqliteTable(
  "user_roles",
  {
    id: id(),
    user_id: text("user_id").notNull(),
    role_id: text("role_id").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("user_roles_unique").on(t.user_id, t.role_id),
    index("user_roles_role_id_idx").on(t.role_id),
    index("user_roles_user_id_idx").on(t.user_id),
  ],
);

// ---------------------------------------------------------------------------
// settings (key-value JSON)
// ---------------------------------------------------------------------------
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
  updated_at: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// academic_periods
// ---------------------------------------------------------------------------
export const academicPeriods = sqliteTable(
  "academic_periods",
  {
    id: id(),
    year_label: text("year_label").notNull(),
    semester: text("semester", { enum: SEMESTERS }).notNull(),
    start_date: text("start_date").notNull(),
    end_date: text("end_date").notNull(),
    is_active: integer("is_active", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("academic_periods_year_semester_unique").on(t.year_label, t.semester),
    index("academic_periods_is_active_idx").on(t.is_active),
    check("academic_periods_semester_check", sql`${t.semester} IN ('GANJIL','GENAP')`),
  ],
);

// ---------------------------------------------------------------------------
// activity_logs
// ---------------------------------------------------------------------------
export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: id(),
    created_at: text("created_at").notNull(),
    user_id: text("user_id"),
    username_snapshot: text("username_snapshot"),
    module_key: text("module_key").notNull(),
    action: text("action", { enum: ACTIVITY_ACTIONS }).notNull(),
    record_id: text("record_id"),
    changes: text("changes"), // JSON { field: { before, after } }, hanya kolom berubah
    ip: text("ip"),
    user_agent: text("user_agent"),
  },
  (t) => [
    index("activity_logs_created_at_idx").on(t.created_at),
    index("activity_logs_user_id_idx").on(t.user_id),
    index("activity_logs_module_created_idx").on(t.module_key, t.created_at),
    check(
      "activity_logs_action_check",
      sql`${t.action} IN ('login_success','login_failed','logout','lockout','create','update','delete','export','approve','password_change','password_reset')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// activity_log_archives
// ---------------------------------------------------------------------------
export const activityLogArchives = sqliteTable(
  "activity_log_archives",
  {
    id: id(),
    year_month: text("year_month").notNull(), // "2026-10"
    r2_key: text("r2_key").notNull(),
    row_count: integer("row_count").notNull(),
    size_bytes: integer("size_bytes").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("activity_log_archives_year_month_unique").on(t.year_month)],
);

// ---------------------------------------------------------------------------
// files (metadata objek R2 — supaya tidak pernah perlu list bucket)
// ---------------------------------------------------------------------------
export const files = sqliteTable(
  "files",
  {
    id: id(),
    r2_key: text("r2_key").notNull(),
    prefix: text("prefix", { enum: FILE_PREFIXES }).notNull(),
    original_name: text("original_name"),
    mime_type: text("mime_type").notNull(),
    size_bytes: integer("size_bytes").notNull(),
    uploaded_by: text("uploaded_by"),
    created_at: text("created_at").notNull(),
    deleted_at: text("deleted_at"),
  },
  (t) => [
    uniqueIndex("files_r2_key_unique").on(t.r2_key),
    index("files_prefix_idx").on(t.prefix),
    check(
      "files_prefix_check",
      sql`${t.prefix} IN ('logo','kop','profil','siswa','guru','selfie','tamu','surat','izin-siswa','wajah','izin-guru')`,
    ),
  ],
);

// =============================================================================
// Tahap 2 — Data Master
// =============================================================================

// ---------------------------------------------------------------------------
// rombel (kelas per periode)
// ---------------------------------------------------------------------------
export const rombel = sqliteTable(
  "rombel",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    tingkat: text("tingkat", { enum: TINGKAT_LIST }).notNull(),
    nama: text("nama").notNull(),
    wali_guru_id: text("wali_guru_id"),
    urutan: integer("urutan").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("rombel_period_nama_unique").on(t.period_id, t.nama),
    index("rombel_period_id_idx").on(t.period_id),
    index("rombel_wali_guru_id_idx").on(t.wali_guru_id),
    check("rombel_tingkat_check", sql`${t.tingkat} IN ('VII','VIII','IX')`),
  ],
);

// ---------------------------------------------------------------------------
// mapel (mata pelajaran)
// ---------------------------------------------------------------------------
export const mapel = sqliteTable(
  "mapel",
  {
    id: id(),
    nama: text("nama").notNull(),
    kode_jadwal: text("kode_jadwal").notNull(),
    alias_kode: text("alias_kode").notNull().default("[]"), // JSON string[]
    jenis: text("jenis", { enum: MAPEL_JENIS_LIST }).notNull(),
    induk_mapel_id: text("induk_mapel_id"),
    tampil_raport: integer("tampil_raport", { mode: "boolean" }).notNull().default(true),
    urutan_raport: integer("urutan_raport").notNull().default(0),
    tingkat_berlaku: text("tingkat_berlaku").notNull().default("[]"), // JSON Tingkat[]
    predikat_config: text("predikat_config").notNull(), // JSON {batas_bawah, label}[]
    is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("mapel_kode_jadwal_unique").on(t.kode_jadwal),
    index("mapel_induk_mapel_id_idx").on(t.induk_mapel_id),
    check("mapel_jenis_check", sql`${t.jenis} IN ('akademik','muatan_lokal','kegiatan')`),
  ],
);

// ---------------------------------------------------------------------------
// siswa
// ---------------------------------------------------------------------------
export const siswa = sqliteTable(
  "siswa",
  {
    id: id(),
    nis: text("nis").notNull(),
    nisn: text("nisn").notNull(),
    nama_lengkap: text("nama_lengkap").notNull(),
    nama_panggilan: text("nama_panggilan"),
    jenis_kelamin: text("jenis_kelamin", { enum: JENIS_KELAMIN_LIST }).notNull(),
    tempat_lahir: text("tempat_lahir"),
    tanggal_lahir: text("tanggal_lahir"),
    agama: text("agama"),
    alamat: text("alamat"),
    foto_file_id: text("foto_file_id"),
    nama_ayah: text("nama_ayah"),
    nama_ibu: text("nama_ibu"),
    nama_wali: text("nama_wali"),
    no_hp_ortu: text("no_hp_ortu"),
    pekerjaan_ortu: text("pekerjaan_ortu"),
    status: text("status", { enum: SISWA_STATUSES }).notNull().default("AKTIF"),
    status_tanggal: text("status_tanggal"),
    status_keterangan: text("status_keterangan"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("siswa_nis_unique").on(t.nis),
    uniqueIndex("siswa_nisn_unique").on(t.nisn),
    index("siswa_status_idx").on(t.status),
    index("siswa_nama_lengkap_idx").on(t.nama_lengkap),
    check("siswa_jenis_kelamin_check", sql`${t.jenis_kelamin} IN ('L','P')`),
    check("siswa_status_check", sql`${t.status} IN ('AKTIF','PINDAH','LULUS','KELUAR')`),
  ],
);

// ---------------------------------------------------------------------------
// siswa_kelas (riwayat penempatan rombel per periode)
// ---------------------------------------------------------------------------
export const siswaKelas = sqliteTable(
  "siswa_kelas",
  {
    id: id(),
    siswa_id: text("siswa_id").notNull(),
    rombel_id: text("rombel_id").notNull(),
    period_id: text("period_id").notNull(),
    nomor_absen: integer("nomor_absen"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("siswa_kelas_siswa_period_unique").on(t.siswa_id, t.period_id),
    index("siswa_kelas_rombel_id_idx").on(t.rombel_id),
    index("siswa_kelas_period_id_idx").on(t.period_id),
  ],
);

// ---------------------------------------------------------------------------
// guru
// ---------------------------------------------------------------------------
export const guru = sqliteTable(
  "guru",
  {
    id: id(),
    nip: text("nip"),
    nuptk: text("nuptk"),
    nama_lengkap: text("nama_lengkap").notNull(),
    nama_tanpa_gelar: text("nama_tanpa_gelar").notNull(),
    jenis_kelamin: text("jenis_kelamin", { enum: JENIS_KELAMIN_LIST }).notNull(),
    tempat_lahir: text("tempat_lahir"),
    tanggal_lahir: text("tanggal_lahir").notNull(),
    no_hp: text("no_hp"),
    email: text("email"),
    alamat: text("alamat"),
    foto_file_id: text("foto_file_id"),
    status_kepegawaian: text("status_kepegawaian", { enum: STATUS_KEPEGAWAIAN_LIST }).notNull(),
    tanggal_mulai_tugas: text("tanggal_mulai_tugas"),
    is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // --- Tahap 4: PIN presensi ---
    pin_hash: text("pin_hash"),
    pin_salt: text("pin_salt"),
    pin_iterations: integer("pin_iterations"),
    pin_is_default: integer("pin_is_default", { mode: "boolean" }).notNull().default(true),
    pin_failed_attempts: integer("pin_failed_attempts").notNull().default(0),
    pin_locked_until: text("pin_locked_until"),
    // --- Tahap 4: persetujuan biometrik wajah ---
    persetujuan_biometrik: integer("persetujuan_biometrik", { mode: "boolean" }).notNull().default(false),
    persetujuan_versi: integer("persetujuan_versi"),
    persetujuan_tanggal: text("persetujuan_tanggal"),
    persetujuan_file_id: text("persetujuan_file_id"),
    // --- Tahap 4: override hari wajib presensi (null = ikut default jam kerja sekolah) ---
    hari_wajib_override: text("hari_wajib_override"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("guru_nip_idx").on(t.nip),
    index("guru_is_active_idx").on(t.is_active),
    index("guru_nama_lengkap_idx").on(t.nama_lengkap),
    check("guru_jenis_kelamin_check", sql`${t.jenis_kelamin} IN ('L','P')`),
    check(
      "guru_status_kepegawaian_check",
      sql`${t.status_kepegawaian} IN ('PNS','PPPK','GTY','GTT','HONORER')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// guru_alias (variasi penulisan nama — dipakai pencocokan import jadwal)
// ---------------------------------------------------------------------------
export const guruAlias = sqliteTable(
  "guru_alias",
  {
    id: id(),
    guru_id: text("guru_id").notNull(),
    alias_nama: text("alias_nama").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    index("guru_alias_guru_id_idx").on(t.guru_id),
    uniqueIndex("guru_alias_unique").on(t.guru_id, t.alias_nama),
  ],
);

// ---------------------------------------------------------------------------
// guru_tugas_tambahan
// ---------------------------------------------------------------------------
export const guruTugasTambahan = sqliteTable(
  "guru_tugas_tambahan",
  {
    id: id(),
    guru_id: text("guru_id").notNull(),
    period_id: text("period_id").notNull(),
    nama_tugas: text("nama_tugas").notNull(),
    keterangan: text("keterangan"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    index("guru_tugas_tambahan_guru_id_idx").on(t.guru_id),
    index("guru_tugas_tambahan_period_id_idx").on(t.period_id),
  ],
);

// ---------------------------------------------------------------------------
// pembagian_tugas (guru mengajar rombel+mapel pada suatu periode)
// ---------------------------------------------------------------------------
export const pembagianTugas = sqliteTable(
  "pembagian_tugas",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    guru_id: text("guru_id").notNull(),
    rombel_id: text("rombel_id").notNull(),
    mapel_id: text("mapel_id").notNull(),
    is_team_teaching: integer("is_team_teaching", { mode: "boolean" }).notNull().default(false),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("pembagian_tugas_unique").on(t.period_id, t.rombel_id, t.mapel_id, t.guru_id),
    index("pembagian_tugas_period_guru_idx").on(t.period_id, t.guru_id),
    index("pembagian_tugas_period_rombel_idx").on(t.period_id, t.rombel_id),
  ],
);

// ---------------------------------------------------------------------------
// jadwal_versi
// ---------------------------------------------------------------------------
export const jadwalVersi = sqliteTable(
  "jadwal_versi",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    nama: text("nama").notNull(),
    status: text("status", { enum: JADWAL_VERSI_STATUSES }).notNull().default("draf"),
    tanggal_mulai_berlaku: text("tanggal_mulai_berlaku"),
    ...timestamps,
  },
  (t) => [
    index("jadwal_versi_period_id_idx").on(t.period_id),
    index("jadwal_versi_status_idx").on(t.status),
    check("jadwal_versi_status_check", sql`${t.status} IN ('draf','aktif','arsip')`),
  ],
);

// ---------------------------------------------------------------------------
// jadwal_slot
// ---------------------------------------------------------------------------
export const jadwalSlot = sqliteTable(
  "jadwal_slot",
  {
    id: id(),
    jadwal_versi_id: text("jadwal_versi_id").notNull(),
    hari: text("hari", { enum: HARI_LIST }).notNull(),
    urutan: integer("urutan").notNull(),
    jam_mulai: text("jam_mulai").notNull(),
    jam_selesai: text("jam_selesai").notNull(),
    jam_ke: integer("jam_ke"),
    jenis_slot: text("jenis_slot", { enum: JENIS_SLOT_LIST }).notNull(),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    index("jadwal_slot_versi_hari_idx").on(t.jadwal_versi_id, t.hari),
    check(
      "jadwal_slot_hari_check",
      sql`${t.hari} IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU')`,
    ),
    check(
      "jadwal_slot_jenis_check",
      sql`${t.jenis_slot} IN ('kbm','istirahat','pembiasaan','upacara','kegiatan')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// jadwal_isi (slot x rombel -> mapel/keterangan)
// ---------------------------------------------------------------------------
export const jadwalIsi = sqliteTable(
  "jadwal_isi",
  {
    id: id(),
    jadwal_slot_id: text("jadwal_slot_id").notNull(),
    rombel_id: text("rombel_id").notNull(),
    mapel_id: text("mapel_id"),
    keterangan: text("keterangan"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("jadwal_isi_slot_rombel_unique").on(t.jadwal_slot_id, t.rombel_id),
    index("jadwal_isi_rombel_id_idx").on(t.rombel_id),
  ],
);

// ---------------------------------------------------------------------------
// jadwal_isi_guru (junction — mendukung team teaching)
// ---------------------------------------------------------------------------
export const jadwalIsiGuru = sqliteTable(
  "jadwal_isi_guru",
  {
    id: id(),
    jadwal_isi_id: text("jadwal_isi_id").notNull(),
    guru_id: text("guru_id").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("jadwal_isi_guru_unique").on(t.jadwal_isi_id, t.guru_id),
    index("jadwal_isi_guru_guru_id_idx").on(t.guru_id),
  ],
);

// ---------------------------------------------------------------------------
// jadwal_piket
// ---------------------------------------------------------------------------
export const jadwalPiket = sqliteTable(
  "jadwal_piket",
  {
    id: id(),
    jadwal_versi_id: text("jadwal_versi_id").notNull(),
    hari: text("hari", { enum: HARI_LIST }).notNull(),
    guru_id: text("guru_id").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("jadwal_piket_unique").on(t.jadwal_versi_id, t.hari, t.guru_id),
    index("jadwal_piket_versi_hari_idx").on(t.jadwal_versi_id, t.hari),
    check(
      "jadwal_piket_hari_check",
      sql`${t.hari} IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// kalender_entri (libur & kegiatan khusus — Tahap 3)
// ---------------------------------------------------------------------------
export const kalenderEntri = sqliteTable(
  "kalender_entri",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    nama: text("nama").notNull(),
    tanggal_mulai: text("tanggal_mulai").notNull(),
    tanggal_selesai: text("tanggal_selesai").notNull(),
    jenis: text("jenis", { enum: KALENDER_JENIS_LIST }).notNull(),
    kbm_ditiadakan: integer("kbm_ditiadakan", { mode: "boolean" }).notNull().default(true),
    cakupan: text("cakupan", { enum: KALENDER_CAKUPAN_LIST }).notNull().default("SEMUA"),
    tingkat_berlaku: text("tingkat_berlaku").notNull().default("[]"), // JSON Tingkat[]
    keterangan: text("keterangan"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("kalender_entri_period_tanggal_idx").on(t.period_id, t.tanggal_mulai, t.tanggal_selesai),
    check(
      "kalender_entri_jenis_check",
      sql`${t.jenis} IN ('LIBUR_NASIONAL','LIBUR_SEKOLAH','UJIAN','KEGIATAN_SEKOLAH','LAINNYA')`,
    ),
    check("kalender_entri_cakupan_check", sql`${t.cakupan} IN ('SEMUA','TINGKAT')`),
  ],
);

// ---------------------------------------------------------------------------
// agenda (satu baris per pertemuan — Tahap 3)
// ---------------------------------------------------------------------------
export const agenda = sqliteTable(
  "agenda",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    tanggal: text("tanggal").notNull(),
    rombel_id: text("rombel_id").notNull(),
    mapel_id: text("mapel_id"), // null utk kegiatan tanpa mapel spesifik / jam kosong
    guru_id: text("guru_id").notNull(), // pengisi (bisa pengganti)
    guru_jadwal_id: text("guru_jadwal_id").notNull(), // guru asli di jadwal
    jadwal_versi_id: text("jadwal_versi_id").notNull(),
    hari: text("hari", { enum: HARI_LIST }).notNull(),
    jam_ke_mulai: integer("jam_ke_mulai"),
    jam_ke_selesai: integer("jam_ke_selesai"),
    slot_mulai: text("slot_mulai").notNull(),
    slot_selesai: text("slot_selesai").notNull(),
    jumlah_jp: integer("jumlah_jp").notNull(),
    materi: text("materi").notNull(),
    kegiatan: text("kegiatan"),
    catatan: text("catatan"),
    status: text("status", { enum: AGENDA_STATUS_LIST }).notNull().default("terisi"),
    is_pengganti: integer("is_pengganti", { mode: "boolean" }).notNull().default(false),
    diisi_terlambat: integer("diisi_terlambat", { mode: "boolean" }).notNull().default(false),
    jumlah_siswa: integer("jumlah_siswa").notNull().default(0),
    diisi_pada: text("diisi_pada").notNull(),
    diubah_pada: text("diubah_pada").notNull(),
  },
  (t) => [
    uniqueIndex("agenda_rombel_tanggal_slot_unique").on(t.rombel_id, t.tanggal, t.slot_mulai),
    index("agenda_period_rombel_tanggal_idx").on(t.period_id, t.rombel_id, t.tanggal),
    index("agenda_guru_tanggal_idx").on(t.guru_id, t.tanggal),
    index("agenda_rombel_mapel_tanggal_idx").on(t.rombel_id, t.mapel_id, t.tanggal),
    check("agenda_status_check", sql`${t.status} IN ('terisi','jam_kosong')`),
    check(
      "agenda_hari_check",
      sql`${t.hari} IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// absensi (pengecualian kehadiran per pertemuan — Tahap 3)
// ---------------------------------------------------------------------------
export const absensi = sqliteTable(
  "absensi",
  {
    id: id(),
    agenda_id: text("agenda_id").notNull(),
    siswa_id: text("siswa_id").notNull(),
    status: text("status", { enum: ABSENSI_PERTEMUAN_STATUS_LIST }).notNull(),
    keterangan: text("keterangan"),
  },
  (t) => [
    uniqueIndex("absensi_agenda_siswa_unique").on(t.agenda_id, t.siswa_id),
    index("absensi_siswa_id_idx").on(t.siswa_id),
    check("absensi_status_check", sql`${t.status} IN ('S','I','A','T','D')`),
  ],
);

// ---------------------------------------------------------------------------
// izin_harian_siswa (Tahap 3)
// ---------------------------------------------------------------------------
export const izinHarianSiswa = sqliteTable(
  "izin_harian_siswa",
  {
    id: id(),
    siswa_id: text("siswa_id").notNull(),
    tanggal_mulai: text("tanggal_mulai").notNull(),
    tanggal_selesai: text("tanggal_selesai").notNull(),
    status: text("status", { enum: IZIN_STATUS_LIST }).notNull(),
    keterangan: text("keterangan"),
    lampiran_file_id: text("lampiran_file_id"),
    dibuat_oleh: text("dibuat_oleh").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("izin_harian_siswa_siswa_tanggal_idx").on(t.siswa_id, t.tanggal_mulai),
    index("izin_harian_siswa_tanggal_mulai_idx").on(t.tanggal_mulai),
    check("izin_harian_siswa_status_check", sql`${t.status} IN ('S','I','D')`),
  ],
);

// ---------------------------------------------------------------------------
// absensi_harian (rekap status harian — hanya baris non-Hadir — Tahap 3)
// ---------------------------------------------------------------------------
export const absensiHarian = sqliteTable(
  "absensi_harian",
  {
    id: id(),
    siswa_id: text("siswa_id").notNull(),
    rombel_id: text("rombel_id").notNull(),
    period_id: text("period_id").notNull(),
    tanggal: text("tanggal").notNull(),
    status: text("status", { enum: ABSENSI_HARIAN_STATUS_LIST }).notNull(),
    sumber: text("sumber", { enum: ABSENSI_HARIAN_SUMBER_LIST }).notNull().default("otomatis"),
    keterangan: text("keterangan"),
    diubah_oleh: text("diubah_oleh"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("absensi_harian_siswa_tanggal_unique").on(t.siswa_id, t.tanggal),
    index("absensi_harian_rombel_tanggal_idx").on(t.rombel_id, t.tanggal),
    check("absensi_harian_status_check", sql`${t.status} IN ('S','I','A')`),
    check("absensi_harian_sumber_check", sql`${t.sumber} IN ('otomatis','koreksi_wali')`),
  ],
);

// ---------------------------------------------------------------------------
// rekap_harian_rombel (Tahap 3)
// ---------------------------------------------------------------------------
export const rekapHarianRombel = sqliteTable(
  "rekap_harian_rombel",
  {
    id: id(),
    rombel_id: text("rombel_id").notNull(),
    period_id: text("period_id").notNull(),
    tanggal: text("tanggal").notNull(),
    jumlah_siswa: integer("jumlah_siswa").notNull().default(0),
    jumlah_s: integer("jumlah_s").notNull().default(0),
    jumlah_i: integer("jumlah_i").notNull().default(0),
    jumlah_a: integer("jumlah_a").notNull().default(0),
    jp_terjadwal: integer("jp_terjadwal").notNull().default(0),
    jp_terisi: integer("jp_terisi").notNull().default(0),
    jp_kosong: integer("jp_kosong").notNull().default(0),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("rekap_harian_rombel_rombel_tanggal_unique").on(t.rombel_id, t.tanggal),
    index("rekap_harian_rombel_tanggal_idx").on(t.tanggal),
  ],
);

// ---------------------------------------------------------------------------
// jadwal_pengganti (guru pengganti & jam kosong — Tahap 3)
// ---------------------------------------------------------------------------
export const jadwalPengganti = sqliteTable(
  "jadwal_pengganti",
  {
    id: id(),
    jadwal_slot_id: text("jadwal_slot_id").notNull(),
    rombel_id: text("rombel_id").notNull(),
    tanggal: text("tanggal").notNull(),
    guru_asli_id: text("guru_asli_id").notNull(),
    guru_pengganti_id: text("guru_pengganti_id"), // null = jam kosong
    alasan: text("alasan"),
    status: text("status", { enum: PENGGANTI_STATUS_LIST }).notNull(),
    dibuat_oleh: text("dibuat_oleh").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("jadwal_pengganti_slot_rombel_tanggal_unique").on(t.jadwal_slot_id, t.rombel_id, t.tanggal),
    index("jadwal_pengganti_tanggal_idx").on(t.tanggal),
    check("jadwal_pengganti_status_check", sql`${t.status} IN ('pengganti','jam_kosong')`),
  ],
);

// =============================================================================
// Tahap 4 — Kiosk Presensi Guru + Buku Tamu
// =============================================================================

export const kioskPairingCodes = sqliteTable(
  "kiosk_pairing_codes",
  {
    id: id(),
    code: text("code").notNull(),
    nama: text("nama").notNull(),
    lokasi: text("lokasi"),
    expires_at: text("expires_at").notNull(),
    used_at: text("used_at"),
    created_by: text("created_by").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("kiosk_pairing_codes_code_unique").on(t.code)],
);

export const kioskDevices = sqliteTable(
  "kiosk_devices",
  {
    id: id(),
    nama: text("nama").notNull(),
    lokasi: text("lokasi"),
    session_id: text("session_id").notNull(),
    status: text("status", { enum: KIOSK_DEVICE_STATUS_LIST }).notNull().default("aktif"),
    paired_at: text("paired_at").notNull(),
    last_active_at: text("last_active_at"),
    created_by: text("created_by").notNull(),
  },
  (t) => [
    uniqueIndex("kiosk_devices_session_id_unique").on(t.session_id),
    index("kiosk_devices_status_idx").on(t.status),
    check("kiosk_devices_status_check", sql`${t.status} IN ('aktif','dicabut')`),
  ],
);

export const wajahGuruDescriptor = sqliteTable(
  "wajah_guru_descriptor",
  {
    id: id(),
    guru_id: text("guru_id").notNull(),
    descriptor: text("descriptor").notNull(), // Float32Array -> base64
    sumber: text("sumber", { enum: WAJAH_SUMBER_LIST }).notNull(),
    foto_file_id: text("foto_file_id"),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    index("wajah_guru_descriptor_guru_idx").on(t.guru_id),
    check("wajah_guru_descriptor_sumber_check", sql`${t.sumber} IN ('manual','otomatis')`),
  ],
);

export const presensiGuru = sqliteTable(
  "presensi_guru",
  {
    id: id(),
    guru_id: text("guru_id").notNull(),
    tanggal: text("tanggal").notNull(),
    jenis: text("jenis", { enum: PRESENSI_JENIS_LIST }).notNull(),
    waktu: text("waktu").notNull(), // HH:MM, dari jam server
    metode: text("metode", { enum: PRESENSI_METODE_LIST }).notNull(),
    skor_kemiripan: integer("skor_kemiripan"), // dibulatkan ke 0-1000 (3 desimal) supaya integer
    liveness_lolos: integer("liveness_lolos", { mode: "boolean" }),
    kiosk_device_id: text("kiosk_device_id"),
    foto_file_id: text("foto_file_id"),
    status: text("status", { enum: PRESENSI_STATUS_LIST }).notNull(),
    sumber: text("sumber", { enum: PRESENSI_SUMBER_LIST }).notNull().default("langsung"),
    waktu_perangkat: text("waktu_perangkat"),
    catatan: text("catatan"),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    index("presensi_guru_guru_tanggal_idx").on(t.guru_id, t.tanggal),
    index("presensi_guru_tanggal_idx").on(t.tanggal),
    check("presensi_guru_jenis_check", sql`${t.jenis} IN ('datang','pulang')`),
    check("presensi_guru_metode_check", sql`${t.metode} IN ('wajah','pin')`),
    check("presensi_guru_status_check", sql`${t.status} IN ('tepat_waktu','terlambat','pulang_cepat')`),
    check("presensi_guru_sumber_check", sql`${t.sumber} IN ('langsung','antrean_offline')`),
  ],
);

export const rekapPresensiGuruHarian = sqliteTable(
  "rekap_presensi_guru_harian",
  {
    id: id(),
    guru_id: text("guru_id").notNull(),
    tanggal: text("tanggal").notNull(),
    jam_datang: text("jam_datang"),
    jam_pulang: text("jam_pulang"),
    status: text("status", { enum: REKAP_PRESENSI_STATUS_LIST }).notNull(),
    menit_terlambat: integer("menit_terlambat").notNull().default(0),
    menit_pulang_cepat: integer("menit_pulang_cepat").notNull().default(0),
    metode_datang: text("metode_datang", { enum: PRESENSI_METODE_LIST }),
    metode_pulang: text("metode_pulang", { enum: PRESENSI_METODE_LIST }),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("rekap_presensi_guru_harian_guru_tanggal_unique").on(t.guru_id, t.tanggal),
    index("rekap_presensi_guru_harian_tanggal_idx").on(t.tanggal),
    check(
      "rekap_presensi_guru_harian_status_check",
      sql`${t.status} IN ('tepat_waktu','terlambat','pulang_cepat','tidak_presensi_pulang','tidak_hadir','izin','sakit','dinas_luar','cuti')`,
    ),
  ],
);

export const izinGuru = sqliteTable(
  "izin_guru",
  {
    id: id(),
    guru_id: text("guru_id").notNull(),
    jenis: text("jenis", { enum: IZIN_GURU_JENIS_LIST }).notNull(),
    tanggal_mulai: text("tanggal_mulai").notNull(),
    tanggal_selesai: text("tanggal_selesai").notNull(),
    parsial: integer("parsial", { mode: "boolean" }).notNull().default(false),
    jam_dari: text("jam_dari"),
    jam_sampai: text("jam_sampai"),
    keterangan: text("keterangan"),
    lampiran_file_id: text("lampiran_file_id"),
    status: text("status", { enum: IZIN_GURU_STATUS_LIST }).notNull().default("disetujui"),
    dibuat_oleh: text("dibuat_oleh").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("izin_guru_guru_tanggal_idx").on(t.guru_id, t.tanggal_mulai),
    index("izin_guru_tanggal_mulai_idx").on(t.tanggal_mulai),
    check("izin_guru_jenis_check", sql`${t.jenis} IN ('izin','sakit','dinas_luar','cuti')`),
    check("izin_guru_status_check", sql`${t.status} IN ('diajukan','disetujui','ditolak')`),
  ],
);

export const tamu = sqliteTable(
  "tamu",
  {
    id: id(),
    jenis: text("jenis", { enum: TAMU_JENIS_LIST }).notNull(),
    nama_instansi: text("nama_instansi"),
    nama: text("nama").notNull(),
    maksud_tujuan: text("maksud_tujuan").notNull(),
    no_hp: text("no_hp"),
    ingin_bertemu_guru_id: text("ingin_bertemu_guru_id"),
    foto_file_id: text("foto_file_id"),
    status_kunjungan: text("status_kunjungan", { enum: TAMU_STATUS_KUNJUNGAN_LIST }).notNull().default("menunggu"),
    kiosk_device_id: text("kiosk_device_id"),
    tanggal: text("tanggal").notNull(),
    waktu: text("waktu").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    index("tamu_tanggal_idx").on(t.tanggal),
    check("tamu_jenis_check", sql`${t.jenis} IN ('individu','instansi')`),
    check("tamu_status_kunjungan_check", sql`${t.status_kunjungan} IN ('menunggu','dilayani','selesai')`),
  ],
);

// =============================================================================
// Tahap 5 — Pelanggaran & Prestasi
// =============================================================================

export const pelanggaranKategori = sqliteTable(
  "pelanggaran_kategori",
  {
    id: id(),
    nama: text("nama").notNull(),
    warna: text("warna").notNull(),
    urutan: integer("urutan").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("pelanggaran_kategori_urutan_idx").on(t.urutan)],
);

export const pelanggaranJenis = sqliteTable(
  "pelanggaran_jenis",
  {
    id: id(),
    kategori_id: text("kategori_id").notNull(),
    nama: text("nama").notNull(),
    poin: integer("poin").notNull(),
    deskripsi: text("deskripsi"),
    aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("pelanggaran_jenis_kategori_idx").on(t.kategori_id)],
);

export const pelanggaran = sqliteTable(
  "pelanggaran",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    tahun_ajaran: text("tahun_ajaran").notNull(),
    siswa_id: text("siswa_id").notNull(),
    rombel_id: text("rombel_id"), // snapshot rombel siswa saat dicatat, bisa null kalau siswa belum punya rombel
    jenis_id: text("jenis_id").notNull(),
    poin: integer("poin").notNull(), // snapshot poin jenis saat dicatat
    tanggal: text("tanggal").notNull(),
    waktu: text("waktu").notNull(),
    lokasi: text("lokasi"),
    keterangan: text("keterangan"),
    foto_file_id: text("foto_file_id"),
    pelapor_user_id: text("pelapor_user_id").notNull(),
    status: text("status", { enum: PELANGGARAN_STATUS_LIST }).notNull().default("tercatat"),
    alasan_batal: text("alasan_batal"),
    dibatalkan_oleh: text("dibatalkan_oleh"),
    dibatalkan_pada: text("dibatalkan_pada"),
    ...timestamps,
  },
  (t) => [
    index("pelanggaran_siswa_tanggal_idx").on(t.siswa_id, t.tanggal),
    index("pelanggaran_period_tanggal_idx").on(t.period_id, t.tanggal),
    index("pelanggaran_rombel_tanggal_idx").on(t.rombel_id, t.tanggal),
    index("pelanggaran_pelapor_idx").on(t.pelapor_user_id),
    check("pelanggaran_status_check", sql`${t.status} IN ('tercatat','dibatalkan')`),
  ],
);

export const sanksiAmbang = sqliteTable(
  "sanksi_ambang",
  {
    id: id(),
    poin_minimal: integer("poin_minimal").notNull(),
    nama: text("nama").notNull(),
    deskripsi: text("deskripsi"),
    urutan: integer("urutan").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("sanksi_ambang_poin_minimal_unique").on(t.poin_minimal)],
);

export const sanksiSiswa = sqliteTable(
  "sanksi_siswa",
  {
    id: id(),
    siswa_id: text("siswa_id").notNull(),
    tahun_ajaran: text("tahun_ajaran").notNull(),
    ambang_id: text("ambang_id").notNull(),
    tercapai_pada: text("tercapai_pada").notNull(),
    status: text("status", { enum: SANKSI_SISWA_STATUS_LIST }).notNull().default("belum"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("sanksi_siswa_siswa_tahun_ambang_unique").on(t.siswa_id, t.tahun_ajaran, t.ambang_id),
    index("sanksi_siswa_siswa_idx").on(t.siswa_id),
    check("sanksi_siswa_status_check", sql`${t.status} IN ('belum','proses','selesai','dibatalkan')`),
  ],
);

export const tindakLanjut = sqliteTable(
  "tindak_lanjut",
  {
    id: id(),
    sanksi_siswa_id: text("sanksi_siswa_id"),
    pelanggaran_id: text("pelanggaran_id"),
    tanggal: text("tanggal").notNull(),
    jenis: text("jenis", { enum: TINDAK_LANJUT_JENIS_LIST }).notNull(),
    hasil: text("hasil"),
    petugas_user_id: text("petugas_user_id").notNull(),
    lampiran_file_id: text("lampiran_file_id"),
    ...timestamps,
  },
  (t) => [
    index("tindak_lanjut_sanksi_siswa_idx").on(t.sanksi_siswa_id),
    index("tindak_lanjut_pelanggaran_idx").on(t.pelanggaran_id),
    check(
      "tindak_lanjut_jenis_check",
      sql`${t.jenis} IN ('pembinaan','panggilan_ortu','home_visit','surat','lainnya')`,
    ),
  ],
);

export const rekapPoinSiswa = sqliteTable(
  "rekap_poin_siswa",
  {
    id: id(),
    siswa_id: text("siswa_id").notNull(),
    tahun_ajaran: text("tahun_ajaran").notNull(),
    total_poin: integer("total_poin").notNull().default(0),
    jumlah_pelanggaran: integer("jumlah_pelanggaran").notNull().default(0),
    terakhir_pada: text("terakhir_pada"),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("rekap_poin_siswa_siswa_tahun_unique").on(t.siswa_id, t.tahun_ajaran),
    index("rekap_poin_siswa_tahun_total_idx").on(t.tahun_ajaran, t.total_poin),
  ],
);

// ---------------------------------------------------------------------------
// notifikasi (lintas modul — dikirim lewat kirimNotifikasi(), Tahap 5)
// ---------------------------------------------------------------------------
export const notifikasi = sqliteTable(
  "notifikasi",
  {
    id: id(),
    user_id: text("user_id").notNull(),
    judul: text("judul").notNull(),
    isi: text("isi").notNull(),
    tautan: text("tautan"),
    modul: text("modul"),
    dibaca_pada: text("dibaca_pada"),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    index("notifikasi_user_created_idx").on(t.user_id, t.created_at),
    index("notifikasi_user_dibaca_idx").on(t.user_id, t.dibaca_pada),
  ],
);

// ---------------------------------------------------------------------------
// prestasi (Tahap 5, sesi 5-3 — terpisah dari pelanggaran, tidak mengurangi poin)
// ---------------------------------------------------------------------------
export const prestasi = sqliteTable(
  "prestasi",
  {
    id: id(),
    period_id: text("period_id").notNull(),
    siswa_id: text("siswa_id").notNull(),
    rombel_id: text("rombel_id"), // snapshot rombel siswa saat dicatat
    nama_kegiatan: text("nama_kegiatan").notNull(),
    bidang: text("bidang", { enum: PRESTASI_BIDANG_LIST }).notNull(),
    tingkat: text("tingkat", { enum: PRESTASI_TINGKAT_LIST }).notNull(),
    capaian: text("capaian").notNull(), // "Juara 1", "Harapan 2", dst — teks bebas
    jenis: text("jenis", { enum: PRESTASI_JENIS_LIST }).notNull(),
    penyelenggara: text("penyelenggara"),
    tanggal: text("tanggal").notNull(),
    keterangan: text("keterangan"),
    sertifikat_file_id: text("sertifikat_file_id"),
    tampil_di_raport: integer("tampil_di_raport", { mode: "boolean" }).notNull().default(true),
    judul_raport: text("judul_raport").notNull(),
    keterangan_raport: text("keterangan_raport").notNull(),
    dicatat_oleh: text("dicatat_oleh").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("prestasi_siswa_tanggal_idx").on(t.siswa_id, t.tanggal),
    index("prestasi_period_idx").on(t.period_id),
    check("prestasi_bidang_check", sql`${t.bidang} IN ('akademik','non_akademik','keagamaan','olahraga','seni','lainnya')`),
    check(
      "prestasi_tingkat_check",
      sql`${t.tingkat} IN ('sekolah','kecamatan','kabupaten','provinsi','nasional','internasional')`,
    ),
    check("prestasi_jenis_check", sql`${t.jenis} IN ('individu','beregu')`),
  ],
);
