CREATE TABLE `calculationCycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`calculationId` int NOT NULL,
	`date` timestamp NOT NULL,
	`cycleNumber` int NOT NULL,
	`chargeStartHour` int NOT NULL,
	`chargeSumPrice` double NOT NULL,
	`dischargeStartHour` int NOT NULL,
	`dischargeSumPrice` double NOT NULL,
	`spreadPln` double NOT NULL,
	CONSTRAINT `calculationCycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`maxCyclesPerDay` int NOT NULL,
	`minSpreadPlnMwh` double NOT NULL,
	`capacityMwh` double NOT NULL,
	`powerMw` double NOT NULL,
	`socMin` double NOT NULL,
	`socMax` double NOT NULL,
	`efficiency` double NOT NULL,
	`distributionCostPlnMwh` double NOT NULL,
	`avgCyclesPerDay` double,
	`avgSpreadPerCyclePln` double,
	`effectiveAvgSpreadPlnMwh` double,
	`totalEnergyBoughtMwh` double,
	`totalEnergySoldMwh` double,
	`energyLossMwh` double,
	`totalRevenuePln` double,
	`revenuePln` double,
	`distributionCostPln` double,
	`profitPln` double,
	`rdnDataStartDate` timestamp,
	`rdnDataEndDate` timestamp,
	`rdnDataRowCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calculations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rdnPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`calculationId` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour` int NOT NULL,
	`priceRdnPlnMwh` double NOT NULL,
	CONSTRAINT `rdnPrices_id` PRIMARY KEY(`id`)
);
