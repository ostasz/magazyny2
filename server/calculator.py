#!/usr/bin/env python3
"""
Moduł obliczający rentowność magazynu energii na podstawie cen RDN.
Port algorytmu z Excel Python do aplikacji webowej.
"""

import sys
import json
from math import floor
from typing import List, Dict, Any, Tuple, Optional

EPS = 1e-12

class StorageCalculator:
    def __init__(self, params: Dict[str, Any], prices_data: List[Dict[str, Any]]):
        """
        Inicjalizacja kalkulatora.
        
        params: {
            'max_cycles_per_day': int,
            'min_spread_pln_mwh': float,
            'capacity_mwh': float,
            'power_mw': float,
            'soc_min': float (0-1),
            'soc_max': float (0-1),
            'efficiency': float (0-1),
            'distribution_cost_pln_mwh': float,
            'tie_policy': str ('earliest' or 'latest')
        }
        
        prices_data: [
            {'date': 'YYYY-MM-DD', 'hour': 1-24, 'price_rdn_pln_mwh': float},
            ...
        ]
        """
        self.K = int(params.get('max_cycles_per_day', 1))
        self.min_spread_pln = float(params.get('min_spread_pln_mwh', 0.0))
        self.cap_mwh = float(params.get('capacity_mwh', 1.0))
        self.power_mw = float(params.get('power_mw', 1.0))
        self.soc_min = max(0.0, min(1.0, float(params.get('soc_min', 0.0))))
        self.soc_max = max(self.soc_min, min(1.0, float(params.get('soc_max', 1.0))))
        self.efficiency = max(0.0, min(1.0, float(params.get('efficiency', 1.0))))
        self.power_mw = max(self.power_mw, 1e-9)
        self.distribution_cost = float(params.get('distribution_cost_pln_mwh', 0.0))
        self.tie_policy = params.get('tie_policy', 'earliest')
        
        # Obliczenia pomocnicze
        self.usable_mwh = self.cap_mwh * (self.soc_max - self.soc_min)
        L_real = self.usable_mwh / self.power_mw
        self.k_full = int(floor(L_real))
        self.frac = max(0.0, L_real - self.k_full)
        
        # Przetworzenie danych cenowych
        self.prices_by_day = self._process_prices(prices_data)
    
    def _process_prices(self, prices_data: List[Dict[str, Any]]) -> Dict[str, List[float]]:
        """Grupuje ceny według dni."""
        prices_by_day = {}
        for item in prices_data:
            date = item['date']
            hour = int(item['hour'])
            price = float(item['price_rdn_pln_mwh'])
            
            if date not in prices_by_day:
                prices_by_day[date] = [0.0] * 24
            
            # hour jest 1-24, indeks tablicy 0-23
            if 1 <= hour <= 24:
                prices_by_day[date][hour - 1] = price
        
        return prices_by_day
    
    def _prefer(self, a: int, b: Optional[int]) -> bool:
        """Polityka wyboru przy równych zyskach."""
        if b is None:
            return True
        return (a < b) if self.tie_policy == 'earliest' else (a > b)
    
    def _weighted_block_sum(self, prices: List[float], start_h: int, k_full: int, frac: float) -> Tuple[Optional[float], Optional[int]]:
        """
        Oblicza sumę ważoną cen dla bloku godzin.
        start_h: 1-24
        Zwraca: (suma_cen, ostatnia_użyta_godzina)
        """
        n = len(prices)
        used_hours = k_full + (1 if frac > 0 else 0)
        last_h = start_h + used_hours - 1
        
        if last_h > n:
            return None, None
        
        total = 0.0
        for h in range(start_h, start_h + k_full):
            total += prices[h - 1]
        
        if frac > 0:
            total += prices[start_h + k_full - 1] * frac
        
        return total, last_h
    
    def _best_k_pairs_day(self, prices: List[float]) -> List[Tuple[int, float, int, float, float]]:
        """
        Znajduje optymalne K par (ładowanie->rozładowanie) dla danego dnia.
        Zwraca: [(charge_start_h, charge_sum, discharge_start_h, discharge_sum, spread_pln), ...]
        """
        n = len(prices)
        if n == 0 or self.K <= 0:
            return []
        
        used_hours = self.k_full + (1 if self.frac > 0 else 0)
        max_start = n - used_hours + 1
        
        if max_start < 1:
            return []
        
        # Generowanie wszystkich możliwych interwałów
        intervals = []  # (end_time, start_time, profit_pln, buy_start_h, sell_start_h, buy_sum, sell_sum)
        
        for ch in range(1, max_start + 1):
            buy_sum, buy_last = self._weighted_block_sum(prices, ch, self.k_full, self.frac)
            if buy_sum is None:
                continue
            
            for sd in range(buy_last + 1, max_start + 1):
                sell_sum, sell_last = self._weighted_block_sum(prices, sd, self.k_full, self.frac)
                if sell_sum is None:
                    continue
                
                profit_pln = self.power_mw * (self.efficiency * sell_sum - buy_sum)
                
                if profit_pln + EPS < self.min_spread_pln:
                    continue
                
                intervals.append((sell_last, ch, float(profit_pln), int(ch), int(sd), float(buy_sum), float(sell_sum)))
        
        if not intervals:
            return []
        
        # Sortowanie interwałów
        intervals.sort(key=lambda x: (x[0], x[1]))
        m = len(intervals)
        starts = [iv[1] for iv in intervals]
        ends = [iv[0] for iv in intervals]
        
        # p[i]: ostatni interwał kończący się przed start_i
        p = [-1] * m
        for i in range(m):
            j = i - 1
            while j >= 0 and ends[j] >= starts[i]:
                j -= 1
            p[i] = j
        
        # Programowanie dynamiczne z limitem K
        dp = [[0.0] * m for _ in range(self.K + 1)]
        take = [[False] * m for _ in range(self.K + 1)]
        
        for k in range(1, self.K + 1):
            for i in range(m):
                best = dp[k][i - 1] if i > 0 else 0.0
                with_i = intervals[i][2] + (dp[k - 1][p[i]] if p[i] >= 0 else 0.0)
                
                if (with_i > best + EPS) or (abs(with_i - best) <= EPS and self._prefer(intervals[i][0], None)):
                    dp[k][i] = with_i
                    take[k][i] = True
                else:
                    dp[k][i] = best
                    take[k][i] = False
        
        # Rekonstrukcja rozwiązania
        res = []
        k, i = self.K, m - 1
        while k > 0 and i >= 0:
            if take[k][i]:
                end_t, start_t, profit_pln, ch, sd, buy_sum, sell_sum = intervals[i]
                res.append((ch, buy_sum, sd, sell_sum, profit_pln))
                i = p[i]
                k -= 1
            else:
                i -= 1
        
        res.reverse()
        return res
    
    def calculate(self) -> Dict[str, Any]:
        """
        Wykonuje obliczenia dla wszystkich dni.
        Zwraca słownik z KPI, wynikami finansowymi i szczegółami cykli.
        """
        cycles = []
        total_cycles = 0
        total_spread_pln = 0.0
        days = 0
        
        dates = sorted(self.prices_by_day.keys())
        
        for date in dates:
            days += 1
            prices = self.prices_by_day[date]
            pairs = self._best_k_pairs_day(prices)
            
            if not pairs:
                # Brak rentownych cykli tego dnia
                cycles.append({
                    'date': date,
                    'cycle_number': 1,
                    'charge_start_hour': 0,
                    'charge_sum_price': 0,
                    'discharge_start_hour': 0,
                    'discharge_sum_price': 0,
                    'spread_pln': 0
                })
            else:
                total_cycles += len(pairs)
                for i, (ch, bsum, sd, ssum, prof) in enumerate(pairs, start=1):
                    cycles.append({
                        'date': date,
                        'cycle_number': i,
                        'charge_start_hour': ch,
                        'charge_sum_price': bsum,
                        'discharge_start_hour': sd,
                        'discharge_sum_price': ssum,
                        'spread_pln': prof
                    })
                    total_spread_pln += prof
        
        # Obliczenia KPI
        total_energy_bought_mwh = total_cycles * self.usable_mwh
        total_energy_sold_mwh = total_cycles * self.usable_mwh * self.efficiency
        energy_loss_mwh = total_energy_bought_mwh - total_energy_sold_mwh
        
        avg_cycles_per_day = (total_cycles / days) if days > 0 else 0.0
        avg_spread_per_cycle = (total_spread_pln / total_cycles) if total_cycles > 0 else 0.0
        total_revenue = total_spread_pln
        eff_avg_spread_pln_per_mwh = (total_revenue / total_energy_bought_mwh) if total_energy_bought_mwh > 0 else 0.0
        
        # Wyniki finansowe
        distribution_cost_pln = total_energy_sold_mwh * self.distribution_cost
        profit_pln = total_revenue - distribution_cost_pln
        
        return {
            'kpi': {
                'power_mw': self.power_mw,
                'capacity_mwh': self.cap_mwh,
                'soc_min': self.soc_min,
                'soc_max': self.soc_max,
                'efficiency': self.efficiency,
                'max_cycles': self.K,
                'avg_cycles_per_day': avg_cycles_per_day,
                'avg_spread_per_cycle_pln': avg_spread_per_cycle,
                'effective_avg_spread_pln_mwh': eff_avg_spread_pln_per_mwh,
                'total_energy_bought_mwh': total_energy_bought_mwh,
                'total_energy_sold_mwh': total_energy_sold_mwh,
                'energy_loss_mwh': energy_loss_mwh,
                'total_revenue_pln': total_revenue
            },
            'financial': {
                'revenue_pln': total_revenue,
                'distribution_cost_pln': distribution_cost_pln,
                'profit_pln': profit_pln
            },
            'cycles': cycles,
            'metadata': {
                'total_days': days,
                'total_cycles': total_cycles,
                'start_date': dates[0] if dates else None,
                'end_date': dates[-1] if dates else None
            }
        }


def main():
    """Funkcja główna - odczytuje JSON z stdin i zwraca wyniki do stdout."""
    try:
        input_data = json.loads(sys.stdin.read())
        
        params = input_data['params']
        prices_data = input_data['prices']
        
        calculator = StorageCalculator(params, prices_data)
        result = calculator.calculate()
        
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
