CREATE TABLE `nilai_akhir` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`mapel_id` text NOT NULL,
	`nilai_akhir` integer,
	`predikat` text,
	`tp_capaian_id` text,
	`deskripsi` text,
	`deskripsi_manual` integer DEFAULT false NOT NULL,
	`diisi_oleh` text NOT NULL,
	`final` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nilai_akhir_unique` ON `nilai_akhir` (`period_id`,`siswa_id`,`mapel_id`);--> statement-breakpoint
CREATE INDEX `nilai_akhir_period_rombel_idx` ON `nilai_akhir` (`period_id`,`rombel_id`);--> statement-breakpoint
CREATE INDEX `nilai_akhir_siswa_period_idx` ON `nilai_akhir` (`siswa_id`,`period_id`);--> statement-breakpoint
CREATE TABLE `nilai_lingkup` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`mapel_id` text NOT NULL,
	`tp_id` text NOT NULL,
	`nilai` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nilai_lingkup_unique` ON `nilai_lingkup` (`period_id`,`siswa_id`,`mapel_id`,`tp_id`);--> statement-breakpoint
CREATE INDEX `nilai_lingkup_period_mapel_siswa_idx` ON `nilai_lingkup` (`period_id`,`mapel_id`,`siswa_id`);--> statement-breakpoint
CREATE TABLE `nilai_ujian` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`mapel_id` text NOT NULL,
	`jenis` text NOT NULL,
	`nilai` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "nilai_ujian_jenis_check" CHECK("nilai_ujian"."jenis" IN ('STS','SAS'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nilai_ujian_unique` ON `nilai_ujian` (`period_id`,`siswa_id`,`mapel_id`,`jenis`);--> statement-breakpoint
CREATE INDEX `nilai_ujian_period_mapel_siswa_idx` ON `nilai_ujian` (`period_id`,`mapel_id`,`siswa_id`);--> statement-breakpoint
CREATE TABLE `raport_kunci_rombel` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`terkunci` integer DEFAULT false NOT NULL,
	`dikunci_oleh` text,
	`dikunci_pada` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raport_kunci_rombel_unique` ON `raport_kunci_rombel` (`period_id`,`rombel_id`);--> statement-breakpoint
CREATE TABLE `raport_pengaturan` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`bobot_tp` integer DEFAULT 50 NOT NULL,
	`bobot_sts` integer DEFAULT 25 NOT NULL,
	`bobot_sas` integer DEFAULT 25 NOT NULL,
	`pembulatan_desimal` integer DEFAULT 0 NOT NULL,
	`tempat_raport` text,
	`tanggal_raport` text,
	`fase_per_tingkat` text NOT NULL,
	`tampilkan_peringkat` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raport_pengaturan_period_unique` ON `raport_pengaturan` (`period_id`);--> statement-breakpoint
CREATE TABLE `tujuan_pembelajaran` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`mapel_id` text NOT NULL,
	`tingkat` text NOT NULL,
	`kode` text NOT NULL,
	`deskripsi` text NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "tujuan_pembelajaran_tingkat_check" CHECK("tujuan_pembelajaran"."tingkat" IN ('VII','VIII','IX'))
);
--> statement-breakpoint
CREATE INDEX `tujuan_pembelajaran_period_mapel_tingkat_idx` ON `tujuan_pembelajaran` (`period_id`,`mapel_id`,`tingkat`);