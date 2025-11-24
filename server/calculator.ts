/**
 * Moduł obliczający rentowność magazynu energii na podstawie cen RDN.
 * Port algorytmu z Python do TypeScript.
 */

const EPS = 1e-12;

interface CalculatorParams {
  max_cycles_per_day: number;
  min_spread_pln_mwh: number;
  capacity_mwh: number;
  power_mw: number;
  soc_min: number;
  soc_max: number;
  efficiency: number;
  distribution_cost_pln_mwh: number;
  tie_policy?: 'earliest' | 'latest';
}

interface PriceData {
  date: string;
  hour: number;
  price_rdn_pln_mwh: number;
}

interface CycleResult {
  date: string;
  cycle_number: number;
  charge_start_hour: number;
  charge_sum_price: number;
  discharge_start_hour: number;
  discharge_sum_price: number;
  spread_pln: number;
}

interface CalculationResult {
  kpi: {
    power_mw: number;
    capacity_mwh: number;
    soc_min: number;
    soc_max: number;
    efficiency: number;
    max_cycles: number;
    avg_cycles_per_day: number;
    avg_spread_per_cycle_pln: number;
    effective_avg_spread_pln_mwh: number;
    total_energy_bought_mwh: number;
    total_energy_sold_mwh: number;
    energy_loss_mwh: number;
    total_revenue_pln: number;
  };
  financial: {
    revenue_pln: number;
    distribution_cost_pln: number;
    profit_pln: number;
  };
  cycles: CycleResult[];
  metadata: {
    total_days: number;
    total_cycles: number;
    start_date: string | null;
    end_date: string | null;
  };
}

export class StorageCalculator {
  private K: number;
  private minSpreadPln: number;
  private capMwh: number;
  private powerMw: number;
  private socMin: number;
  private socMax: number;
  private efficiency: number;
  private distributionCost: number;
  private tiePolicy: 'earliest' | 'latest';
  private usableMwh: number;
  private kFull: number;
  private frac: number;
  private pricesByDay: Map<string, number[]>;

  constructor(params: CalculatorParams, pricesData: PriceData[]) {
    this.K = Math.floor(params.max_cycles_per_day);
    this.minSpreadPln = params.min_spread_pln_mwh;
    this.capMwh = params.capacity_mwh;
    this.powerMw = Math.max(params.power_mw, 1e-9);
    this.socMin = Math.max(0, Math.min(1, params.soc_min));
    this.socMax = Math.max(this.socMin, Math.min(1, params.soc_max));
    this.efficiency = Math.max(0, Math.min(1, params.efficiency));
    this.distributionCost = params.distribution_cost_pln_mwh;
    this.tiePolicy = params.tie_policy || 'earliest';

    // Obliczenia pomocnicze
    this.usableMwh = this.capMwh * (this.socMax - this.socMin);
    const LReal = this.usableMwh / this.powerMw;
    this.kFull = Math.floor(LReal);
    this.frac = Math.max(0, LReal - this.kFull);

    // Przetworzenie danych cenowych
    this.pricesByDay = this.processPrices(pricesData);
  }

  private processPrices(pricesData: PriceData[]): Map<string, number[]> {
    const pricesByDay = new Map<string, number[]>();

    for (const item of pricesData) {
      const date = item.date;
      const hour = item.hour;
      const price = item.price_rdn_pln_mwh;

      if (!pricesByDay.has(date)) {
        pricesByDay.set(date, new Array(24).fill(0));
      }

      const dayPrices = pricesByDay.get(date)!;
      if (hour >= 1 && hour <= 24) {
        dayPrices[hour - 1] = price;
      }
    }

    return pricesByDay;
  }

  private prefer(a: number, b: number | null): boolean {
    if (b === null) return true;
    return this.tiePolicy === 'earliest' ? a < b : a > b;
  }

  private weightedBlockSum(
    prices: number[],
    startH: number,
    kFull: number,
    frac: number
  ): [number, number] | [null, null] {
    const n = prices.length;
    const usedHours = kFull + (frac > 0 ? 1 : 0);
    const lastH = startH + usedHours - 1;

    if (lastH > n) {
      return [null, null];
    }

    let total = 0;
    for (let h = startH; h < startH + kFull; h++) {
      total += prices[h - 1];
    }

    if (frac > 0) {
      total += prices[startH + kFull - 1] * frac;
    }

    return [total, lastH];
  }

  private bestKPairsDay(prices: number[]): Array<[number, number, number, number, number]> {
    const n = prices.length;
    if (n === 0 || this.K <= 0) {
      return [];
    }

    const usedHours = this.kFull + (this.frac > 0 ? 1 : 0);
    const maxStart = n - usedHours + 1;

    if (maxStart < 1) {
      return [];
    }

    // Generowanie wszystkich możliwych interwałów
    const intervals: Array<[number, number, number, number, number, number, number]> = [];

    for (let ch = 1; ch <= maxStart; ch++) {
      const [buySum, buyLast] = this.weightedBlockSum(prices, ch, this.kFull, this.frac);
      if (buySum === null) continue;

      for (let sd = buyLast + 1; sd <= maxStart; sd++) {
        const [sellSum, sellLast] = this.weightedBlockSum(prices, sd, this.kFull, this.frac);
        if (sellSum === null) continue;

        const profitPln = this.powerMw * (this.efficiency * sellSum - buySum);

        if (profitPln + EPS < this.minSpreadPln) {
          continue;
        }

        intervals.push([sellLast, ch, profitPln, ch, sd, buySum, sellSum]);
      }
    }

    if (intervals.length === 0) {
      return [];
    }

    // Sortowanie interwałów
    intervals.sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      return a[1] - b[1];
    });

    const m = intervals.length;
    const starts = intervals.map((iv) => iv[1]);
    const ends = intervals.map((iv) => iv[0]);

    // p[i]: ostatni interwał kończący się przed start_i
    const p: number[] = new Array(m).fill(-1);
    for (let i = 0; i < m; i++) {
      let j = i - 1;
      while (j >= 0 && ends[j] >= starts[i]) {
        j--;
      }
      p[i] = j;
    }

    // Programowanie dynamiczne z limitem K
    const dp: number[][] = Array.from({ length: this.K + 1 }, () => new Array(m).fill(0));
    const take: boolean[][] = Array.from({ length: this.K + 1 }, () => new Array(m).fill(false));

    for (let k = 1; k <= this.K; k++) {
      for (let i = 0; i < m; i++) {
        const best = i > 0 ? dp[k][i - 1] : 0;
        const withI = intervals[i][2] + (p[i] >= 0 ? dp[k - 1][p[i]] : 0);

        if (withI > best + EPS || (Math.abs(withI - best) <= EPS && this.prefer(intervals[i][0], null))) {
          dp[k][i] = withI;
          take[k][i] = true;
        } else {
          dp[k][i] = best;
          take[k][i] = false;
        }
      }
    }

    // Rekonstrukcja rozwiązania
    const res: Array<[number, number, number, number, number]> = [];
    let k = this.K;
    let i = m - 1;

    while (k > 0 && i >= 0) {
      if (take[k][i]) {
        const [, , profitPln, ch, sd, buySum, sellSum] = intervals[i];
        res.push([ch, buySum, sd, sellSum, profitPln]);
        i = p[i];
        k--;
      } else {
        i--;
      }
    }

    res.reverse();
    return res;
  }

  public calculate(): CalculationResult {
    const cycles: CycleResult[] = [];
    let totalCycles = 0;
    let totalSpreadPln = 0;
    let days = 0;

    const dates = Array.from(this.pricesByDay.keys()).sort();

    for (const date of dates) {
      days++;
      const prices = this.pricesByDay.get(date)!;
      const pairs = this.bestKPairsDay(prices);

      if (pairs.length === 0) {
        cycles.push({
          date,
          cycle_number: 1,
          charge_start_hour: 0,
          charge_sum_price: 0,
          discharge_start_hour: 0,
          discharge_sum_price: 0,
          spread_pln: 0,
        });
      } else {
        totalCycles += pairs.length;
        for (let i = 0; i < pairs.length; i++) {
          const [ch, bsum, sd, ssum, prof] = pairs[i];
          cycles.push({
            date,
            cycle_number: i + 1,
            charge_start_hour: ch,
            charge_sum_price: bsum,
            discharge_start_hour: sd,
            discharge_sum_price: ssum,
            spread_pln: prof,
          });
          totalSpreadPln += prof;
        }
      }
    }

    // Obliczenia KPI
    const totalEnergyBoughtMwh = totalCycles * this.usableMwh;
    const totalEnergySoldMwh = totalCycles * this.usableMwh * this.efficiency;
    const energyLossMwh = totalEnergyBoughtMwh - totalEnergySoldMwh;

    const avgCyclesPerDay = days > 0 ? totalCycles / days : 0;
    const avgSpreadPerCycle = totalCycles > 0 ? totalSpreadPln / totalCycles : 0;
    const totalRevenue = totalSpreadPln;
    const effAvgSpreadPlnPerMwh = totalEnergyBoughtMwh > 0 ? totalRevenue / totalEnergyBoughtMwh : 0;

    // Wyniki finansowe
    // Koszty dystrybucji = (energia kupiona - energia sprzedana) * koszt
    // To reprezentuje straty energii w magazynie
    const distributionCostPln = (totalEnergyBoughtMwh - totalEnergySoldMwh) * this.distributionCost;
    const profitPln = totalRevenue - distributionCostPln;

    return {
      kpi: {
        power_mw: this.powerMw,
        capacity_mwh: this.capMwh,
        soc_min: this.socMin,
        soc_max: this.socMax,
        efficiency: this.efficiency,
        max_cycles: this.K,
        avg_cycles_per_day: avgCyclesPerDay,
        avg_spread_per_cycle_pln: avgSpreadPerCycle,
        effective_avg_spread_pln_mwh: effAvgSpreadPlnPerMwh,
        total_energy_bought_mwh: totalEnergyBoughtMwh,
        total_energy_sold_mwh: totalEnergySoldMwh,
        energy_loss_mwh: energyLossMwh,
        total_revenue_pln: totalRevenue,
      },
      financial: {
        revenue_pln: totalRevenue,
        distribution_cost_pln: distributionCostPln,
        profit_pln: profitPln,
      },
      cycles,
      metadata: {
        total_days: days,
        total_cycles: totalCycles,
        start_date: dates.length > 0 ? dates[0] : null,
        end_date: dates.length > 0 ? dates[dates.length - 1] : null,
      },
    };
  }
}
