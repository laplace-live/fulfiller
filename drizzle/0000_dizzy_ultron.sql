CREATE TABLE `fulfilled_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`provider_order_id` text NOT NULL,
	`shopify_order_number` text NOT NULL,
	`shopify_order_id` text NOT NULL,
	`fulfilled_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_provider_order` ON `fulfilled_orders` (`provider`,`provider_order_id`);--> statement-breakpoint
CREATE INDEX `idx_shopify_order` ON `fulfilled_orders` (`shopify_order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `provider_order_unique` ON `fulfilled_orders` (`provider`,`provider_order_id`);