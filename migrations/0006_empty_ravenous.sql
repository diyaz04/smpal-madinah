CREATE TABLE `pelanggaran` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`tahun_ajaran` text NOT NULL,
	`siswa_id` text NOT NULL,
	`rombel_id` text,
	`jenis_id` text NOT NULL,
	`poin` integer NOT NULL,
	`tanggal` text NOT NULL,
	`waktu` text NOT NULL,
	`lokasi` text,
	`keterangan` text,
	`foto_file_id` text,
	`pelapor_user_id` text NOT NULL,
	`status` text DEFAULT 'tercatat' NOT NULL,
	`alasan_batal` text,
	`dibatalkan_oleh` text,
	`dibatalkan_pada` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "pelanggaran_status_check" CHECK("pelanggaran"."status" IN ('tercatat','dibatalkan'))
);
--> statement-breakpoint
CREATE INDEX `pelanggaran_siswa_tanggal_idx` ON `pelanggaran` (`siswa_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `pelanggaran_period_tanggal_idx` ON `pelanggaran` (`period_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `pelanggaran_rombel_tanggal_idx` ON `pelanggaran` (`rombel_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `pelanggaran_pelapor_idx` ON `pelanggaran` (`pelapor_user_id`);--> statement-breakpoint
CREATE TABLE `pelanggaran_jenis` (
	`id` text PRIMARY KEY NOT NULL,
	`kategori_id` text NOT NULL,
	`nama` text NOT NULL,
	`poin` integer NOT NULL,
	`deskripsi` text,
	`aktif` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `pelanggaran_jenis_kategori_idx` ON `pelanggaran_jenis` (`kategori_id`);--> statement-breakpoint
CREATE TABLE `pelanggaran_kategori` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`warna` text NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `pelanggaran_kategori_urutan_idx` ON `pelanggaran_kategori` (`urutan`);--> statement-breakpoint
CREATE TABLE `rekap_poin_siswa` (
	`id` text PRIMARY KEY NOT NULL,
	`siswa_id` text NOT NULL,
	`tahun_ajaran` text NOT NULL,
	`total_poin` integer DEFAULT 0 NOT NULL,
	`jumlah_pelanggaran` integer DEFAULT 0 NOT NULL,
	`terakhir_pada` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rekap_poin_siswa_siswa_tahun_unique` ON `rekap_poin_siswa` (`siswa_id`,`tahun_ajaran`);--> statement-breakpoint
CREATE INDEX `rekap_poin_siswa_tahun_total_idx` ON `rekap_poin_siswa` (`tahun_ajaran`,`total_poin`);--> statement-breakpoint
CREATE TABLE `sanksi_ambang` (
	`id` text PRIMARY KEY NOT NULL,
	`poin_minimal` integer NOT NULL,
	`nama` text NOT NULL,
	`deskripsi` text,
	`urutan` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sanksi_ambang_poin_minimal_unique` ON `sanksi_ambang` (`poin_minimal`);--> statement-breakpoint
CREATE TABLE `sanksi_siswa` (
	`id` text PRIMARY KEY NOT NULL,
	`siswa_id` text NOT NULL,
	`tahun_ajaran` text NOT NULL,
	`ambang_id` text NOT NULL,
	`tercapai_pada` text NOT NULL,
	`status` text DEFAULT 'belum' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "sanksi_siswa_status_check" CHECK("sanksi_siswa"."status" IN ('belum','proses','selesai'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sanksi_siswa_siswa_tahun_ambang_unique` ON `sanksi_siswa` (`siswa_id`,`tahun_ajaran`,`ambang_id`);--> statement-breakpoint
CREATE INDEX `sanksi_siswa_siswa_idx` ON `sanksi_siswa` (`siswa_id`);--> statement-breakpoint
CREATE TABLE `tindak_lanjut` (
	`id` text PRIMARY KEY NOT NULL,
	`sanksi_siswa_id` text,
	`pelanggaran_id` text,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL,
	`hasil` text,
	`petugas_user_id` text NOT NULL,
	`lampiran_file_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "tindak_lanjut_jenis_check" CHECK("tindak_lanjut"."jenis" IN ('pembinaan','panggilan_ortu','home_visit','surat','lainnya'))
);
--> statement-breakpoint
CREATE INDEX `tindak_lanjut_sanksi_siswa_idx` ON `tindak_lanjut` (`sanksi_siswa_id`);--> statement-breakpoint
CREATE INDEX `tindak_lanjut_pelanggaran_idx` ON `tindak_lanjut` (`pelanggaran_id`);