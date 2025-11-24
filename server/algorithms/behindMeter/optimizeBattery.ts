/**
 * Algorytm optymalizacji magazynu energii "za licznikiem" (bez eksportu do sieci)
 * Używa Dynamic Programming z dyskretyzacją SoC
 * 
 * Założenia:
 * - Każdy tydzień zaczyna i kończy z SoC = socMin
 * - Brak eksportu energii do sieci (rozładowanie max = zużycie)
 * - Dyskretyzacja SoC co 2% pojemności
 * - Guard heuristic - nie rozładowuj przy cenach niższych niż koszt efektywny energii w baterii
 */

interface HourlyData {
  date: string;
  hour: number;
  consumptionMwh: number;
  priceRdnPlnMwh: number;
}

interface BatteryParams {
  capacityMwh: number;
  powerMw: number;
  socMin: number; // 0-1
  socMax: number; // 0-1
  efficiency: number; // 0-1 (round-trip)
  distributionCostPlnMwh: number;
}

interface HourlySimulationDetail {
  date: string;
  hour: number;
  priceRdnPlnMwh: number;
  loadMwh: number;
  chargeMwh: number;
  dischargeMwh: number;
  pBatMw: number;
  socEndMwh: number;
  gridImportMwh: number;
  hourCostPln: number;
  energiaBezMagPln: number;
}

interface MonthlyBatteryResult {
  totalCost: number;
  totalCostWithoutBattery: number;
  energyCharged: number;
  energyDischarged: number;
  cycles: number;
  hourlyDetails: HourlySimulationDetail[];
  energyValueWithoutDistribution: number;
}

interface OptimizationResult {
  totalCostWithoutBatteryPln: number;
  totalCostWithBatteryPln: number;
  totalSavingsPln: number;
  energyChargedMwh: number;
  energyDischargedMwh: number;
  numberOfCycles: number;
  hourlyDetails: HourlySimulationDetail[];
  totalEnergyValueWithBatteryPln: number;
}

const INF = 1e15;
const SOC_STEP = 0.02; // 2% pojemności

/**
 * Solver DP dla jednego tygodnia
 */
function solveWeek(
  weekKey: string,
  P: number[], // ceny RDN [PLN/MWh]
  L: number[], // zużycie [MWh]
  params: BatteryParams
): {
  Ch: number[]; // ładowanie [MWh]
  Ds: number[]; // rozładowanie [MWh]
  SOC: number[]; // trajektoria SoC [MWh]
  cost: number; // koszt zakupu energii z sieci
} {
  const { capacityMwh: CAP, powerMw: PG, socMin: SM_P, socMax: SX_P, efficiency: ETA } = params;
  
  const n = P.length; // liczba godzin w tygodniu
  const SM = CAP * SM_P; // minimalna energia w magazynie [MWh]
  const SX = CAP * SX_P; // maksymalna energia w magazynie [MWh]
  
  // Ograniczenia mocy dla modelu "za licznikiem"
  const PC: number[] = []; // max ładowanie [MWh]
  const PD: number[] = []; // max rozładowanie [MWh]
  
  for (let t = 0; t < n; t++) {
    // Magazyn może ładować z sieci niezależnie od zużycia (ograniczenie tylko mocą magazynu)
    PC[t] = PG;
    // Magazyn może rozładowywać do zużycia (ograniczenie: min(moc magazynu, zużycie))
    PD[t] = Math.min(PG, L[t]);
  }
  
  // Guard heuristic - minimalna cena ładowania do tej pory
  const mc: number[] = new Array(n).fill(INF);
  let m = INF;
  for (let t = 0; t < n; t++) {
    if (PC[t] > 1e-12) {
      m = Math.min(m, P[t]);
    }
    mc[t] = m;
  }
  
  // Debug: wypisz pierwsze 5 godzin
  if (n >= 5) {
    console.log('[DP Debug] Pierwsze 5 godzin:');
    for (let t = 0; t < 5; t++) {
      console.log(`  t=${t}: L=${L[t].toFixed(2)} MWh, P=${P[t].toFixed(2)} PLN/MWh, PC=${PC[t].toFixed(2)} MWh, PD=${PD[t].toFixed(2)} MWh, mc=${mc[t].toFixed(2)}, guard_threshold=${(mc[t]/ETA).toFixed(2)}`);
    }
  }
  
  // Dyskretyzacja SoC
  const socLevels: number[] = [];
  for (let s = SM; s <= SX + 1e-9; s += SOC_STEP * CAP) {
    socLevels.push(s);
  }
  const NS = socLevels.length;
  
  // DP: C[t][s] = minimalny koszt w godzinie t przy SoC = socLevels[s]
  const C: number[][] = Array.from({ length: n + 1 }, () => new Array(NS).fill(INF));
  const A: number[][] = Array.from({ length: n + 1 }, () => new Array(NS).fill(0)); // akcja: 0=idle, 1=charge, 2=discharge
  
  // Początek tygodnia: SoC = SM
  const s0 = 0; // indeks dla SM
  C[0][s0] = 0;
  
  // Forward pass
  for (let t = 0; t < n; t++) {
    for (let s = 0; s < NS; s++) {
      if (C[t][s] >= INF) continue;
      
      const soc = socLevels[s];
      
      // Akcja 0: idle (ani ładuj, ani rozładowuj)
      const gridBuy0 = L[t];
      const cost0 = gridBuy0 * P[t];
      const sNext0 = s;
      if (C[t + 1][sNext0] > C[t][s] + cost0) {
        C[t + 1][sNext0] = C[t][s] + cost0;
        A[t + 1][sNext0] = 0;
      }
      
      // Akcja 1: charge (ładuj maksymalnie)
      if (PC[t] > 1e-12) {
        const maxCharge = Math.min(PC[t], (SX - soc) / ETA);
        if (maxCharge > 1e-12) {
          const gridBuy1 = L[t] + maxCharge;
          const cost1 = gridBuy1 * P[t];
          const socNew1 = soc + maxCharge * ETA;
          const sNext1 = Math.round((socNew1 - SM) / (SOC_STEP * CAP));
          if (sNext1 >= 0 && sNext1 < NS) {
            if (C[t + 1][sNext1] > C[t][s] + cost1) {
              C[t + 1][sNext1] = C[t][s] + cost1;
              A[t + 1][sNext1] = 1;
            }
          }
        }
      }
      
      // Akcja 2: discharge (rozładuj maksymalnie)
      // Guard: nie rozładowuj jeśli cena < mc[t] / ETA (koszt efektywny energii w baterii)
      // mc[t] = minimalna cena ładowania, mc[t]/ETA = rzeczywisty koszt 1 MWh energii w baterii
      if (PD[t] > 1e-12 && P[t] >= mc[t] / ETA) {
        const maxDischarge = Math.min(PD[t], soc - SM);
        if (maxDischarge > 1e-12) {
          const gridBuy2 = Math.max(0, L[t] - maxDischarge);
          const cost2 = gridBuy2 * P[t];
          const socNew2 = soc - maxDischarge;
          const sNext2 = Math.round((socNew2 - SM) / (SOC_STEP * CAP));
          if (sNext2 >= 0 && sNext2 < NS) {
            if (C[t + 1][sNext2] > C[t][s] + cost2) {
              C[t + 1][sNext2] = C[t][s] + cost2;
              A[t + 1][sNext2] = 2;
            }
          }
        }
      }
    }
  }
  
  // Koniec tygodnia: wybierz najtańszy stan końcowy (dowolny SoC)
  let sFinal = 0;
  let minCost = C[n][0];
  for (let s = 0; s < NS; s++) {
    if (C[n][s] < minCost) {
      minCost = C[n][s];
      sFinal = s;
    }
  }
  
  if (minCost >= INF) {
    console.warn(`Tydzień ${weekKey}: Nie znaleziono optymalnego rozwiązania, używam strategii idle`);
    // Fallback: idle przez cały tydzień
    return {
      Ch: new Array(n).fill(0),
      Ds: new Array(n).fill(0),
      SOC: new Array(n + 1).fill(SM),
      cost: L.reduce((sum, load, t) => sum + load * P[t], 0),
    };
  }
  
  // Backward pass - rekonstrukcja optymalnego planu
  const Ch: number[] = new Array(n).fill(0);
  const Ds: number[] = new Array(n).fill(0);
  const SOC: number[] = new Array(n + 1);
  SOC[n] = SM;
  
  let s = sFinal;
  for (let t = n - 1; t >= 0; t--) {
    const action = A[t + 1][s];
    const soc = socLevels[s];
    
    if (action === 0) {
      // idle
      Ch[t] = 0;
      Ds[t] = 0;
      SOC[t] = soc;
    } else if (action === 1) {
      // charge
      const maxCharge = Math.min(PC[t], (SX - soc) / ETA);
      Ch[t] = maxCharge;
      Ds[t] = 0;
      const socPrev = soc - maxCharge * ETA;
      SOC[t] = socPrev;
      s = Math.round((socPrev - SM) / (SOC_STEP * CAP));
    } else if (action === 2) {
      // discharge
      const maxDischarge = Math.min(PD[t], soc - SM);
      Ch[t] = 0;
      Ds[t] = maxDischarge;
      const socPrev = soc + maxDischarge;
      SOC[t] = socPrev;
      s = Math.round((socPrev - SM) / (SOC_STEP * CAP));
    }
  }
  
  // Korekta trajektorii SoC (pilnowanie limitów SM i SX)
  for (let t = 0; t <= n; t++) {
    SOC[t] = Math.max(SM, Math.min(SX, SOC[t]));
  }
  
  return {
    Ch,
    Ds,
    SOC,
    cost: C[n][sFinal],
  };
}

/**
 * Główna funkcja optymalizacji - tydzień po tygodniu
 */
export function optimizeBehindMeter(
  hourlyData: HourlyData[],
  params: BatteryParams
): OptimizationResult {
  console.log('[optimizeBehindMeter] START');
  console.log(`  hourlyData.length=${hourlyData.length}`);
  console.log(`  params:`, params);
  
  const { capacityMwh, socMin, socMax, efficiency, distributionCostPlnMwh } = params;
  
  // Grupowanie po tygodniach (YYYY-Www)
  const weekGroups = new Map<string, HourlyData[]>();
  for (const item of hourlyData) {
    // Oblicz numer tygodnia ISO 8601
    const date = new Date(item.date);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.floor(dayOfYear / 7) + 1;
    const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    
    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, []);
    }
    weekGroups.get(weekKey)!.push(item);
  }
  
  let totalCostWithBattery = 0;
  let totalCostWithoutBattery = 0;
  let totalEnergyCharged = 0;
  let totalEnergyDischarged = 0;
  let totalEnergyValueWithBattery = 0;
  let totalEnergyValueWithoutBattery = 0;
  const allHourlyDetails: HourlySimulationDetail[] = [];
  
  // Przetwarzanie tydzień po tygodniu
  for (const [weekKey, weekData] of Array.from(weekGroups.entries()).sort()) {
    // Sortuj po dacie i godzinie
    weekData.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.hour - b.hour;
    });
    
    const P = weekData.map(h => h.priceRdnPlnMwh);
    const L = weekData.map(h => h.consumptionMwh);
    
    // Solver DP dla tygodnia
    const result = solveWeek(weekKey, P, L, params);
    
    // Agregacja wyników
    totalEnergyCharged += result.Ch.reduce((sum, v) => sum + v, 0);
    totalEnergyDischarged += result.Ds.reduce((sum, v) => sum + v, 0);
    
    // Koszt bez magazynu i z magazynem
    for (let t = 0; t < weekData.length; t++) {
      const item = weekData[t];
      
      // Koszt bez magazynu (zużycie × (cena RDN + dystrybucja))
      const costWithoutBattery = item.consumptionMwh * (item.priceRdnPlnMwh + distributionCostPlnMwh);
      totalCostWithoutBattery += costWithoutBattery;
      totalEnergyValueWithoutBattery += item.consumptionMwh * item.priceRdnPlnMwh;
      
      // Koszt z magazynem
      const gridImport = item.consumptionMwh + result.Ch[t] - result.Ds[t];
      const costWithBattery = gridImport * (item.priceRdnPlnMwh + distributionCostPlnMwh);
      totalCostWithBattery += costWithBattery;
      
      // Wartość energii z magazynem (bez dystrybucji)
      totalEnergyValueWithBattery += gridImport * item.priceRdnPlnMwh;
      
      // Szczegóły godzinowe
      const pBatMw = result.Ch[t] > 0 ? result.Ch[t] : -result.Ds[t];
      allHourlyDetails.push({
        date: item.date,
        hour: item.hour,
        priceRdnPlnMwh: item.priceRdnPlnMwh,
        loadMwh: item.consumptionMwh,
        chargeMwh: result.Ch[t],
        dischargeMwh: result.Ds[t],
        pBatMw,
        socEndMwh: result.SOC[t + 1],
        gridImportMwh: gridImport,
        hourCostPln: costWithBattery,
        energiaBezMagPln: costWithoutBattery,
      });
    }
  }
  
  const usableCapacityMwh = capacityMwh * (socMax - socMin);
  const numberOfCycles = totalEnergyDischarged / usableCapacityMwh;
  
  return {
    totalCostWithoutBatteryPln: totalCostWithoutBattery,
    totalCostWithBatteryPln: totalCostWithBattery,
    totalSavingsPln: totalCostWithoutBattery - totalCostWithBattery,
    energyChargedMwh: totalEnergyCharged,
    energyDischargedMwh: totalEnergyDischarged,
    numberOfCycles,
    hourlyDetails: allHourlyDetails,
    totalEnergyValueWithBatteryPln: totalEnergyValueWithBattery,
  };
}
