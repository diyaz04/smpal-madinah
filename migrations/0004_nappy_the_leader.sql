CREATE TABLE `izin_guru` (
	`id` text PRIMARY KEY NOT NULL,
	`guru_id` text NOT NULL,
	`jenis` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`parsial` integer DEFAULT false NOT NULL,
	`jam_dari` text,
	`jam_sampai` text,
	`keterangan` text,
	`lampiran_file_id` text,
	`status` text DEFAULT 'disetujui' NOT NULL,
	`dibuat_oleh` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "izin_guru_jenis_check" CHECK("izin_guru"."jenis" IN ('izin','sakit','dinas_luar','cuti')),
	CONSTRAINT "izin_guru_status_check" CHECK("izin_guru"."status" IN ('diajukan','disetujui','ditolak'))
);
--> statement-breakpoint
CREATE INDEX `izin_guru_guru_tanggal_idx` ON `izin_guru` (`guru_id`,`tanggal_mulai`);--> statement-breakpoint
CREATE INDEX `izin_guru_tanggal_mulai_idx` ON `izin_guru` (`tanggal_mulai`);--> statement-breakpoint
CREATE TABLE `kiosk_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`lokasi` text,
	`session_id` text NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL,
	`paired_at` text NOT NULL,
	`last_active_at` text,
	`created_by` text NOT NULL,
	CONSTRAINT "kiosk_devices_status_check" CHECK("kiosk_devices"."status" IN ('aktif','dicabut'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kiosk_devices_session_id_unique` ON `kiosk_devices` (`session_id`);--> statement-breakpoint
CREATE INDEX `kiosk_devices_status_idx` ON `kiosk_devices` (`status`);--> statement-breakpoint
CREATE TABLE `kiosk_pairing_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kiosk_pairing_codes_code_unique` ON `kiosk_pairing_codes` (`code`);--> statement-breakpoint
CREATE TABLE `presensi_guru` (
	`id` text PRIMARY KEY NOT NULL,
	`guru_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL,
	`waktu` text NOT NULL,
	`metode` text NOT NULL,
	`skor_kemiripan` integer,
	`liveness_lolos` integer,
	`kiosk_device_id` text,
	`foto_file_id` text,
	`status` text NOT NULL,
	`sumber` text DEFAULT 'langsung' NOT NULL,
	`waktu_perangkat` text,
	`catatan` text,
	`created_at` text NOT NULL,
	CONSTRAINT "presensi_guru_jenis_check" CHECK("presensi_guru"."jenis" IN ('datang','pulang')),
	CONSTRAINT "presensi_guru_metode_check" CHECK("presensi_guru"."metode" IN ('wajah','pin')),
	CONSTRAINT "presensi_guru_status_check" CHECK("presensi_guru"."status" IN ('tepat_waktu','terlambat','pulang_cepat')),
	CONSTRAINT "presensi_guru_sumber_check" CHECK("presensi_guru"."sumber" IN ('langsung','antrean_offline'))
);
--> statement-breakpoint
CREATE INDEX `presensi_guru_guru_tanggal_idx` ON `presensi_guru` (`guru_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `presensi_guru_tanggal_idx` ON `presensi_guru` (`tanggal`);--> statement-breakpoint
CREATE TABLE `rekap_presensi_guru_harian` (
	`id` text PRIMARY KEY NOT NULL,
	`guru_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`jam_datang` text,
	`jam_pulang` text,
	`status` text NOT NULL,
	`menit_terlambat` integer DEFAULT 0 NOT NULL,
	`menit_pulang_cepat` integer DEFAULT 0 NOT NULL,
	`metode_datang` text,
	`metode_pulang` text,
	`updated_at` text NOT NULL,
	CONSTRAINT "rekap_presensi_guru_harian_status_check" CHECK("rekap_presensi_guru_harian"."status" IN ('tepat_waktu','terlambat','pulang_cepat','tidak_presensi_pulang','tidak_hadir','izin','sakit','dinas_luar','cuti'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rekap_presensi_guru_harian_guru_tanggal_unique` ON `rekap_presensi_guru_harian` (`guru_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `rekap_presensi_guru_harian_tanggal_idx` ON `rekap_presensi_guru_harian` (`tanggal`);--> statement-breakpoint
CREATE TABLE `tamu` (
	`id` text PRIMARY KEY NOT NULL,
	`jenis` text NOT NULL,
	`nama_instansi` text,
	`nama` text NOT NULL,
	`maksud_tujuan` text NOT NULL,
	`no_hp` text,
	`ingin_bertemu_guru_id` text,
	`foto_file_id` text,
	`status_kunjungan` text DEFAULT 'menunggu' NOT NULL,
	`kiosk_device_id` text,
	`tanggal` text NOT NULL,
	`waktu` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "tamu_jenis_check" CHECK("tamu"."jenis" IN ('individu','instansi')),
	CONSTRAINT "tamu_status_kunjungan_check" CHECK("tamu"."status_kunjungan" IN ('menunggu','dilayani','selesai'))
);
--> statement-breakpoint
CREATE INDEX `tamu_tanggal_idx` ON `tamu` (`tanggal`);--> statement-breakpoint
CREATE TABLE `wajah_guru_descriptor` (
	`id` text PRIMARY KEY NOT NULL,
	`guru_id` text NOT NULL,
	`descriptor` text NOT NULL,
	`sumber` text NOT NULL,
	`foto_file_id` text,
	`created_at` text NOT NULL,
	CONSTRAINT "wajah_guru_descriptor_sumber_check" CHECK("wajah_guru_descriptor"."sumber" IN ('manual','otomatis'))
);
--> statement-breakpoint
CREATE INDEX `wajah_guru_descriptor_guru_idx` ON `wajah_guru_descriptor` (`guru_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`prefix` text NOT NULL,
	`original_name` text,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "files_prefix_check" CHECK("__new_files"."prefix" IN ('logo','kop','profil','siswa','guru','selfie','tamu','surat','izin-siswa','wajah','izin-guru'))
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "r2_key", "prefix", "original_name", "mime_type", "size_bytes", "uploaded_by", "created_at", "deleted_at") SELECT "id", "r2_key", "prefix", "original_name", "mime_type", "size_bytes", "uploaded_by", "created_at", "deleted_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `files_r2_key_unique` ON `files` (`r2_key`);--> statement-breakpoint
CREATE INDEX `files_prefix_idx` ON `files` (`prefix`);--> statement-breakpoint
ALTER TABLE `guru` ADD `pin_hash` text;--> statement-breakpoint
ALTER TABLE `guru` ADD `pin_salt` text;--> statement-breakpoint
ALTER TABLE `guru` ADD `pin_iterations` integer;--> statement-breakpoint
ALTER TABLE `guru` ADD `pin_is_default` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `guru` ADD `pin_failed_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `guru` ADD `pin_locked_until` text;--> statement-breakpoint
ALTER TABLE `guru` ADD `persetujuan_biometrik` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `guru` ADD `persetujuan_versi` integer;--> statement-breakpoint
ALTER TABLE `guru` ADD `persetujuan_tanggal` text;--> statement-breakpoint
ALTER TABLE `guru` ADD `persetujuan_file_id` text;--> statement-breakpoint
ALTER TABLE `guru` ADD `hari_wajib_override` text;