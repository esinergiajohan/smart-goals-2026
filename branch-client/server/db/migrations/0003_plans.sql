CREATE TABLE `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_key` text NOT NULL,
	`repository_id` integer,
	`status` text NOT NULL,
	`content` text,
	`output_dir` text,
	`error` text,
	`cost_usd` real,
	`jira_comment_id` text,
	`jira_comment_url` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`finished_at` text,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE no action
);
