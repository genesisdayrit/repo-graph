PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_repos` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`fs_created_at` text NOT NULL,
	`fs_modified_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_repos`("id", "path", "name", "alias", "fs_created_at", "fs_modified_at", "created_at", "updated_at") SELECT "id", "path", "name", "alias", "fs_created_at", "fs_modified_at", "created_at", "updated_at" FROM `repos`;--> statement-breakpoint
DROP TABLE `repos`;--> statement-breakpoint
ALTER TABLE `__new_repos` RENAME TO `repos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `repos_path_unique` ON `repos` (`path`);--> statement-breakpoint
CREATE TABLE `__new_repo_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`path` text NOT NULL,
	`repo_id` text NOT NULL,
	`file_type` text,
	`node_depth` integer NOT NULL,
	`fs_created_at` text NOT NULL,
	`fs_modified_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_repo_events`("id", "type", "path", "repo_id", "file_type", "node_depth", "fs_created_at", "fs_modified_at", "created_at", "updated_at") SELECT "id", "type", "path", "repo_id", "file_type", "node_depth", "fs_created_at", "fs_modified_at", "created_at", "updated_at" FROM `repo_events`;--> statement-breakpoint
DROP TABLE `repo_events`;--> statement-breakpoint
ALTER TABLE `__new_repo_events` RENAME TO `repo_events`;--> statement-breakpoint
CREATE INDEX `repo_events_repo_id_idx` ON `repo_events` (`repo_id`);--> statement-breakpoint
CREATE INDEX `repo_events_path_idx` ON `repo_events` (`path`);--> statement-breakpoint
CREATE INDEX `repo_events_type_idx` ON `repo_events` (`type`);