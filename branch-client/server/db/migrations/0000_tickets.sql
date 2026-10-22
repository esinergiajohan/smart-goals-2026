CREATE TABLE `tickets` (
	`key` text PRIMARY KEY NOT NULL,
	`summary` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`added_at` text NOT NULL,
	`deployed_at` text,
	`featured_comment_id` text,
	`branches` text
);
