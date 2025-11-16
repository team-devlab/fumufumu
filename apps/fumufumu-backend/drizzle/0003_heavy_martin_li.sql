PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_consultations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`draft` integer DEFAULT false NOT NULL,
	`hidden_at` integer,
	`solved_at` integer,
	`author_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_consultations`("id", "title", "body", "draft", "hidden_at", "solved_at", "author_id", "created_at", "updated_at") SELECT "id", "title", "body", "draft", "hidden_at", "solved_at", "author_id", "created_at", "updated_at" FROM `consultations`;--> statement-breakpoint
DROP TABLE `consultations`;--> statement-breakpoint
ALTER TABLE `__new_consultations` RENAME TO `consultations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;