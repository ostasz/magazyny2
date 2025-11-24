/**
 * Uproszczony algorytm doboru wielkości magazynu dla B2B
 * Zamiast symulować cały rok, używamy prostego wzoru matematycznego
 */

interface HourlyData {
  date: Date | string;
  hour: number;
  consumptionMwh: number;
  pricePlnMwh: number;
}

interface BatteryParams {
  socMin: number;
  socMax: number;
  efficiency: number;
  maxCyclesPerDay: number;
  distributionCostPlnMwh: number;
}

interface OptimizationResult {
  capacityMwh: number;
  powerMw: number;
}

/**
 * Oblicza percentyl z tablicy liczb
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Uproszczony algorytm doboru wielkości magazynu
 * Czas wykonania: <100ms (zamiast 30-50 sekund)
 */
export function optimizeBatterySizeSimple(
  hourlyData: HourlyData[],
  params: BatteryParams
): OptimizationResult {
  const { efficiency, maxCyclesPerDay, distributionCostPlnMwh } = params;

  // 1. Oblicz średnie dzienne zużycie
  const dailyConsumption = new Map<string, number>();
  for (const row of hourlyData) {
    const dateKey = typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0];
    const current = dailyConsumption.get(dateKey) || 0;
    dailyConsumption.set(dateKey, current + row.consumptionMwh);
  }
  const avgDailyConsumption =
    Array.from(dailyConsumption.values()).reduce((a, b) => a + b, 0) / dailyConsumption.size;

  // 2. Oblicz progi cenowe (30. i 70. percentyl)
  const prices = hourlyData.map((h) => h.pricePlnMwh);
  const priceLow = percentile(prices, 0.3); // Tanie godziny
  const priceHigh = percentile(prices, 0.7); // Drogie godziny

  // 3. Oblicz średnią cenę w godzinach tanich i drogich
  const lowPriceHours = hourlyData.filter((h) => h.pricePlnMwh <= priceLow);
  const highPriceHours = hourlyData.filter((h) => h.pricePlnMwh >= priceHigh);

  const avgLowPrice =
    lowPriceHours.reduce((sum, h) => sum + h.pricePlnMwh, 0) / lowPriceHours.length;
  const avgHighPrice =
    highPriceHours.reduce((sum, h) => sum + h.pricePlnMwh, 0) / highPriceHours.length;

  // 4. Oblicz pojemność magazynu (20-30% średniego dziennego zużycia)
  // Używamy 25% jako kompromis
  const capacityMwh = avgDailyConsumption * 0.25;

  // 5. Oblicz moc magazynu (zakładamy 4h ładowania/rozładowania)
  const powerMw = capacityMwh / 4;

  // Uwaga: Oszczędności nie są obliczane w tym uproszczonym algorytmie
  // Dokładne oszczędności wymagają symulacji całego roku, co jest czasochłonne

  return {
    capacityMwh: Math.round(capacityMwh * 100) / 100,
    powerMw: Math.round(powerMw * 100) / 100,
  };
}
