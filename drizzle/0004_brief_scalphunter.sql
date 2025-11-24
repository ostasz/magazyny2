CREATE TABLE `b2bSizingResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`maxCyclesPerDay` int NOT NULL,
	`minSpreadPlnMwh` double NOT NULL,
	`socMin` double NOT NULL,
	`socMax` double NOT NULL,
	`efficiency` double NOT NULL,
	`distributionCostPlnMwh` double NOT NULL,
	`recommendedCapacityMwh` double NOT NULL,
	`recommendedPowerMw` double NOT NULL,
	`estimatedAnnualSavingsPln` double NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `b2bSizingResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerProfileData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour` int NOT NULL,
	`consumptionMwh` double NOT NULL,
	CONSTRAINT `customerProfileData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`uploadDate` timestamp NOT NULL DEFAULT (now()),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalConsumptionMwh` double NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerProfiles_id` PRIMARY KEY(`id`)
);
