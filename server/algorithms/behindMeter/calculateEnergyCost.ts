/**
 * Behind-the-meter energy cost calculation
 * 
 * Calculates total energy cost by matching consumption data with RDN prices
 * Formula: cost = consumption (MWh) × RDN price (PLN/MWh)
 */

interface ConsumptionData {
  date: Date;
  hour: number;
  consumptionMwh: number;
}

interface RdnPriceData {
  date: Date;
  hour: number;
  priceRdnPlnMwh: number;
}

interface MonthlyResult {
  month: string; // "2024-10"
  consumptionMwh: number;
  costPln: number;
}

interface CalculationResult {
  totalConsumptionMwh: number;
  totalEnergyCostPln: number;
  averageCostPerMwh: number;
  monthlyData: MonthlyResult[];
}

/**
 * Calculate energy cost based on consumption data and RDN prices
 */
export function calculateEnergyCost(
  consumptionData: ConsumptionData[],
  rdnPrices: RdnPriceData[]
): CalculationResult {
  // Create a map for fast RDN price lookup: "YYYY-MM-DD:H" -> price
  const priceMap = new Map<string, number>();
  for (const price of rdnPrices) {
    const dateStr = price.date.toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `${dateStr}:${price.hour}`;
    priceMap.set(key, price.priceRdnPlnMwh);
  }

  // Calculate hourly costs and aggregate by month
  const monthlyMap = new Map<string, { consumption: number; cost: number }>();
  let totalConsumption = 0;
  let totalCost = 0;

  for (const data of consumptionData) {
    const dateStr = data.date.toISOString().split('T')[0];
    const key = `${dateStr}:${data.hour}`;
    const price = priceMap.get(key);

    if (price === undefined) {
      throw new Error(
        `Brak ceny RDN dla daty ${dateStr} godzina ${data.hour}. ` +
        `Upewnij się, że dane RDN pokrywają cały okres zużycia.`
      );
    }

    const hourlyCost = data.consumptionMwh * price;
    totalConsumption += data.consumptionMwh;
    totalCost += hourlyCost;

    // Aggregate by month (YYYY-MM)
    const monthKey = dateStr.substring(0, 7); // "2024-10"
    const monthData = monthlyMap.get(monthKey) || { consumption: 0, cost: 0 };
    monthData.consumption += data.consumptionMwh;
    monthData.cost += hourlyCost;
    monthlyMap.set(monthKey, monthData);
  }

  // Convert monthly map to sorted array
  const monthlyData: MonthlyResult[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      consumptionMwh: data.consumption,
      costPln: data.cost,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const averageCostPerMwh = totalConsumption > 0 ? totalCost / totalConsumption : 0;

  return {
    totalConsumptionMwh: totalConsumption,
    totalEnergyCostPln: totalCost,
    averageCostPerMwh,
    monthlyData,
  };
}
