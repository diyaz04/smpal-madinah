CREATE TABLE `prestasi` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`rombel_id` text,
	`nama_kegiatan` text NOT NULL,
	`bidang` text NOT NULL,
	`tingkat` text NOT NULL,
	`capaian` text NOT NULL,
	`jenis` text NOT NULL,
	`penyelenggara` text,
	`tanggal` text NOT NULL,
	`keterangan` text,
	`sertifikat_file_id` text,
	`tampil_di_raport` integer DEFAULT true NOT NULL,
	`judul_raport` text NOT NULL,
	`keterangan_raport` text NOT NULL,
	`dicatat_oleh` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "prestasi_bidang_check" CHECK("prestasi"."bidang" IN ('akademik','non_akademik','keagamaan','olahraga','seni','lainnya')),
	CONSTRAINT "prestasi_tingkat_check" CHECK("prestasi"."tingkat" IN ('sekolah','kecamatan','kabupaten','provinsi','nasional','internasional')),
	CONSTRAINT "prestasi_jenis_check" CHECK("prestasi"."jenis" IN ('individu','beregu'))
);
--> statement-breakpoint
CREATE INDEX `prestasi_siswa_tanggal_idx` ON `prestasi` (`siswa_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `prestasi_period_idx` ON `prestasi` (`period_id`);