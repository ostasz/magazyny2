CREATE TABLE `behindMeterSimulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalConsumptionMwh` double NOT NULL,
	`totalEnergyCostPln` double NOT NULL,
	`averageCostPerMwh` double NOT NULL,
	`monthlyData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `behindMeterSimulations_id` PRIMARY KEY(`id`)
);
