/**
 * Algorytm "Greedy daily" do optymalizacji wielkości magazynu energii
 * 
 * Zasada: dla każdej doby iterujemy godziny w kolejności rosnącej ceny
 * - Ładowanie: gdy cena ≤ p^low (30. percentyl)
 * - Rozładowanie: gdy cena ≥ p^high (70. percentyl)
 * - Zero eksport: rozładowanie ograniczone do min(P, SOC/η_d, L_t)
 */

interface HourlyData {
  date: Date;
  hour: number;
  pricePlnMwh: number;
  consumptionMwh: number;
}

interface BatteryParams {
  socMin: number; // 0-1
  socMax: number; // 0-1
  efficiency: number; // 0-1
  maxCyclesPerDay: number;
  distributionCostPlnMwh: number; // Koszty dystrybucji
}

interface DailyResult {
  date: Date;
  energyCharged: number;
  energyDischarged: number;
  peakDemandReduction: number;
  savingsPln: number;
}

/**
 * Percentyl ceny dla danego dnia
 */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Symulacja działania magazynu dla jednego dnia (Greedy daily)
 */
function simulateDay(
  hourlyData: HourlyData[],
  capacityMwh: number,
  powerMw: number,
  params: BatteryParams
): DailyResult {
  const { socMin, socMax, efficiency, maxCyclesPerDay, distributionCostPlnMwh } = params;
  
  // Wyznacz progi cenowe (bez kopiowania tablicy)
  const prices = new Float64Array(hourlyData.length);
  for (let i = 0; i < hourlyData.length; i++) {
    prices[i] = hourlyData[i].pricePlnMwh;
  }
  const pLow = percentile(Array.from(prices), 0.30);  // 30. percentyl
  const pHigh = percentile(Array.from(prices), 0.70); // 70. percentyl
  
  // Sortuj indeksy według ceny (rosnąco) zamiast kopiować całą tablicę
  const indices = Array.from({length: hourlyData.length}, (_, i) => i);
  indices.sort((a, b) => hourlyData[a].pricePlnMwh - hourlyData[b].pricePlnMwh);
  
  // Stan magazynu (zaczynamy od środka zakresu)
  let soc = (socMin + socMax) / 2;
  let cyclesUsed = 0;
  
  let totalEnergyCharged = 0;
  let totalEnergyDischarged = 0;
  let totalSavings = 0;
  let peakDemand = 0;
  
  // Oblicz maksymalne zużycie raz przed pętlą
  let maxConsumption = 0;
  for (let i = 0; i < hourlyData.length; i++) {
    if (hourlyData[i].consumptionMwh > maxConsumption) {
      maxConsumption = hourlyData[i].consumptionMwh;
    }
  }
  
  // Iteruj godziny w kolejności rosnącej ceny
  for (const idx of indices) {
    if (cyclesUsed >= maxCyclesPerDay) break;
    
    const hour = hourlyData[idx];
    const price = hour.pricePlnMwh;
    const consumption = hour.consumptionMwh;
    
    // Ładowanie (gdy cena niska)
    if (price <= pLow && soc < socMax) {
      const maxCharge = Math.min(
        powerMw,
        capacityMwh * (socMax - soc) / efficiency
      );
      const actualCharge = maxCharge;
      
      // Ładujemy actualCharge MWh, ale w magazynie zostaje tylko actualCharge * efficiency
      soc += (actualCharge * efficiency) / capacityMwh;
      totalEnergyCharged += actualCharge;
      // Koszt zakupu energii (cena RDN + koszty dystrybucji)
      totalSavings -= actualCharge * (price + distributionCostPlnMwh);
      cyclesUsed += 0.5; // pół cyklu
    }
    
    // Rozładowanie (gdy cena wysoka) - ZERO EKSPORT
    if (price >= pHigh && soc > socMin) {
      // Model B: straty tylko przy ładowaniu, więc z magazynu możemy pobrać dokładnie tyle ile jest w magazynie
      const maxDischarge = Math.min(
        powerMw,
        capacityMwh * (soc - socMin), // bez dzielenia przez efficiency
        consumption // ZERO EKSPORT - nie więcej niż zużycie
      );
      const actualDischarge = maxDischarge;
      
      // Rozładowujemy actualDischarge MWh z magazynu (bez strat przy rozładowaniu w modelu B)
      soc -= actualDischarge / capacityMwh;
      totalEnergyDischarged += actualDischarge;
      // Oszczędność: energia rozładowana × (cena RDN + koszty dystrybucji)
      // actualDischarge już uwzględnia straty (to energia która faktycznie wychodzi z magazynu)
      totalSavings += actualDischarge * (price + distributionCostPlnMwh);
      cyclesUsed += 0.5; // pół cyklu
      
      // Redukcja szczytowego zapotrzebowania
      peakDemand = Math.max(peakDemand, consumption - actualDischarge);
    } else {
      peakDemand = Math.max(peakDemand, consumption);
    }
  }
  
  return {
    date: hourlyData[0].date,
    energyCharged: totalEnergyCharged,
    energyDischarged: totalEnergyDischarged,
    peakDemandReduction: Math.max(0, maxConsumption - peakDemand),
    savingsPln: totalSavings,
  };
}

/**
 * Optymalizacja wielkości magazynu dla całego roku
 */
export function optimizeBatterySize(
  hourlyData: HourlyData[],
  params: BatteryParams
): {
  recommendedCapacityMwh: number;
  recommendedPowerMw: number;
  estimatedAnnualSavingsPln: number;
  dailyResults: DailyResult[];
} {
  // Grupuj dane po dniach
  const dayGroups = new Map<string, HourlyData[]>();
  for (const data of hourlyData) {
    const dateKey = data.date.toISOString().split('T')[0];
    if (!dayGroups.has(dateKey)) {
      dayGroups.set(dateKey, []);
    }
    dayGroups.get(dateKey)!.push(data);
  }
  
  // Szacowanie optymalnej wielkości magazynu
  // Heurystyka: pojemność = średnie dzienne zużycie * współczynnik
  const dailyConsumptions = Array.from(dayGroups.values()).map(day =>
    day.reduce((sum, h) => sum + h.consumptionMwh, 0)
  );
  const avgDailyConsumption = dailyConsumptions.reduce((a, b) => a + b, 0) / dailyConsumptions.length;
  
  // Rekomendowana pojemność: 20-30% średniego dziennego zużycia
  const recommendedCapacityMwh = Math.round(avgDailyConsumption * 0.25 * 100) / 100;
  
  // Rekomendowana moc: pojemność / 4 (założenie 4h ładowania/rozładowania)
  const recommendedPowerMw = Math.round(recommendedCapacityMwh / 4 * 100) / 100;
  
  // Symulacja z rekomendowanymi parametrami
  const dailyResults: DailyResult[] = [];
  let totalSavings = 0;
  
  for (const [dateKey, dayData] of Array.from(dayGroups.entries())) {
    const result = simulateDay(dayData, recommendedCapacityMwh, recommendedPowerMw, params);
    dailyResults.push(result);
    totalSavings += result.savingsPln;
  }
  
  return {
    recommendedCapacityMwh,
    recommendedPowerMw,
    estimatedAnnualSavingsPln: Math.round(totalSavings * 100) / 100,
    dailyResults,
  };
}
