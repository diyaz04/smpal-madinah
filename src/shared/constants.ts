export const ACCOUNT_TYPES = ["STAFF", "KIOSK"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PERMISSION_ACTIONS = [
  "lihat",
  "tambah",
  "ubah",
  "hapus",
  "export",
  "approve",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  lihat: "Lihat",
  tambah: "Tambah",
  ubah: "Ubah",
  hapus: "Hapus",
  export: "Export",
  approve: "Approve",
};

export const PERMISSION_SCOPES = ["semua", "milik_sendiri"] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
  semua: "Semua data",
  milik_sendiri: "Milik sendiri",
};

export const SEMESTERS = ["GANJIL", "GENAP"] as const;
export type Semester = (typeof SEMESTERS)[number];

export const SEMESTER_LABELS: Record<Semester, string> = {
  GANJIL: "Ganjil",
  GENAP: "Genap",
};

export const ACTIVITY_ACTIONS = [
  "login_success",
  "login_failed",
  "logout",
  "lockout",
  "create",
  "update",
  "delete",
  "export",
  "approve",
  "password_change",
  "password_reset",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  login_success: "Login berhasil",
  login_failed: "Login gagal",
  logout: "Keluar",
  lockout: "Akun terkunci",
  create: "Tambah data",
  update: "Ubah data",
  delete: "Hapus data",
  export: "Export data",
  approve: "Approve",
  password_change: "Ganti password",
  password_reset: "Reset password",
};

export const FILE_PREFIXES = [
  "logo",
  "kop",
  "profil",
  "siswa",
  "guru",
  "selfie",
  "tamu",
  "surat",
  "izin-siswa",
  "wajah",
  "izin-guru",
  "pelanggaran",
  "tindak-lanjut",
  "prestasi",
] as const;
export type FilePrefix = (typeof FILE_PREFIXES)[number];

/** Prefix yang sudah dipakai (lainnya disiapkan untuk tahap berikutnya). */
export const ACTIVE_FILE_PREFIXES: FilePrefix[] = [
  "logo",
  "kop",
  "profil",
  "siswa",
  "guru",
  "izin-siswa",
  "selfie",
  "tamu",
  "wajah",
  "izin-guru",
  "pelanggaran",
  "tindak-lanjut",
  "prestasi",
];

export const THEME_COLOR_PRESETS = [
  { name: "Biru", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Hijau Zamrud", hex: "#059669" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Ungu", hex: "#7c3aed" },
  { name: "Merah Mawar", hex: "#e11d48" },
  { name: "Oranye", hex: "#ea580c" },
  { name: "Abu Slate", hex: "#475569" },
] as const;

export const DEFAULT_PRIMARY_COLOR = "#4f46e5";

// ---------------------------------------------------------------------------
// Tahap 2 — Data Master
// ---------------------------------------------------------------------------

export const TINGKAT_LIST = ["VII", "VIII", "IX"] as const;
export type Tingkat = (typeof TINGKAT_LIST)[number];

export const JENIS_KELAMIN_LIST = ["L", "P"] as const;
export type JenisKelamin = (typeof JENIS_KELAMIN_LIST)[number];
export const JENIS_KELAMIN_LABELS: Record<JenisKelamin, string> = {
  L: "Laki-laki",
  P: "Perempuan",
};

export const SISWA_STATUSES = ["AKTIF", "PINDAH", "LULUS", "KELUAR"] as const;
export type SiswaStatus = (typeof SISWA_STATUSES)[number];
export const SISWA_STATUS_LABELS: Record<SiswaStatus, string> = {
  AKTIF: "Aktif",
  PINDAH: "Pindah",
  LULUS: "Lulus",
  KELUAR: "Keluar",
};

export const MAPEL_JENIS_LIST = ["akademik", "muatan_lokal", "kegiatan"] as const;
export type MapelJenis = (typeof MAPEL_JENIS_LIST)[number];
export const MAPEL_JENIS_LABELS: Record<MapelJenis, string> = {
  akademik: "Akademik",
  muatan_lokal: "Muatan Lokal",
  kegiatan: "Kegiatan",
};

export const STATUS_KEPEGAWAIAN_LIST = ["PNS", "PPPK", "GTY", "GTT", "HONORER"] as const;
export type StatusKepegawaian = (typeof STATUS_KEPEGAWAIAN_LIST)[number];

export const HARI_LIST = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;
export type Hari = (typeof HARI_LIST)[number];

export const JENIS_SLOT_LIST = ["kbm", "istirahat", "pembiasaan", "upacara", "kegiatan"] as const;
export type JenisSlot = (typeof JENIS_SLOT_LIST)[number];
export const JENIS_SLOT_LABELS: Record<JenisSlot, string> = {
  kbm: "KBM",
  istirahat: "Istirahat",
  pembiasaan: "Pembiasaan",
  upacara: "Upacara",
  kegiatan: "Kegiatan",
};

export const JADWAL_VERSI_STATUSES = ["draf", "aktif", "arsip"] as const;
export type JadwalVersiStatus = (typeof JADWAL_VERSI_STATUSES)[number];
export const JADWAL_VERSI_STATUS_LABELS: Record<JadwalVersiStatus, string> = {
  draf: "Draf",
  aktif: "Aktif",
  arsip: "Arsip",
};

export const DEFAULT_TUGAS_TAMBAHAN_OPTIONS = [
  "BK",
  "TU",
  "Piket",
  "Bendahara",
  "Operator",
  "Kesiswaan",
  "Kurikulum",
  "Lainnya",
];

export const DEFAULT_JADWAL_KATA_KUNCI = {
  pembiasaan: ["pembiasaan", "shalat", "sholat", "tadarus", "dzikir"],
  istirahat: ["istirahat"],
  upacara: ["upacara"],
};

/** Ambang batas JP/minggu sertifikasi guru (standar umum Indonesia), dipakai penanda "di bawah minimal" di ringkasan pembagian tugas. */
export const MINIMAL_JP_MENGAJAR = 24;

export const SYSTEM_ROLE_NAMES = {
  ADMIN: "Admin",
  KEPALA_SEKOLAH: "Kepala Sekolah",
  GURU: "Guru",
  WALI_KELAS: "Wali Kelas",
  BK_KESISWAAN: "BK/Kesiswaan",
  GURU_PIKET: "Guru Piket",
  KIOSK: "Kiosk",
  TU: "TU",
} as const;

// ---------------------------------------------------------------------------
// Tahap 3 — Agenda Guru + Absensi Siswa
// ---------------------------------------------------------------------------

export const KALENDER_JENIS_LIST = [
  "LIBUR_NASIONAL",
  "LIBUR_SEKOLAH",
  "UJIAN",
  "KEGIATAN_SEKOLAH",
  "LAINNYA",
] as const;
export type KalenderJenis = (typeof KALENDER_JENIS_LIST)[number];
export const KALENDER_JENIS_LABELS: Record<KalenderJenis, string> = {
  LIBUR_NASIONAL: "Libur Nasional",
  LIBUR_SEKOLAH: "Libur Sekolah",
  UJIAN: "Ujian",
  KEGIATAN_SEKOLAH: "Kegiatan Sekolah",
  LAINNYA: "Lainnya",
};

export const KALENDER_CAKUPAN_LIST = ["SEMUA", "TINGKAT"] as const;
export type KalenderCakupan = (typeof KALENDER_CAKUPAN_LIST)[number];

export const AGENDA_STATUS_LIST = ["terisi", "jam_kosong"] as const;
export type AgendaStatus = (typeof AGENDA_STATUS_LIST)[number];
export const AGENDA_STATUS_LABELS: Record<AgendaStatus, string> = {
  terisi: "Terisi",
  jam_kosong: "Jam Kosong",
};

export const ABSENSI_PERTEMUAN_STATUS_LIST = ["S", "I", "A", "T", "D"] as const;
export type AbsensiPertemuanStatus = (typeof ABSENSI_PERTEMUAN_STATUS_LIST)[number];
export const ABSENSI_PERTEMUAN_STATUS_LABELS: Record<AbsensiPertemuanStatus, string> = {
  S: "Sakit",
  I: "Izin",
  A: "Alpa",
  T: "Terlambat",
  D: "Dispensasi",
};

export const ABSENSI_HARIAN_STATUS_LIST = ["S", "I", "A"] as const;
export type AbsensiHarianStatus = (typeof ABSENSI_HARIAN_STATUS_LIST)[number];
export const ABSENSI_HARIAN_STATUS_LABELS: Record<AbsensiHarianStatus, string> = {
  S: "Sakit",
  I: "Izin",
  A: "Alpa",
};

export const ABSENSI_HARIAN_SUMBER_LIST = ["otomatis", "koreksi_wali"] as const;
export type AbsensiHarianSumber = (typeof ABSENSI_HARIAN_SUMBER_LIST)[number];

export const IZIN_STATUS_LIST = ["S", "I", "D"] as const;
export type IzinStatus = (typeof IZIN_STATUS_LIST)[number];
export const IZIN_STATUS_LABELS: Record<IzinStatus, string> = {
  S: "Sakit",
  I: "Izin",
  D: "Dispensasi",
};

export const PENGGANTI_STATUS_LIST = ["pengganti", "jam_kosong"] as const;
export type PenggantiStatus = (typeof PENGGANTI_STATUS_LIST)[number];

/** Default batas edit agenda: H+1 pukul 23:59 — bisa diubah Admin lewat halaman Kalender Akademik. */
export const DEFAULT_AGENDA_BATAS_EDIT = { hariSetelah: 1, jam: "23:59" };

/** Default ambang "siswa sering alpa" per bulan — bisa diubah Admin. */
export const DEFAULT_SISWA_ALPA_AMBANG = 3;

// ---------------------------------------------------------------------------
// Tahap 4 — Kiosk Presensi Guru + Buku Tamu
// ---------------------------------------------------------------------------

export const KIOSK_DEVICE_STATUS_LIST = ["aktif", "dicabut"] as const;
export type KioskDeviceStatus = (typeof KIOSK_DEVICE_STATUS_LIST)[number];

export const WAJAH_SUMBER_LIST = ["manual", "otomatis"] as const;
export type WajahSumber = (typeof WAJAH_SUMBER_LIST)[number];

export const PRESENSI_JENIS_LIST = ["datang", "pulang"] as const;
export type PresensiJenis = (typeof PRESENSI_JENIS_LIST)[number];
export const PRESENSI_JENIS_LABELS: Record<PresensiJenis, string> = {
  datang: "Datang",
  pulang: "Pulang",
};

export const PRESENSI_METODE_LIST = ["wajah", "pin"] as const;
export type PresensiMetode = (typeof PRESENSI_METODE_LIST)[number];

export const PRESENSI_STATUS_LIST = ["tepat_waktu", "terlambat", "pulang_cepat"] as const;
export type PresensiStatus = (typeof PRESENSI_STATUS_LIST)[number];

export const PRESENSI_SUMBER_LIST = ["langsung", "antrean_offline"] as const;
export type PresensiSumber = (typeof PRESENSI_SUMBER_LIST)[number];

export const REKAP_PRESENSI_STATUS_LIST = [
  "tepat_waktu",
  "terlambat",
  "pulang_cepat",
  "tidak_presensi_pulang",
  "tidak_hadir",
  "izin",
  "sakit",
  "dinas_luar",
  "cuti",
] as const;
export type RekapPresensiStatus = (typeof REKAP_PRESENSI_STATUS_LIST)[number];
export const REKAP_PRESENSI_STATUS_LABELS: Record<RekapPresensiStatus, string> = {
  tepat_waktu: "Tepat Waktu",
  terlambat: "Terlambat",
  pulang_cepat: "Pulang Cepat",
  tidak_presensi_pulang: "Tidak Presensi Pulang",
  tidak_hadir: "Tidak Hadir",
  izin: "Izin",
  sakit: "Sakit",
  dinas_luar: "Dinas Luar",
  cuti: "Cuti",
};

export const IZIN_GURU_JENIS_LIST = ["izin", "sakit", "dinas_luar", "cuti"] as const;
export type IzinGuruJenis = (typeof IZIN_GURU_JENIS_LIST)[number];
export const IZIN_GURU_JENIS_LABELS: Record<IzinGuruJenis, string> = {
  izin: "Izin",
  sakit: "Sakit",
  dinas_luar: "Dinas Luar",
  cuti: "Cuti",
};

export const IZIN_GURU_STATUS_LIST = ["diajukan", "disetujui", "ditolak"] as const;
export type IzinGuruStatus = (typeof IZIN_GURU_STATUS_LIST)[number];

export const MODE_JAM_MASUK_LIST = ["jam_sekolah", "jadwal_mengajar"] as const;
export type ModeJamMasuk = (typeof MODE_JAM_MASUK_LIST)[number];

export const TAMU_JENIS_LIST = ["individu", "instansi"] as const;
export type TamuJenis = (typeof TAMU_JENIS_LIST)[number];
export const TAMU_JENIS_LABELS: Record<TamuJenis, string> = {
  individu: "Individu",
  instansi: "Instansi",
};

export const TAMU_STATUS_KUNJUNGAN_LIST = ["menunggu", "dilayani", "selesai"] as const;
export type TamuStatusKunjungan = (typeof TAMU_STATUS_KUNJUNGAN_LIST)[number];
export const TAMU_STATUS_KUNJUNGAN_LABELS: Record<TamuStatusKunjungan, string> = {
  menunggu: "Menunggu",
  dilayani: "Dilayani",
  selesai: "Selesai",
};

export const RETENSI_FOTO_PILIHAN = [7, 30, 60] as const;
export const DEFAULT_RETENSI_FOTO_HARI = 7;
/** Default ambang kemiripan wajah — rekomendasi @vladmandic/human: similarity > 0.5 dianggap match. */
export const DEFAULT_AMBANG_KEMIRIPAN_WAJAH = 0.5;
export const MAKS_DESCRIPTOR_OTOMATIS_PER_GURU = 5;
export const DEFAULT_PENGATURAN_PRESENSI = {
  modeJamMasuk: "jam_sekolah" as ModeJamMasuk,
  toleransiTerlambatMenit: 15,
  offsetJadwalMengajarMenit: 10,
  jamKerja: {
    SENIN: { masuk: "07:00", pulang: "15:00" },
    SELASA: { masuk: "07:00", pulang: "15:00" },
    RABU: { masuk: "07:00", pulang: "15:00" },
    KAMIS: { masuk: "07:00", pulang: "15:00" },
    JUMAT: { masuk: "07:00", pulang: "14:00" },
    SABTU: { masuk: "07:00", pulang: "12:00" },
  } as Record<Hari, { masuk: string; pulang: string } | null>,
};

// ---------------------------------------------------------------------------
// Tahap 5 — Pelanggaran & Prestasi
// ---------------------------------------------------------------------------

export const PELANGGARAN_STATUS_LIST = ["tercatat", "dibatalkan"] as const;
export type PelanggaranStatus = (typeof PELANGGARAN_STATUS_LIST)[number];
export const PELANGGARAN_STATUS_LABELS: Record<PelanggaranStatus, string> = {
  tercatat: "Tercatat",
  dibatalkan: "Dibatalkan",
};

export const SANKSI_SISWA_STATUS_LIST = ["belum", "proses", "selesai", "dibatalkan"] as const;
export type SanksiSiswaStatus = (typeof SANKSI_SISWA_STATUS_LIST)[number];
export const SANKSI_SISWA_STATUS_LABELS: Record<SanksiSiswaStatus, string> = {
  belum: "Belum ditindaklanjuti",
  proses: "Dalam proses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan otomatis",
};

export const TINDAK_LANJUT_JENIS_LIST = [
  "pembinaan",
  "panggilan_ortu",
  "home_visit",
  "surat",
  "lainnya",
] as const;
export type TindakLanjutJenis = (typeof TINDAK_LANJUT_JENIS_LIST)[number];
export const TINDAK_LANJUT_JENIS_LABELS: Record<TindakLanjutJenis, string> = {
  pembinaan: "Pembinaan",
  panggilan_ortu: "Panggilan Orang Tua",
  home_visit: "Home Visit",
  surat: "Surat Peringatan",
  lainnya: "Lainnya",
};

/** Seed contoh, bisa diubah Admin/BK lewat Master Pelanggaran. */
export const DEFAULT_PELANGGARAN_JENIS = [
  { kategori: "Ringan", nama: "Terlambat", poin: 5 },
  { kategori: "Ringan", nama: "Tidak berseragam lengkap", poin: 10 },
  { kategori: "Sedang", nama: "Membolos", poin: 25 },
  { kategori: "Berat", nama: "Berkelahi", poin: 50 },
] as const;

/** Seed default ambang sanksi (urut poin) — bisa diubah Admin/BK. */
export const DEFAULT_SANKSI_AMBANG = [
  { poinMinimal: 25, nama: "Teguran lisan" },
  { poinMinimal: 50, nama: "Panggilan orang tua" },
  { poinMinimal: 75, nama: "Surat peringatan" },
  { poinMinimal: 100, nama: "Dikembalikan ke orang tua" },
] as const;

export const PRESTASI_BIDANG_LIST = [
  "akademik",
  "non_akademik",
  "keagamaan",
  "olahraga",
  "seni",
  "lainnya",
] as const;
export type PrestasiBidang = (typeof PRESTASI_BIDANG_LIST)[number];
export const PRESTASI_BIDANG_LABELS: Record<PrestasiBidang, string> = {
  akademik: "Akademik",
  non_akademik: "Non-Akademik",
  keagamaan: "Keagamaan",
  olahraga: "Olahraga",
  seni: "Seni",
  lainnya: "Lainnya",
};

export const PRESTASI_TINGKAT_LIST = [
  "sekolah",
  "kecamatan",
  "kabupaten",
  "provinsi",
  "nasional",
  "internasional",
] as const;
export type PrestasiTingkat = (typeof PRESTASI_TINGKAT_LIST)[number];
export const PRESTASI_TINGKAT_LABELS: Record<PrestasiTingkat, string> = {
  sekolah: "Sekolah",
  kecamatan: "Kecamatan",
  kabupaten: "Kabupaten/Kota",
  provinsi: "Provinsi",
  nasional: "Nasional",
  internasional: "Internasional",
};
/** Urutan tingkat tertinggi → terendah, dipakai urutan tampil raport (getPrestasiRaport). */
export const PRESTASI_TINGKAT_URUTAN: Record<PrestasiTingkat, number> = {
  internasional: 6,
  nasional: 5,
  provinsi: 4,
  kabupaten: 3,
  kecamatan: 2,
  sekolah: 1,
};

export const PRESTASI_JENIS_LIST = ["individu", "beregu"] as const;
export type PrestasiJenis = (typeof PRESTASI_JENIS_LIST)[number];
export const PRESTASI_JENIS_LABELS: Record<PrestasiJenis, string> = {
  individu: "Individu",
  beregu: "Beregu",
};

/** Maksimal prestasi yang ditampilkan di raport (getPrestasiRaport, dipakai Tahap 6). */
export const MAKS_PRESTASI_RAPORT = 3;
