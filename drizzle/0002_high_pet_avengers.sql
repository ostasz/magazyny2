CREATE TABLE `globalRdnPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`hour` int NOT NULL,
	`priceRdnPlnMwh` double NOT NULL,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `globalRdnPrices_id` PRIMARY KEY(`id`)
);
