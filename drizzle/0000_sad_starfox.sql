CREATE TABLE `AdminList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`admin` text NOT NULL,
	`region` text NOT NULL,
	`role` text NOT NULL,
	`removal_date` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `BanList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`admin` text NOT NULL,
	`region` text NOT NULL,
	`reason` text,
	`removal_date` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`priority` text DEFAULT 'verbose' NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `Settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`sensitive` integer NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `UserList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `UserStats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`gameName` text NOT NULL,
	`mapName` text NOT NULL,
	`gamesPlayed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `WhiteList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`admin` text NOT NULL,
	`region` text NOT NULL,
	`reason` text,
	`removal_date` integer,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserList_name_key` ON `UserList` (`name`);