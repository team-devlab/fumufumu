CREATE UNIQUE INDEX `auth_accounts_provider_account_unique` ON `auth_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_user_provider_unique` ON `auth_accounts` (`user_id`,`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_mappings_auth_user_id_unique` ON `auth_mappings` (`auth_user_id`);