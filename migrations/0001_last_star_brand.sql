CREATE TABLE `guru` (
	`id` text PRIMARY KEY NOT NULL,
	`nip` text,
	`nuptk` text,
	`nama_lengkap` text NOT NULL,
	`nama_tanpa_gelar` text NOT NULL,
	`jenis_kelamin` text NOT NULL,
	`tempat_lahir` text,
	`tanggal_lahir` text NOT NULL,
	`no_hp` text,
	`email` text,
	`alamat` text,
	`foto_file_id` text,
	`status_kepegawaian` text NOT NULL,
	`tanggal_mulai_tugas` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "guru_jenis_kelamin_check" CHECK("guru"."jenis_kelamin" IN ('L','P')),
	CONSTRAINT "guru_status_kepegawaian_check" CHECK("guru"."status_kepegawaian" IN ('PNS','PPPK','GTY','GTT','HONORER'))
);
--> statement-breakpoint
CREATE INDEX `guru_nip_idx` ON `guru` (`nip`);--> statement-breakpoint
CREATE INDEX `guru_is_active_idx` ON `guru` (`is_active`);--> statement-breakpoint
CREATE INDEX `guru_nama_lengkap_idx` ON `guru` (`nama_lengkap`);--> statement-breakpoint
CREATE TABLE `guru_alias` (
	`id` text PRIMARY KEY NOT NULL,
	`guru_id` text NOT NULL,
	`alias_nama` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guru_alias_guru_id_idx` ON `guru_alias` (`guru_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guru_alias_unique` ON `guru_alias` (`guru_id`,`alias_nama`);--> statement-breakpoint
CREATE TABLE `guru_tugas_tambahan` (
	`id` text PRIMARY KEY NOT NULL,
	`guru_id` text NOT NULL,
	`period_id` text NOT NULL,
	`nama_tugas` text NOT NULL,
	`keterangan` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guru_tugas_tambahan_guru_id_idx` ON `guru_tugas_tambahan` (`guru_id`);--> statement-breakpoint
CREATE INDEX `guru_tugas_tambahan_period_id_idx` ON `guru_tugas_tambahan` (`period_id`);--> statement-breakpoint
CREATE TABLE `jadwal_isi` (
	`id` text PRIMARY KEY NOT NULL,
	`jadwal_slot_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`mapel_id` text,
	`keterangan` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jadwal_isi_slot_rombel_unique` ON `jadwal_isi` (`jadwal_slot_id`,`rombel_id`);--> statement-breakpoint
CREATE INDEX `jadwal_isi_rombel_id_idx` ON `jadwal_isi` (`rombel_id`);--> statement-breakpoint
CREATE TABLE `jadwal_isi_guru` (
	`id` text PRIMARY KEY NOT NULL,
	`jadwal_isi_id` text NOT NULL,
	`guru_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jadwal_isi_guru_unique` ON `jadwal_isi_guru` (`jadwal_isi_id`,`guru_id`);--> statement-breakpoint
CREATE INDEX `jadwal_isi_guru_guru_id_idx` ON `jadwal_isi_guru` (`guru_id`);--> statement-breakpoint
CREATE TABLE `jadwal_piket` (
	`id` text PRIMARY KEY NOT NULL,
	`jadwal_versi_id` text NOT NULL,
	`hari` text NOT NULL,
	`guru_id` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "jadwal_piket_hari_check" CHECK("jadwal_piket"."hari" IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jadwal_piket_unique` ON `jadwal_piket` (`jadwal_versi_id`,`hari`,`guru_id`);--> statement-breakpoint
CREATE INDEX `jadwal_piket_versi_hari_idx` ON `jadwal_piket` (`jadwal_versi_id`,`hari`);--> statement-breakpoint
CREATE TABLE `jadwal_slot` (
	`id` text PRIMARY KEY NOT NULL,
	`jadwal_versi_id` text NOT NULL,
	`hari` text NOT NULL,
	`urutan` integer NOT NULL,
	`jam_mulai` text NOT NULL,
	`jam_selesai` text NOT NULL,
	`jam_ke` integer,
	`jenis_slot` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "jadwal_slot_hari_check" CHECK("jadwal_slot"."hari" IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU')),
	CONSTRAINT "jadwal_slot_jenis_check" CHECK("jadwal_slot"."jenis_slot" IN ('kbm','istirahat','pembiasaan','upacara','kegiatan'))
);
--> statement-breakpoint
CREATE INDEX `jadwal_slot_versi_hari_idx` ON `jadwal_slot` (`jadwal_versi_id`,`hari`);--> statement-breakpoint
CREATE TABLE `jadwal_versi` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`nama` text NOT NULL,
	`status` text DEFAULT 'draf' NOT NULL,
	`tanggal_mulai_berlaku` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "jadwal_versi_status_check" CHECK("jadwal_versi"."status" IN ('draf','aktif','arsip'))
);
--> statement-breakpoint
CREATE INDEX `jadwal_versi_period_id_idx` ON `jadwal_versi` (`period_id`);--> statement-breakpoint
CREATE INDEX `jadwal_versi_status_idx` ON `jadwal_versi` (`status`);--> statement-breakpoint
CREATE TABLE `mapel` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`kode_jadwal` text NOT NULL,
	`alias_kode` text DEFAULT '[]' NOT NULL,
	`jenis` text NOT NULL,
	`induk_mapel_id` text,
	`tampil_raport` integer DEFAULT true NOT NULL,
	`urutan_raport` integer DEFAULT 0 NOT NULL,
	`tingkat_berlaku` text DEFAULT '[]' NOT NULL,
	`predikat_config` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "mapel_jenis_check" CHECK("mapel"."jenis" IN ('akademik','muatan_lokal','kegiatan'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mapel_kode_jadwal_unique` ON `mapel` (`kode_jadwal`);--> statement-breakpoint
CREATE INDEX `mapel_induk_mapel_id_idx` ON `mapel` (`induk_mapel_id`);--> statement-breakpoint
CREATE TABLE `pembagian_tugas` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`guru_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`mapel_id` text NOT NULL,
	`is_team_teaching` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pembagian_tugas_unique` ON `pembagian_tugas` (`period_id`,`rombel_id`,`mapel_id`,`guru_id`);--> statement-breakpoint
CREATE INDEX `pembagian_tugas_period_guru_idx` ON `pembagian_tugas` (`period_id`,`guru_id`);--> statement-breakpoint
CREATE INDEX `pembagian_tugas_period_rombel_idx` ON `pembagian_tugas` (`period_id`,`rombel_id`);--> statement-breakpoint
CREATE TABLE `rombel` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`tingkat` text NOT NULL,
	`nama` text NOT NULL,
	`wali_guru_id` text,
	`urutan` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "rombel_tingkat_check" CHECK("rombel"."tingkat" IN ('VII','VIII','IX'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rombel_period_nama_unique` ON `rombel` (`period_id`,`nama`);--> statement-breakpoint
CREATE INDEX `rombel_period_id_idx` ON `rombel` (`period_id`);--> statement-breakpoint
CREATE INDEX `rombel_wali_guru_id_idx` ON `rombel` (`wali_guru_id`);--> statement-breakpoint
CREATE TABLE `siswa` (
	`id` text PRIMARY KEY NOT NULL,
	`nis` text NOT NULL,
	`nisn` text NOT NULL,
	`nama_lengkap` text NOT NULL,
	`nama_panggilan` text,
	`jenis_kelamin` text NOT NULL,
	`tempat_lahir` text,
	`tanggal_lahir` text,
	`agama` text,
	`alamat` text,
	`foto_file_id` text,
	`nama_ayah` text,
	`nama_ibu` text,
	`nama_wali` text,
	`no_hp_ortu` text,
	`pekerjaan_ortu` text,
	`status` text DEFAULT 'AKTIF' NOT NULL,
	`status_tanggal` text,
	`status_keterangan` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "siswa_jenis_kelamin_check" CHECK("siswa"."jenis_kelamin" IN ('L','P')),
	CONSTRAINT "siswa_status_check" CHECK("siswa"."status" IN ('AKTIF','PINDAH','LULUS','KELUAR'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `siswa_nis_unique` ON `siswa` (`nis`);--> statement-breakpoint
CREATE UNIQUE INDEX `siswa_nisn_unique` ON `siswa` (`nisn`);--> statement-breakpoint
CREATE INDEX `siswa_status_idx` ON `siswa` (`status`);--> statement-breakpoint
CREATE INDEX `siswa_nama_lengkap_idx` ON `siswa` (`nama_lengkap`);--> statement-breakpoint
CREATE TABLE `siswa_kelas` (
	`id` text PRIMARY KEY NOT NULL,
	`siswa_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`period_id` text NOT NULL,
	`nomor_absen` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `siswa_kelas_siswa_period_unique` ON `siswa_kelas` (`siswa_id`,`period_id`);--> statement-breakpoint
CREATE INDEX `siswa_kelas_rombel_id_idx` ON `siswa_kelas` (`rombel_id`);--> statement-breakpoint
CREATE INDEX `siswa_kelas_period_id_idx` ON `siswa_kelas` (`period_id`);--> statement-breakpoint
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
	CONSTRAINT "files_prefix_check" CHECK("__new_files"."prefix" IN ('logo','kop','profil','siswa','guru','selfie','tamu','surat'))
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "r2_key", "prefix", "original_name", "mime_type", "size_bytes", "uploaded_by", "created_at", "deleted_at") SELECT "id", "r2_key", "prefix", "original_name", "mime_type", "size_bytes", "uploaded_by", "created_at", "deleted_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `files_r2_key_unique` ON `files` (`r2_key`);--> statement-breakpoint
CREATE INDEX `files_prefix_idx` ON `files` (`prefix`);