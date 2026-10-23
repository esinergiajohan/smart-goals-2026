CREATE TABLE `pull_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repository_id` integer NOT NULL,
	`external_id` integer NOT NULL,
	`ticket_key` text,
	`title` text NOT NULL,
	`source_branch` text NOT NULL,
	`destination_branch` text NOT NULL,
	`state` text NOT NULL,
	`url` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` text NOT NULL,
	`closed_at` text,
	`approved_by` text NOT NULL,
	`changes_requested` integer NOT NULL,
	`pushes_after_open` integer NOT NULL,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pull_requests_repository_external` ON `pull_requests` (`repository_id`,`external_id`);