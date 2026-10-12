CREATE TABLE `notifikasi` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`judul` text NOT NULL,
	`isi` text NOT NULL,
	`tautan` text,
	`modul` text,
	`dibaca_pada` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifikasi_user_created_idx` ON `notifikasi` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifikasi_user_dibaca_idx` ON `notifikasi` (`user_id`,`dibaca_pada`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sanksi_siswa` (
	`id` text PRIMARY KEY NOT NULL,
	`siswa_id` text NOT NULL,
	`tahun_ajaran` text NOT NULL,
	`ambang_id` text NOT NULL,
	`tercapai_pada` text NOT NULL,
	`status` text DEFAULT 'belum' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "sanksi_siswa_status_check" CHECK("__new_sanksi_siswa"."status" IN ('belum','proses','selesai','dibatalkan'))
);
--> statement-breakpoint
INSERT INTO `__new_sanksi_siswa`("id", "siswa_id", "tahun_ajaran", "ambang_id", "tercapai_pada", "status", "created_at", "updated_at") SELECT "id", "siswa_id", "tahun_ajaran", "ambang_id", "tercapai_pada", "status", "created_at", "updated_at" FROM `sanksi_siswa`;--> statement-breakpoint
DROP TABLE `sanksi_siswa`;--> statement-breakpoint
ALTER TABLE `__new_sanksi_siswa` RENAME TO `sanksi_siswa`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `sanksi_siswa_siswa_tahun_ambang_unique` ON `sanksi_siswa` (`siswa_id`,`tahun_ajaran`,`ambang_id`);--> statement-breakpoint
CREATE INDEX `sanksi_siswa_siswa_idx` ON `sanksi_siswa` (`siswa_id`);