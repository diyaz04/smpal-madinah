CREATE TABLE `absensi` (
	`id` text PRIMARY KEY NOT NULL,
	`agenda_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`status` text NOT NULL,
	`keterangan` text,
	CONSTRAINT "absensi_status_check" CHECK("absensi"."status" IN ('S','I','A','T','D'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `absensi_agenda_siswa_unique` ON `absensi` (`agenda_id`,`siswa_id`);--> statement-breakpoint
CREATE INDEX `absensi_siswa_id_idx` ON `absensi` (`siswa_id`);--> statement-breakpoint
CREATE TABLE `absensi_harian` (
	`id` text PRIMARY KEY NOT NULL,
	`siswa_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`period_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`status` text NOT NULL,
	`sumber` text DEFAULT 'otomatis' NOT NULL,
	`keterangan` text,
	`diubah_oleh` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "absensi_harian_status_check" CHECK("absensi_harian"."status" IN ('S','I','A')),
	CONSTRAINT "absensi_harian_sumber_check" CHECK("absensi_harian"."sumber" IN ('otomatis','koreksi_wali'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `absensi_harian_siswa_tanggal_unique` ON `absensi_harian` (`siswa_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `absensi_harian_rombel_tanggal_idx` ON `absensi_harian` (`rombel_id`,`tanggal`);--> statement-breakpoint
CREATE TABLE `agenda` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`rombel_id` text NOT NULL,
	`mapel_id` text NOT NULL,
	`guru_id` text NOT NULL,
	`guru_jadwal_id` text NOT NULL,
	`jadwal_versi_id` text NOT NULL,
	`hari` text NOT NULL,
	`jam_ke_mulai` integer,
	`jam_ke_selesai` integer,
	`slot_mulai` text NOT NULL,
	`slot_selesai` text NOT NULL,
	`jumlah_jp` integer NOT NULL,
	`materi` text NOT NULL,
	`kegiatan` text,
	`catatan` text,
	`status` text DEFAULT 'terisi' NOT NULL,
	`is_pengganti` integer DEFAULT false NOT NULL,
	`diisi_terlambat` integer DEFAULT false NOT NULL,
	`jumlah_siswa` integer DEFAULT 0 NOT NULL,
	`diisi_pada` text NOT NULL,
	`diubah_pada` text NOT NULL,
	CONSTRAINT "agenda_status_check" CHECK("agenda"."status" IN ('terisi','jam_kosong')),
	CONSTRAINT "agenda_hari_check" CHECK("agenda"."hari" IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agenda_rombel_tanggal_slot_unique` ON `agenda` (`rombel_id`,`tanggal`,`slot_mulai`);--> statement-breakpoint
CREATE INDEX `agenda_period_rombel_tanggal_idx` ON `agenda` (`period_id`,`rombel_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `agenda_guru_tanggal_idx` ON `agenda` (`guru_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `agenda_rombel_mapel_tanggal_idx` ON `agenda` (`rombel_id`,`mapel_id`,`tanggal`);--> statement-breakpoint
CREATE TABLE `izin_harian_siswa` (
	`id` text PRIMARY KEY NOT NULL,
	`siswa_id` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`status` text NOT NULL,
	`keterangan` text,
	`lampiran_file_id` text,
	`dibuat_oleh` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "izin_harian_siswa_status_check" CHECK("izin_harian_siswa"."status" IN ('S','I','D'))
);
--> statement-breakpoint
CREATE INDEX `izin_harian_siswa_siswa_tanggal_idx` ON `izin_harian_siswa` (`siswa_id`,`tanggal_mulai`);--> statement-breakpoint
CREATE INDEX `izin_harian_siswa_tanggal_mulai_idx` ON `izin_harian_siswa` (`tanggal_mulai`);--> statement-breakpoint
CREATE TABLE `jadwal_pengganti` (
	`id` text PRIMARY KEY NOT NULL,
	`jadwal_slot_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`guru_asli_id` text NOT NULL,
	`guru_pengganti_id` text,
	`alasan` text,
	`status` text NOT NULL,
	`dibuat_oleh` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "jadwal_pengganti_status_check" CHECK("jadwal_pengganti"."status" IN ('pengganti','jam_kosong'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jadwal_pengganti_slot_rombel_tanggal_unique` ON `jadwal_pengganti` (`jadwal_slot_id`,`rombel_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `jadwal_pengganti_tanggal_idx` ON `jadwal_pengganti` (`tanggal`);--> statement-breakpoint
CREATE TABLE `kalender_entri` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`nama` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`jenis` text NOT NULL,
	`kbm_ditiadakan` integer DEFAULT true NOT NULL,
	`cakupan` text DEFAULT 'SEMUA' NOT NULL,
	`tingkat_berlaku` text DEFAULT '[]' NOT NULL,
	`keterangan` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "kalender_entri_jenis_check" CHECK("kalender_entri"."jenis" IN ('LIBUR_NASIONAL','LIBUR_SEKOLAH','UJIAN','KEGIATAN_SEKOLAH','LAINNYA')),
	CONSTRAINT "kalender_entri_cakupan_check" CHECK("kalender_entri"."cakupan" IN ('SEMUA','TINGKAT'))
);
--> statement-breakpoint
CREATE INDEX `kalender_entri_period_tanggal_idx` ON `kalender_entri` (`period_id`,`tanggal_mulai`,`tanggal_selesai`);--> statement-breakpoint
CREATE TABLE `rekap_harian_rombel` (
	`id` text PRIMARY KEY NOT NULL,
	`rombel_id` text NOT NULL,
	`period_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`jumlah_siswa` integer DEFAULT 0 NOT NULL,
	`jumlah_s` integer DEFAULT 0 NOT NULL,
	`jumlah_i` integer DEFAULT 0 NOT NULL,
	`jumlah_a` integer DEFAULT 0 NOT NULL,
	`jp_terjadwal` integer DEFAULT 0 NOT NULL,
	`jp_terisi` integer DEFAULT 0 NOT NULL,
	`jp_kosong` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rekap_harian_rombel_rombel_tanggal_unique` ON `rekap_harian_rombel` (`rombel_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `rekap_harian_rombel_tanggal_idx` ON `rekap_harian_rombel` (`tanggal`);--> statement-breakpoint
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
	CONSTRAINT "files_prefix_check" CHECK("__new_files"."prefix" IN ('logo','kop','profil','siswa','guru','selfie','tamu','surat','izin-siswa'))
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "r2_key", "prefix", "original_name", "mime_type", "size_bytes", "uploaded_by", "created_at", "deleted_at") SELECT "id", "r2_key", "prefix", "original_name", "mime_type", "size_bytes", "uploaded_by", "created_at", "deleted_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `files_r2_key_unique` ON `files` (`r2_key`);--> statement-breakpoint
CREATE INDEX `files_prefix_idx` ON `files` (`prefix`);