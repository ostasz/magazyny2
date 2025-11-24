import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, double, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Calculations table - stores calculation parameters and results
 */
export const calculations = mysqlTable("calculations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Input parameters
  maxCyclesPerDay: int("maxCyclesPerDay").notNull(), // K - liczba cykli
  minSpreadPlnMwh: double("minSpreadPlnMwh").notNull(), // próg opłacalności
  capacityMwh: double("capacityMwh").notNull(), // pojemność magazynu
  powerMw: double("powerMw").notNull(), // moc magazynu
  socMin: double("socMin").notNull(), // minimalny SoC (0-1)
  socMax: double("socMax").notNull(), // maksymalny SoC (0-1)
  efficiency: double("efficiency").notNull(), // efektywność (0-1)
  distributionCostPlnMwh: double("distributionCostPlnMwh").notNull(), // koszty dystrybucji
  
  // Calculated KPI
  avgCyclesPerDay: double("avgCyclesPerDay"),
  avgSpreadPerCyclePln: double("avgSpreadPerCyclePln"),
  effectiveAvgSpreadPlnMwh: double("effectiveAvgSpreadPlnMwh"),
  totalEnergyBoughtMwh: double("totalEnergyBoughtMwh"),
  totalEnergySoldMwh: double("totalEnergySoldMwh"),
  energyLossMwh: double("energyLossMwh"),
  totalRevenuePln: double("totalRevenuePln"),
  
  // Financial results
  revenuePln: double("revenuePln"),
  distributionCostPln: double("distributionCostPln"),
  profitPln: double("profitPln"),
  
  // Metadata
  rdnDataStartDate: timestamp("rdnDataStartDate"),
  rdnDataEndDate: timestamp("rdnDataEndDate"),
  rdnDataRowCount: int("rdnDataRowCount"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Calculation = typeof calculations.$inferSelect;
export type InsertCalculation = typeof calculations.$inferInsert;

/**
 * Global RDN prices table - stores hourly electricity prices uploaded by admin
 * Used by all users for calculations
 */
export const globalRdnPrices = mysqlTable("globalRdnPrices", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  hour: int("hour").notNull(), // 1-24
  priceRdnPlnMwh: double("priceRdnPlnMwh").notNull(),
  uploadedBy: int("uploadedBy").notNull(), // admin user id
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type GlobalRdnPrice = typeof globalRdnPrices.$inferSelect;
export type InsertGlobalRdnPrice = typeof globalRdnPrices.$inferInsert;

/**
 * RDN prices table - stores hourly electricity prices per calculation (legacy)
 */
export const rdnPrices = mysqlTable("rdnPrices", {
  id: int("id").autoincrement().primaryKey(),
  calculationId: int("calculationId").notNull(),
  date: timestamp("date").notNull(),
  hour: int("hour").notNull(), // 1-24
  priceRdnPlnMwh: double("priceRdnPlnMwh").notNull(),
});

export type RdnPrice = typeof rdnPrices.$inferSelect;
export type InsertRdnPrice = typeof rdnPrices.$inferInsert;

/**
 * Calculation cycles table - stores detailed cycle information
 */
export const calculationCycles = mysqlTable("calculationCycles", {
  id: int("id").autoincrement().primaryKey(),
  calculationId: int("calculationId").notNull(),
  date: timestamp("date").notNull(),
  cycleNumber: int("cycleNumber").notNull(), // numer cyklu w danym dniu
  chargeStartHour: int("chargeStartHour").notNull(),
  chargeSumPrice: double("chargeSumPrice").notNull(),
  dischargeStartHour: int("dischargeStartHour").notNull(),
  dischargeSumPrice: double("dischargeSumPrice").notNull(),
  spreadPln: double("spreadPln").notNull(),
});

export type CalculationCycle = typeof calculationCycles.$inferSelect;
export type InsertCalculationCycle = typeof calculationCycles.$inferInsert;

/**
 * Bug reports table - stores user-reported bugs and issues
 */
export const bugReports = mysqlTable("bugReports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  userEmail: varchar("userEmail", { length: 320 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  pageUrl: varchar("pageUrl", { length: 500 }),
  userAgent: varchar("userAgent", { length: 500 }),
  status: mysqlEnum("status", ["new", "in_progress", "resolved", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BugReport = typeof bugReports.$inferSelect;
export type InsertBugReport = typeof bugReports.$inferInsert;

/**
 * Customer profiles table - stores hourly energy consumption data for B2B clients
 */
export const customerProfiles = mysqlTable("customerProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  uploadDate: timestamp("uploadDate").defaultNow().notNull(),
  startDate: timestamp("startDate").notNull(), // pierwsza data w profilu
  endDate: timestamp("endDate").notNull(), // ostatnia data w profilu
  totalConsumptionMwh: double("totalConsumptionMwh").notNull(), // suma zużycia
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = typeof customerProfiles.$inferInsert;

/**
 * Customer profile data table - stores hourly consumption values
 */
export const customerProfileData = mysqlTable("customerProfileData", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  date: timestamp("date").notNull(),
  hour: int("hour").notNull(), // 1-24
  consumptionMwh: double("consumptionMwh").notNull(),
});

export type CustomerProfileData = typeof customerProfileData.$inferSelect;
export type InsertCustomerProfileData = typeof customerProfileData.$inferInsert;

/**
 * B2B sizing results table - stores battery sizing recommendations
 */
export const b2bSizingResults = mysqlTable("b2bSizingResults", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Input parameters
  maxCyclesPerDay: int("maxCyclesPerDay").notNull(),
  minSpreadPlnMwh: double("minSpreadPlnMwh").notNull(),
  socMin: double("socMin").notNull(),
  socMax: double("socMax").notNull(),
  efficiency: double("efficiency").notNull(),
  distributionCostPlnMwh: double("distributionCostPlnMwh").notNull(),
  
  // Recommended sizing
  recommendedCapacityMwh: double("recommendedCapacityMwh").notNull(),
  recommendedPowerMw: double("recommendedPowerMw").notNull(),
  estimatedAnnualSavingsPln: double("estimatedAnnualSavingsPln").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type B2bSizingResult = typeof b2bSizingResults.$inferSelect;
export type InsertB2bSizingResult = typeof b2bSizingResults.$inferInsert;

/**
 * Behind-the-meter simulations table - stores energy cost calculations
 */
export const behindMeterSimulations = mysqlTable("behindMeterSimulations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Battery parameters
  capacityMwh: double("capacityMwh").notNull(),
  powerMw: double("powerMw").notNull(),
  socMin: double("socMin").notNull(),
  socMax: double("socMax").notNull(),
  efficiency: double("efficiency").notNull(),
  distributionCostPlnMwh: double("distributionCostPlnMwh").notNull(),
  
  // Data period
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalConsumptionMwh: double("totalConsumptionMwh").notNull(),
  
  // Cost results (without battery)
  totalEnergyCostPln: double("totalEnergyCostPln").notNull(),
  averageCostPerMwh: double("averageCostPerMwh").notNull(),
  
  // Optimization results (with battery)
  totalCostWithoutBatteryPln: double("totalCostWithoutBatteryPln").notNull(),
  totalCostWithBatteryPln: double("totalCostWithBatteryPln").notNull(),
  totalSavingsPln: double("totalSavingsPln").notNull(),
  totalEnergyValueWithBatteryPln: double("totalEnergyValueWithBatteryPln").notNull(), // Wartość energii z magazynem (bez dystrybucji)
  energyChargedMwh: double("energyChargedMwh").notNull(),
  energyDischargedMwh: double("energyDischargedMwh").notNull(),
  numberOfCycles: double("numberOfCycles").notNull(),
  
  // Monthly breakdown (stored as JSON)
  monthlyData: text("monthlyData").notNull(), // JSON array of monthly results
  
  // Hourly details (stored as JSON) - for admin export
  hourlyDetails: text("hourlyDetails"), // JSON array of hourly simulation details
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BehindMeterSimulation = typeof behindMeterSimulations.$inferSelect;
export type InsertBehindMeterSimulation = typeof behindMeterSimulations.$inferInsert;
