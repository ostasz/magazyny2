import { integer, pgEnum, pgTable, text, timestamp, varchar, doublePrecision, boolean, serial } from "drizzle-orm/pg-core";

// Enums for PostgreSQL
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const bugReportStatusEnum = pgEnum("bug_report_status", ["new", "in_progress", "resolved", "closed"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Calculations table - stores calculation parameters and results
 */
export const calculations = pgTable("calculations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),

  // Input parameters
  maxCyclesPerDay: integer("maxCyclesPerDay").notNull(), // K - liczba cykli
  minSpreadPlnMwh: doublePrecision("minSpreadPlnMwh").notNull(), // próg opłacalności
  capacityMwh: doublePrecision("capacityMwh").notNull(), // pojemność magazynu
  powerMw: doublePrecision("powerMw").notNull(), // moc magazynu
  socMin: doublePrecision("socMin").notNull(), // minimalny SoC (0-1)
  socMax: doublePrecision("socMax").notNull(), // maksymalny SoC (0-1)
  efficiency: doublePrecision("efficiency").notNull(), // efektywność (0-1)
  distributionCostPlnMwh: doublePrecision("distributionCostPlnMwh").notNull(), // koszty dystrybucji

  // Calculated KPI
  avgCyclesPerDay: doublePrecision("avgCyclesPerDay"),
  avgSpreadPerCyclePln: doublePrecision("avgSpreadPerCyclePln"),
  effectiveAvgSpreadPlnMwh: doublePrecision("effectiveAvgSpreadPlnMwh"),
  totalEnergyBoughtMwh: doublePrecision("totalEnergyBoughtMwh"),
  totalEnergySoldMwh: doublePrecision("totalEnergySoldMwh"),
  energyLossMwh: doublePrecision("energyLossMwh"),
  totalRevenuePln: doublePrecision("totalRevenuePln"),

  // Financial results
  revenuePln: doublePrecision("revenuePln"),
  distributionCostPln: doublePrecision("distributionCostPln"),
  profitPln: doublePrecision("profitPln"),

  // Metadata
  rdnDataStartDate: timestamp("rdnDataStartDate"),
  rdnDataEndDate: timestamp("rdnDataEndDate"),
  rdnDataRowCount: integer("rdnDataRowCount"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Calculation = typeof calculations.$inferSelect;
export type InsertCalculation = typeof calculations.$inferInsert;

/**
 * Global RDN prices table - stores hourly electricity prices uploaded by admin
 * Used by all users for calculations
 */
export const globalRdnPrices = pgTable("globalRdnPrices", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  hour: integer("hour").notNull(), // 1-24
  priceRdnPlnMwh: doublePrecision("priceRdnPlnMwh").notNull(),
  uploadedBy: integer("uploadedBy").notNull(), // admin user id
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type GlobalRdnPrice = typeof globalRdnPrices.$inferSelect;
export type InsertGlobalRdnPrice = typeof globalRdnPrices.$inferInsert;

/**
 * RDN prices table - stores hourly electricity prices per calculation (legacy)
 */
export const rdnPrices = pgTable("rdnPrices", {
  id: serial("id").primaryKey(),
  calculationId: integer("calculationId").notNull(),
  date: timestamp("date").notNull(),
  hour: integer("hour").notNull(), // 1-24
  priceRdnPlnMwh: doublePrecision("priceRdnPlnMwh").notNull(),
});

export type RdnPrice = typeof rdnPrices.$inferSelect;
export type InsertRdnPrice = typeof rdnPrices.$inferInsert;

/**
 * Calculation cycles table - stores detailed cycle information
 */
export const calculationCycles = pgTable("calculationCycles", {
  id: serial("id").primaryKey(),
  calculationId: integer("calculationId").notNull(),
  date: timestamp("date").notNull(),
  cycleNumber: integer("cycleNumber").notNull(), // numer cyklu w danym dniu
  chargeStartHour: integer("chargeStartHour").notNull(),
  chargeSumPrice: doublePrecision("chargeSumPrice").notNull(),
  dischargeStartHour: integer("dischargeStartHour").notNull(),
  dischargeSumPrice: doublePrecision("dischargeSumPrice").notNull(),
  spreadPln: doublePrecision("spreadPln").notNull(),
});

export type CalculationCycle = typeof calculationCycles.$inferSelect;
export type InsertCalculationCycle = typeof calculationCycles.$inferInsert;

/**
 * Bug reports table - stores user-reported bugs and issues
 */
export const bugReports = pgTable("bugReports", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  userEmail: varchar("userEmail", { length: 320 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  pageUrl: varchar("pageUrl", { length: 500 }),
  userAgent: varchar("userAgent", { length: 500 }),
  status: bugReportStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BugReport = typeof bugReports.$inferSelect;
export type InsertBugReport = typeof bugReports.$inferInsert;

/**
 * Customer profiles table - stores hourly energy consumption data for B2B clients
 */
export const customerProfiles = pgTable("customerProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  uploadDate: timestamp("uploadDate").defaultNow().notNull(),
  startDate: timestamp("startDate").notNull(), // pierwsza data w profilu
  endDate: timestamp("endDate").notNull(), // ostatnia data w profilu
  totalConsumptionMwh: doublePrecision("totalConsumptionMwh").notNull(), // suma zużycia
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = typeof customerProfiles.$inferInsert;

/**
 * Customer profile data table - stores hourly consumption values
 */
export const customerProfileData = pgTable("customerProfileData", {
  id: serial("id").primaryKey(),
  profileId: integer("profileId").notNull(),
  date: timestamp("date").notNull(),
  hour: integer("hour").notNull(), // 1-24
  consumptionMwh: doublePrecision("consumptionMwh").notNull(),
});

export type CustomerProfileData = typeof customerProfileData.$inferSelect;
export type InsertCustomerProfileData = typeof customerProfileData.$inferInsert;

/**
 * B2B sizing results table - stores battery sizing recommendations
 */
export const b2bSizingResults = pgTable("b2bSizingResults", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  profileId: integer("profileId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),

  // Input parameters
  maxCyclesPerDay: integer("maxCyclesPerDay").notNull(),
  minSpreadPlnMwh: doublePrecision("minSpreadPlnMwh").notNull(),
  socMin: doublePrecision("socMin").notNull(),
  socMax: doublePrecision("socMax").notNull(),
  efficiency: doublePrecision("efficiency").notNull(),
  distributionCostPlnMwh: doublePrecision("distributionCostPlnMwh").notNull(),

  // Recommended sizing
  recommendedCapacityMwh: doublePrecision("recommendedCapacityMwh").notNull(),
  recommendedPowerMw: doublePrecision("recommendedPowerMw").notNull(),
  estimatedAnnualSavingsPln: doublePrecision("estimatedAnnualSavingsPln").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type B2bSizingResult = typeof b2bSizingResults.$inferSelect;
export type InsertB2bSizingResult = typeof b2bSizingResults.$inferInsert;

/**
 * Behind-the-meter simulations table - stores energy cost calculations
 */
export const behindMeterSimulations = pgTable("behindMeterSimulations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),

  // Battery parameters
  capacityMwh: doublePrecision("capacityMwh").notNull(),
  powerMw: doublePrecision("powerMw").notNull(),
  socMin: doublePrecision("socMin").notNull(),
  socMax: doublePrecision("socMax").notNull(),
  efficiency: doublePrecision("efficiency").notNull(),
  distributionCostPlnMwh: doublePrecision("distributionCostPlnMwh").notNull(),

  // Data period
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalConsumptionMwh: doublePrecision("totalConsumptionMwh").notNull(),

  // Cost results (without battery)
  totalEnergyCostPln: doublePrecision("totalEnergyCostPln").notNull(),
  averageCostPerMwh: doublePrecision("averageCostPerMwh").notNull(),

  // Optimization results (with battery)
  totalCostWithoutBatteryPln: doublePrecision("totalCostWithoutBatteryPln").notNull(),
  totalCostWithBatteryPln: doublePrecision("totalCostWithBatteryPln").notNull(),
  totalSavingsPln: doublePrecision("totalSavingsPln").notNull(),
  totalEnergyValueWithBatteryPln: doublePrecision("totalEnergyValueWithBatteryPln").notNull(), // Wartość energii z magazynem (bez dystrybucji)
  energyChargedMwh: doublePrecision("energyChargedMwh").notNull(),
  energyDischargedMwh: doublePrecision("energyDischargedMwh").notNull(),
  numberOfCycles: doublePrecision("numberOfCycles").notNull(),

  // Monthly breakdown (stored as JSON)
  monthlyData: text("monthlyData").notNull(), // JSON array of monthly results

  // Hourly details (stored as JSON) - for admin export
  hourlyDetails: text("hourlyDetails"), // JSON array of hourly simulation details

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BehindMeterSimulation = typeof behindMeterSimulations.$inferSelect;
export type InsertBehindMeterSimulation = typeof behindMeterSimulations.$inferInsert;
