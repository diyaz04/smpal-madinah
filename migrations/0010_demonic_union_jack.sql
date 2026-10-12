CREATE TABLE `leger_peringkat` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`rombel_id` text NOT NULL,
	`siswa_id` text NOT NULL,
	`jumlah_nilai` integer NOT NULL,
	`rata_rata` real,
	`peringkat` integer NOT NULL,
	`dihitung_pada` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leger_peringkat_period_siswa_unique` ON `leger_peringkat` (`period_id`,`siswa_id`);--> statement-breakpoint
CREATE INDEX `leger_peringkat_period_rombel_idx` ON `leger_peringkat` (`period_id`,`rombel_id`);