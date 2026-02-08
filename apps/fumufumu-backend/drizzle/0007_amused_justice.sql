CREATE TABLE `consultation_taggings` (
	`consultation_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`consultation_id`, `tag_id`),
	FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_consultation_taggings_tag_id` ON `consultation_taggings` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);