CREATE TABLE `catatan_template` (
	`id` text PRIMARY KEY NOT NULL,
	`teks` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `ekskul` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`pembina_guru_id` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `ekskul_pembina_idx` ON `ekskul` (`pembina_guru_id`);--> statement-breakpoint
CREATE TABLE `ekskul_nilai` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`ekskul_id` text NOT NULL,
	`predikat` text NOT NULL,
	`keterangan` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "ekskul_nilai_predikat_check" CHECK("ekskul_nilai"."predikat" IN ('sangat_baik','baik','cukup','kurang'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ekskul_nilai_unique` ON `ekskul_nilai` (`period_id`,`siswa_id`,`ekskul_id`);--> statement-breakpoint
CREATE INDEX `ekskul_nilai_period_ekskul_idx` ON `ekskul_nilai` (`period_id`,`ekskul_id`);--> statement-breakpoint
CREATE TABLE `raport_siswa` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`catatan_pendidik` text,
	`keterangan_kenaikan` text,
	`kenaikan_ke_kelas` text,
	`override_sakit` integer,
	`override_izin` integer,
	`override_alpa` integer,
	`alasan_override_kehadiran` text,
	`status` text DEFAULT 'draf' NOT NULL,
	`kode_verifikasi` text,
	`dikunci_pada` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "raport_siswa_status_check" CHECK("raport_siswa"."status" IN ('draf','final')),
	CONSTRAINT "raport_siswa_keterangan_kenaikan_check" CHECK("raport_siswa"."keterangan_kenaikan" IS NULL OR "raport_siswa"."keterangan_kenaikan" IN ('naik','tidak_naik','lulus'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raport_siswa_period_siswa_unique` ON `raport_siswa` (`period_id`,`siswa_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `raport_siswa_kode_verifikasi_unique` ON `raport_siswa` (`kode_verifikasi`);--> statement-breakpoint
CREATE INDEX `raport_siswa_period_rombel_idx` ON `raport_siswa` (`period_id`,`rombel_id`);