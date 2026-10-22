CREATE TABLE `repositories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`base_branch` text NOT NULL,
	`development_branch` text NOT NULL,
	`production_branch` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_name_unique` ON `repositories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_path_unique` ON `repositories` (`path`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_key` text NOT NULL,
	`repository_id` integer NOT NULL,
	`role` text NOT NULL,
	`branch` text NOT NULL,
	`base` text NOT NULL,
	`status` text NOT NULL,
	`mode` text,
	`iteration` integer,
	`previous_review_id` integer,
	`output_dir` text,
	`commit_sha` text,
	`decision` text,
	`verdict` text,
	`summary` text,
	`result` text,
	`developer_comment` text,
	`certified` integer,
	`certification_error` text,
	`error` text,
	`cost_usd` real,
	`created_at` text NOT NULL,
	`started_at` text,
	`finished_at` text,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tickets` ADD `repository_id` integer REFERENCES repositories(id);