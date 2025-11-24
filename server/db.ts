import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  calculations,
  rdnPrices,
  calculationCycles,
  globalRdnPrices,
  bugReports,
  customerProfiles,
  customerProfileData,
  b2bSizingResults,
  InsertCalculation,
  InsertRdnPrice,
  InsertCalculationCycle,
  InsertGlobalRdnPrice,
  InsertBugReport,
  InsertCustomerProfile,
  InsertCustomerProfileData,
  InsertB2bSizingResult,
  Calculation,
  behindMeterSimulations,
  InsertBehindMeterSimulation
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create postgres client with connection pooling for serverless
      _client = postgres(process.env.DATABASE_URL, {
        max: 1, // PostgreSQL connection pooling
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL uses onConflictDoUpdate instead of onDuplicateKeyUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Calculation queries =====

export async function createCalculation(calc: InsertCalculation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(calculations).values(calc).returning({ id: calculations.id });
  return result[0].id;
}

export async function updateCalculation(id: number, data: Partial<InsertCalculation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(calculations).set(data).where(eq(calculations.id, id));
}

export async function getCalculationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(calculations).where(eq(calculations.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getCalculationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(calculations)
    .where(eq(calculations.userId, userId))
    .orderBy(desc(calculations.createdAt));
}

export async function getCalculationsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (ids.length === 0) return [];

  return await db.select().from(calculations)
    .where(sql`${calculations.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
}

// ===== RDN Prices queries =====

export async function insertRdnPrices(prices: InsertRdnPrice[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (prices.length === 0) return;

  // Insert w partiach po 1000 rekordów
  const batchSize = 1000;
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    await db.insert(rdnPrices).values(batch);
  }
}

export async function getRdnPricesByCalculationId(calculationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(rdnPrices)
    .where(eq(rdnPrices.calculationId, calculationId))
    .orderBy(rdnPrices.date, rdnPrices.hour);
}

// ===== Calculation Cycles queries =====

export async function insertCalculationCycles(cycles: InsertCalculationCycle[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (cycles.length === 0) return;

  // Insert w partiach po 1000 rekordów
  const batchSize = 1000;
  for (let i = 0; i < cycles.length; i += batchSize) {
    const batch = cycles.slice(i, i + batchSize);
    await db.insert(calculationCycles).values(batch);
  }
}

export async function getCalculationCyclesByCalculationId(calculationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(calculationCycles)
    .where(eq(calculationCycles.calculationId, calculationId))
    .orderBy(calculationCycles.date, calculationCycles.cycleNumber);
}

// ===== Global RDN Prices queries (admin only) =====

export async function clearGlobalRdnPrices() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(globalRdnPrices);
}

export async function insertGlobalRdnPrices(prices: InsertGlobalRdnPrice[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (prices.length === 0) return;

  // Insert w partiach po 1000 rekordów
  const batchSize = 1000;
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    await db.insert(globalRdnPrices).values(batch);
  }
}

export async function getGlobalRdnPrices() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(globalRdnPrices)
    .orderBy(globalRdnPrices.date, globalRdnPrices.hour);
}

export async function getGlobalRdnPricesMetadata() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prices = await db.select().from(globalRdnPrices)
    .orderBy(globalRdnPrices.date)
    .limit(1);

  if (prices.length === 0) return null;

  const count = await db.select({ count: sql<number>`count(*)` })
    .from(globalRdnPrices);

  const lastPrice = await db.select().from(globalRdnPrices)
    .orderBy(desc(globalRdnPrices.date), desc(globalRdnPrices.hour))
    .limit(1);

  return {
    startDate: prices[0].date,
    endDate: lastPrice[0].date,
    rowCount: count[0].count,
    uploadedAt: prices[0].uploadedAt,
    uploadedBy: prices[0].uploadedBy
  };
}

export async function getHourlyAverages(calculationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Pobranie wszystkich cykli dla danej kalkulacji
  const cycles = await db.select().from(calculationCycles)
    .where(eq(calculationCycles.calculationId, calculationId));

  if (cycles.length === 0) return [];

  // Pobranie cen RDN dla danej kalkulacji
  const prices = await db.select().from(rdnPrices)
    .where(eq(rdnPrices.calculationId, calculationId));

  // Obliczenie średnich cen dla każdej godziny
  const hourlyMap = new Map<number, number[]>();

  prices.forEach(price => {
    if (!hourlyMap.has(price.hour)) {
      hourlyMap.set(price.hour, []);
    }
    hourlyMap.get(price.hour)!.push(price.priceRdnPlnMwh);
  });

  // Obliczenie średnich
  const hourlyAverages = Array.from(hourlyMap.entries()).map(([hour, priceList]) => ({
    hour,
    avgPrice: priceList.reduce((sum, p) => sum + p, 0) / priceList.length,
  }));

  // Sortowanie po godzinie
  hourlyAverages.sort((a, b) => a.hour - b.hour);

  // Identyfikacja typowych godzin ładowania i rozładowania
  // Zliczanie wystąpień każdej godziny w cyklach
  const chargingHours = new Map<number, number>();
  const dischargingHours = new Map<number, number>();

  cycles.forEach(cycle => {
    if (cycle.chargeStartHour !== null) {
      chargingHours.set(cycle.chargeStartHour, (chargingHours.get(cycle.chargeStartHour) || 0) + 1);
    }
    if (cycle.dischargeStartHour !== null) {
      dischargingHours.set(cycle.dischargeStartHour, (dischargingHours.get(cycle.dischargeStartHour) || 0) + 1);
    }
  });

  // Znalezienie najczęstszych godzin (top 20% wystąpień)
  const totalCycles = cycles.length;
  const chargingThreshold = totalCycles * 0.05; // 5% cykli
  const dischargingThreshold = totalCycles * 0.05;

  const topChargingHours = new Set(
    Array.from(chargingHours.entries())
      .filter(([_, count]) => count >= chargingThreshold)
      .map(([hour, _]) => hour)
  );

  const topDischargingHours = new Set(
    Array.from(dischargingHours.entries())
      .filter(([_, count]) => count >= dischargingThreshold)
      .map(([hour, _]) => hour)
  );

  // Dodanie flag do danych godzinowych
  return hourlyAverages.map(hourData => ({
    ...hourData,
    isCharging: topChargingHours.has(hourData.hour),
    isDischarging: topDischargingHours.has(hourData.hour),
  }));
}

/**
 * Create a new bug report
 */
export async function createBugReport(report: InsertBugReport) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(bugReports).values(report);
  return result;
}

/**
 * Get all bug reports (for admin panel)
 */
export async function getAllBugReports() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(bugReports).orderBy(desc(bugReports.createdAt));
}

/**
 * Update bug report status
 */
export async function updateBugReportStatus(id: number, status: "new" | "in_progress" | "resolved" | "closed") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(bugReports)
    .set({ status, updatedAt: new Date() })
    .where(eq(bugReports.id, id));
}

/**
 * Create a new customer profile
 */
export async function createCustomerProfile(profile: InsertCustomerProfile) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(customerProfiles).values(profile).returning({ id: customerProfiles.id });
  return result[0].id;
}

/**
 * Insert customer profile data (hourly consumption)
 */
export async function insertCustomerProfileData(data: InsertCustomerProfileData[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(customerProfileData).values(data);
}

/**
 * Get customer profile by ID
 */
export async function getCustomerProfileById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(customerProfiles).where(eq(customerProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get customer profile data (hourly consumption)
 */
export async function getCustomerProfileData(profileId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(customerProfileData)
    .where(eq(customerProfileData.profileId, profileId))
    .orderBy(customerProfileData.date, customerProfileData.hour);
}

/**
 * Get all customer profiles for a user
 */
export async function getUserCustomerProfiles(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(customerProfiles)
    .where(eq(customerProfiles.userId, userId))
    .orderBy(desc(customerProfiles.createdAt));
}

/**
 * Save B2B sizing result
 */
export async function saveB2bSizingResult(result: InsertB2bSizingResult) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const insertResult = await db.insert(b2bSizingResults).values(result).returning({ id: b2bSizingResults.id });
  return insertResult[0].id;
}

/**
 * Get B2B sizing result by ID
 */
export async function getB2bSizingResultById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(b2bSizingResults).where(eq(b2bSizingResults.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all B2B sizing results for a user
 */
export async function getUserB2bSizingResults(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(b2bSizingResults)
    .where(eq(b2bSizingResults.userId, userId))
    .orderBy(desc(b2bSizingResults.createdAt));
}

/**
 * Save behind-the-meter simulation
 */
export async function saveBehindMeterSimulation(simulation: InsertBehindMeterSimulation) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const insertResult = await db.insert(behindMeterSimulations).values(simulation).returning({ id: behindMeterSimulations.id });
  return insertResult[0].id;
}

/**
 * Get behind-the-meter simulation by ID
 */
export async function getBehindMeterSimulationById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(behindMeterSimulations).where(eq(behindMeterSimulations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all behind-the-meter simulations for a user
 */
export async function getUserBehindMeterSimulations(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(behindMeterSimulations)
    .where(eq(behindMeterSimulations.userId, userId))
    .orderBy(desc(behindMeterSimulations.createdAt));
}
