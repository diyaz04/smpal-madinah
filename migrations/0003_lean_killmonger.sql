PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agenda` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`rombel_id` text NOT NULL,
	`mapel_id` text,
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
	CONSTRAINT "agenda_status_check" CHECK("__new_agenda"."status" IN ('terisi','jam_kosong')),
	CONSTRAINT "agenda_hari_check" CHECK("__new_agenda"."hari" IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'))
);
--> statement-breakpoint
INSERT INTO `__new_agenda`("id", "period_id", "tanggal", "rombel_id", "mapel_id", "guru_id", "guru_jadwal_id", "jadwal_versi_id", "hari", "jam_ke_mulai", "jam_ke_selesai", "slot_mulai", "slot_selesai", "jumlah_jp", "materi", "kegiatan", "catatan", "status", "is_pengganti", "diisi_terlambat", "jumlah_siswa", "diisi_pada", "diubah_pada") SELECT "id", "period_id", "tanggal", "rombel_id", "mapel_id", "guru_id", "guru_jadwal_id", "jadwal_versi_id", "hari", "jam_ke_mulai", "jam_ke_selesai", "slot_mulai", "slot_selesai", "jumlah_jp", "materi", "kegiatan", "catatan", "status", "is_pengganti", "diisi_terlambat", "jumlah_siswa", "diisi_pada", "diubah_pada" FROM `agenda`;--> statement-breakpoint
DROP TABLE `agenda`;--> statement-breakpoint
ALTER TABLE `__new_agenda` RENAME TO `agenda`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `agenda_rombel_tanggal_slot_unique` ON `agenda` (`rombel_id`,`tanggal`,`slot_mulai`);--> statement-breakpoint
CREATE INDEX `agenda_period_rombel_tanggal_idx` ON `agenda` (`period_id`,`rombel_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `agenda_guru_tanggal_idx` ON `agenda` (`guru_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `agenda_rombel_mapel_tanggal_idx` ON `agenda` (`rombel_id`,`mapel_id`,`tanggal`);