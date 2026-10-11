CREATE TABLE `academic_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`year_label` text NOT NULL,
	`semester` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "academic_periods_semester_check" CHECK("academic_periods"."semester" IN ('GANJIL','GENAP'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_periods_year_semester_unique` ON `academic_periods` (`year_label`,`semester`);--> statement-breakpoint
CREATE INDEX `academic_periods_is_active_idx` ON `academic_periods` (`is_active`);--> statement-breakpoint
CREATE TABLE `activity_log_archives` (
	`id` text PRIMARY KEY NOT NULL,
	`year_month` text NOT NULL,
	`r2_key` text NOT NULL,
	`row_count` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_log_archives_year_month_unique` ON `activity_log_archives` (`year_month`);--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`user_id` text,
	`username_snapshot` text,
	`module_key` text NOT NULL,
	`action` text NOT NULL,
	`record_id` text,
	`changes` text,
	`ip` text,
	`user_agent` text,
	CONSTRAINT "activity_logs_action_check" CHECK("activity_logs"."action" IN ('login_success','login_failed','logout','lockout','create','update','delete','export','approve','password_change','password_reset'))
);
--> statement-breakpoint
CREATE INDEX `activity_logs_created_at_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_logs_user_id_idx` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_module_created_idx` ON `activity_logs` (`module_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`prefix` text NOT NULL,
	`original_name` text,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "files_prefix_check" CHECK("files"."prefix" IN ('logo','kop','profil','selfie','tamu','surat'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_r2_key_unique` ON `files` (`r2_key`);--> statement-breakpoint
CREATE INDEX `files_prefix_idx` ON `files` (`prefix`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`module_key` text NOT NULL,
	`action` text NOT NULL,
	`scope` text DEFAULT 'semua' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "role_permissions_action_check" CHECK("role_permissions"."action" IN ('lihat','tambah','ubah','hapus','export','approve')),
	CONSTRAINT "role_permissions_scope_check" CHECK("role_permissions"."scope" IN ('semua','milik_sendiri'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_permissions_unique` ON `role_permissions` (`role_id`,`module_key`,`action`);--> statement-breakpoint
CREATE INDEX `role_permissions_role_id_idx` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_locked` integer DEFAULT false NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`last_active_at` text NOT NULL,
	`ip` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_unique` ON `user_roles` (`user_id`,`role_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_id_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE INDEX `user_roles_user_id_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`photo_file_id` text,
	`account_type` text DEFAULT 'STAFF' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`primary_color` text,
	`guru_id` text,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`last_login_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "users_account_type_check" CHECK("users"."account_type" IN ('STAFF','KIOSK')),
	CONSTRAINT "users_status_check" CHECK("users"."status" IN ('ACTIVE','INACTIVE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `users_guru_id_idx` ON `users` (`guru_id`);