CREATE TABLE `BanList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`admin` text NOT NULL,
	`region` text NOT NULL,
	`reason` text,
	`removal_date` numeric,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `WhiteList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`admin` text NOT NULL,
	`region` text NOT NULL,
	`reason` text,
	`removal_date` numeric,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `AdminList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`admin` text NOT NULL,
	`region` text NOT NULL,
	`role` text NOT NULL,
	`removal_date` numeric,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `UserList`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `UserList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL
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
CREATE TABLE `Logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`priority` text DEFAULT 'verbose' NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserList_name_key` ON `UserList` (`name`);
