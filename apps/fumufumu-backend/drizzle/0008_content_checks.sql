CREATE TABLE `content_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`checked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "uq_content_checks_target" UNIQUE(`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_content_checks_status_created_at` ON `content_checks` (`status`,`created_at`);
