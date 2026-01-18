ALTER TABLE `repos` ADD `fs_created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `repos` ADD `fs_modified_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `repo_events` ADD `fs_created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `repo_events` ADD `fs_modified_at` text NOT NULL;