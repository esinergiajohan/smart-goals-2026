ALTER TABLE `pull_requests` ADD `reviewer_comments` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `pull_requests` ADD `merged_by` text;