ALTER TABLE `behindMeterSimulations` ADD `totalCostWithoutBatteryPln` double NOT NULL;--> statement-breakpoint
ALTER TABLE `behindMeterSimulations` ADD `totalCostWithBatteryPln` double NOT NULL;--> statement-breakpoint
ALTER TABLE `behindMeterSimulations` ADD `totalSavingsPln` double NOT NULL;--> statement-breakpoint
ALTER TABLE `behindMeterSimulations` ADD `energyChargedMwh` double NOT NULL;--> statement-breakpoint
ALTER TABLE `behindMeterSimulations` ADD `energyDischargedMwh` double NOT NULL;--> statement-breakpoint
ALTER TABLE `behindMeterSimulations` ADD `numberOfCycles` double NOT NULL;