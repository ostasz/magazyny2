CREATE TABLE `bugReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`userEmail` varchar(320),
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`pageUrl` varchar(500),
	`userAgent` varchar(500),
	`status` enum('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bugReports_id` PRIMARY KEY(`id`)
);
