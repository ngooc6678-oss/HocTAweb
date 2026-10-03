CREATE TABLE `words` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`term` text NOT NULL,
	`meaning` text NOT NULL,
	`synonyms` text DEFAULT '' NOT NULL,
	`example` text DEFAULT '' NOT NULL,
	`word_key` text NOT NULL,
	`known` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `words_user_key` ON `words` (`user_id`,`word_key`);