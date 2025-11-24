/**
 * Ultra-simple battery sizing calculation
 * No loops, no RDN data processing - instant results
 */

export interface CustomerData {
  date: string;
  hour: number;
  consumptionMwh: number;
}

export interface BatterySizingResult {
  capacityMwh: number;
  powerMw: number;
}

/**
 * Calculate battery size using ultra-simple formula
 * Formula: Capacity = 25% of average daily consumption
 * Power = Capacity / 4 (assuming 4 hours charge/discharge)
 */
export function calculateBatterySizeUltraSimple(
  customerData: CustomerData[]
): BatterySizingResult {
  // Calculate total consumption
  const totalConsumptionMwh = customerData.reduce(
    (sum, row) => sum + row.consumptionMwh,
    0
  );

  // Calculate number of days
  const uniqueDates = new Set(customerData.map((row) => row.date));
  const numberOfDays = uniqueDates.size;

  // Average daily consumption
  const avgDailyConsumptionMwh = totalConsumptionMwh / numberOfDays;

  // Battery capacity: 25% of average daily consumption
  const capacityMwh = avgDailyConsumptionMwh * 0.25;

  // Power: capacity / 4 (4 hours charge/discharge)
  const powerMw = capacityMwh / 4;

  return {
    capacityMwh: Math.round(capacityMwh * 100) / 100,
    powerMw: Math.round(powerMw * 100) / 100,
  };
}
