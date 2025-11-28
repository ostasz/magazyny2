import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { StorageCalculator } from "./calculator";
import { b2bRouter } from "./b2bRouter";
import { behindMeterRouter } from "./behindMeterRouter";
import { authRouter } from "./routers/auth";

// Schema walidacji dla parametrów kalkulacji
const calculationParamsSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  maxCyclesPerDay: z.number().int().min(1).max(10),
  minSpreadPlnMwh: z.number().min(0),
  capacityMwh: z.number().min(0.1),
  powerMw: z.number().min(0.01),
  socMin: z.number().min(0).max(1),
  socMax: z.number().min(0).max(1),
  efficiency: z.number().min(0).max(1),
  distributionCostPlnMwh: z.number().min(0),
});

// Schema dla danych cenowych RDN
const rdnPriceSchema = z.object({
  date: z.string(), // format YYYY-MM-DD
  hour: z.number().int().min(1).max(24),
  priceRdnPlnMwh: z.number(),
});

// Funkcja pomocnicza do uruchomienia kalkulatora TypeScript
async function runCalculator(params: any, prices: any[]): Promise<any> {
  try {
    const calculator = new StorageCalculator(params, prices);
    const result = calculator.calculate();
    return result;
  } catch (error) {
    throw new Error(`Calculator error: ${error}`);
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  calculator: router({
    // Utworzenie nowej kalkulacji - używa globalnych cen RDN
    calculate: protectedProcedure
      .input(z.object({
        params: calculationParamsSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const { params } = input;

        // Pobierz globalne ceny RDN (ostatnie 365 dni)
        const globalPrices = await db.getGlobalRdnPrices(365);
        if (globalPrices.length === 0) {
          throw new Error("Brak globalnych cen RDN. Skontaktuj się z administratorem.");
        }

        // Konwersja do formatu dla kalkulatora
        const prices = globalPrices.map(p => ({
          date: p.date.toISOString().split('T')[0],
          hour: p.hour,
          priceRdnPlnMwh: p.priceRdnPlnMwh,
        }));

        // Walidacja: socMax musi być >= socMin
        if (params.socMax < params.socMin) {
          throw new Error("SoC max musi być większy lub równy SoC min");
        }

        // Przygotowanie danych dla kalkulatora Python
        const pythonParams = {
          max_cycles_per_day: params.maxCyclesPerDay,
          min_spread_pln_mwh: params.minSpreadPlnMwh,
          capacity_mwh: params.capacityMwh,
          power_mw: params.powerMw,
          soc_min: params.socMin,
          soc_max: params.socMax,
          efficiency: params.efficiency,
          distribution_cost_pln_mwh: params.distributionCostPlnMwh,
          tie_policy: 'earliest',
        };

        const pythonPrices = prices.map(p => ({
          date: p.date,
          hour: p.hour,
          price_rdn_pln_mwh: p.priceRdnPlnMwh,
        }));

        // Uruchomienie kalkulatora
        const result = await runCalculator(pythonParams, pythonPrices);

        // Przygotowanie danych do zapisu w bazie
        const dates = prices.map(p => new Date(p.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        // Utworzenie rekordu kalkulacji
        const calculationId = await db.createCalculation({
          userId: ctx.user.id,
          name: params.name,
          maxCyclesPerDay: params.maxCyclesPerDay,
          minSpreadPlnMwh: params.minSpreadPlnMwh,
          capacityMwh: params.capacityMwh,
          powerMw: params.powerMw,
          socMin: params.socMin,
          socMax: params.socMax,
          efficiency: params.efficiency,
          distributionCostPlnMwh: params.distributionCostPlnMwh,

          // KPI
          avgCyclesPerDay: result.kpi.avg_cycles_per_day,
          avgSpreadPerCyclePln: result.kpi.avg_spread_per_cycle_pln,
          effectiveAvgSpreadPlnMwh: result.kpi.effective_avg_spread_pln_mwh,
          totalEnergyBoughtMwh: result.kpi.total_energy_bought_mwh,
          totalEnergySoldMwh: result.kpi.total_energy_sold_mwh,
          energyLossMwh: result.kpi.energy_loss_mwh,
          totalRevenuePln: result.kpi.total_revenue_pln,

          // Wyniki finansowe
          revenuePln: result.financial.revenue_pln,
          distributionCostPln: result.financial.distribution_cost_pln,
          profitPln: result.financial.profit_pln,

          // Metadata
          rdnDataStartDate: minDate,
          rdnDataEndDate: maxDate,
          rdnDataRowCount: prices.length,
        });

        // Zapisanie cen RDN
        const rdnPricesData = prices.map(p => ({
          calculationId: calculationId as number,
          date: new Date(p.date),
          hour: p.hour,
          priceRdnPlnMwh: p.priceRdnPlnMwh,
        }));
        await db.insertRdnPrices(rdnPricesData);

        // Zapisanie cykli
        const cyclesData = result.cycles
          .filter((c: any) => c.spread_pln > 0) // Pomijamy dni bez cykli
          .map((c: any) => ({
            calculationId: calculationId as number,
            date: new Date(c.date),
            cycleNumber: c.cycle_number,
            chargeStartHour: c.charge_start_hour,
            chargeSumPrice: c.charge_sum_price,
            dischargeStartHour: c.discharge_start_hour,
            dischargeSumPrice: c.discharge_sum_price,
            spreadPln: c.spread_pln,
          }));

        if (cyclesData.length > 0) {
          await db.insertCalculationCycles(cyclesData);
        }

        return {
          calculationId,
          kpi: result.kpi,
          financial: result.financial,
          metadata: result.metadata,
        };
      }),

    // Pobranie listy kalkulacji użytkownika
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const calculations = await db.getCalculationsByUserId(ctx.user.id);
        return calculations;
      }),

    // Pobranie szczegółów kalkulacji
    getById: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        const calculation = await db.getCalculationById(input.id);

        if (!calculation) {
          throw new Error("Kalkulacja nie została znaleziona");
        }

        // Sprawdzenie uprawnień
        if (calculation.userId !== ctx.user.id) {
          throw new Error("Brak uprawnień do tej kalkulacji");
        }

        return calculation;
      }),

    // Pobranie wielu kalkulacji po ID (dla porównania)
    getByIds: protectedProcedure
      .input(z.object({
        ids: z.array(z.number().int().positive()),
      }))
      .query(async ({ ctx, input }) => {
        if (input.ids.length === 0) return [];

        const calculations = await db.getCalculationsByIds(input.ids);

        // Filtruj tylko kalkulacje należące do użytkownika
        const userCalculations = calculations.filter(c => c.userId === ctx.user.id);

        return userCalculations;
      }),

    // Pobranie cykli dla kalkulacji
    getCycles: protectedProcedure
      .input(z.object({
        calculationId: z.number().int().positive(),
        limit: z.number().int().positive().optional().default(100),
        offset: z.number().int().nonnegative().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        // Sprawdzenie uprawnień
        const calculation = await db.getCalculationById(input.calculationId);
        if (!calculation || calculation.userId !== ctx.user.id) {
          throw new Error("Brak uprawnień do tej kalkulacji");
        }

        const allCycles = await db.getCalculationCyclesByCalculationId(input.calculationId);

        // Paginacja
        const total = allCycles.length;
        const cycles = allCycles.slice(input.offset, input.offset + input.limit);

        return {
          cycles,
          total,
          hasMore: input.offset + input.limit < total,
        };
      }),

    // Pobranie cen RDN dla kalkulacji
    getRdnPrices: protectedProcedure
      .input(z.object({
        calculationId: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        // Sprawdzenie uprawnień
        const calculation = await db.getCalculationById(input.calculationId);
        if (!calculation || calculation.userId !== ctx.user.id) {
          throw new Error("Brak uprawnień do tej kalkulacji");
        }

        const prices = await db.getRdnPricesByCalculationId(input.calculationId);
        return prices;
      }),

    // Pobranie średnich cen RDN dla każdej godziny doby + typowe godziny ładowania/rozładowania
    getHourlyAverages: protectedProcedure
      .input(z.object({
        calculationId: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        // Sprawdzenie uprawnień
        const calculation = await db.getCalculationById(input.calculationId);
        if (!calculation || calculation.userId !== ctx.user.id) {
          throw new Error("Brak uprawnień do tej kalkulacji");
        }

        // Pobierz wszystkie ceny RDN dla tej kalkulacji
        const prices = await db.getRdnPricesByCalculationId(input.calculationId);

        // Agreguj średnie ceny dla każdej godziny (1-24)
        const hourlyData = new Map<number, { sum: number; count: number }>();

        for (const price of prices) {
          const existing = hourlyData.get(price.hour) || { sum: 0, count: 0 };
          existing.sum += price.priceRdnPlnMwh;
          existing.count += 1;
          hourlyData.set(price.hour, existing);
        }

        // Oblicz średnie
        const hourlyAverages = Array.from(hourlyData.entries())
          .map(([hour, data]) => ({
            hour,
            avgPrice: data.sum / data.count,
          }))
          .sort((a, b) => a.hour - b.hour);

        // Pobierz cykle aby znaleźć typowe godziny ładowania/rozładowania
        const cycles = await db.getCalculationCyclesByCalculationId(input.calculationId);

        // Zlicz częstość występowania każdej godziny jako początek ładowania/rozładowania
        const chargeHourCount = new Map<number, number>();
        const dischargeHourCount = new Map<number, number>();

        for (const cycle of cycles) {
          chargeHourCount.set(cycle.chargeStartHour, (chargeHourCount.get(cycle.chargeStartHour) || 0) + 1);
          dischargeHourCount.set(cycle.dischargeStartHour, (dischargeHourCount.get(cycle.dischargeStartHour) || 0) + 1);
        }

        // Znajdź najczęstsze godziny (top 5)
        const topChargeHours = Array.from(chargeHourCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([hour]) => hour);

        const topDischargeHours = Array.from(dischargeHourCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([hour]) => hour);

        return {
          hourlyAverages,
          chargeHours: topChargeHours,
          dischargeHours: topDischargeHours,
        };
      }),

    // Generowanie raportu PDF
    generatePDF: protectedProcedure
      .input(z.object({
        calculationId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Sprawdzenie uprawnień
        const calculation = await db.getCalculationById(input.calculationId);
        if (!calculation || calculation.userId !== ctx.user.id) {
          throw new Error("Brak uprawnień do tej kalkulacji");
        }

        // Pobranie metadanych RDN
        const rdnMetadata = await db.getGlobalRdnPricesMetadata();

        // Pobranie danych miesięcznych
        const allCycles = await db.getCalculationCyclesByCalculationId(input.calculationId);

        // Pobranie danych godzinowych
        const hourlyData = await db.getHourlyAverages(input.calculationId);

        // Agregacja danych po miesiącach
        const monthlyMap = new Map<string, { cycleCount: number; revenue: number; distributionCost: number; profit: number }>();

        allCycles.forEach(cycle => {
          // Użycie UTC aby uniknąć problemów ze strefą czasową
          const d = new Date(cycle.date);
          const monthNames = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
          const monthKey = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { cycleCount: 0, revenue: 0, distributionCost: 0, profit: 0 });
          }

          const monthData = monthlyMap.get(monthKey)!;
          monthData.cycleCount++;
          monthData.revenue += cycle.spreadPln;

          // Obliczenie kosztów dystrybucji dla cyklu
          const energyBought = calculation.capacityMwh * (calculation.socMax - calculation.socMin);
          const energySold = energyBought * calculation.efficiency;
          const cycleCost = (energyBought - energySold) * calculation.distributionCostPlnMwh;

          monthData.distributionCost += cycleCost;
          monthData.profit += cycle.spreadPln - cycleCost;
        });

        // Konwersja Map do Array i sortowanie chronologiczne
        const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
          month,
          ...data,
        })).sort((a, b) => {
          // Parsowanie nazw miesięcy do dat w celu sortowania chronologicznego
          const monthNames: { [key: string]: number } = {
            'styczeń': 0, 'luty': 1, 'marzec': 2, 'kwiecień': 3,
            'maj': 4, 'czerwiec': 5, 'lipiec': 6, 'sierpień': 7,
            'wrzesień': 8, 'październik': 9, 'listopad': 10, 'grudzień': 11
          };

          // Wyodrębnienie nazwy miesiąca i roku z formatu "miesiąc rok"
          const parseMonthYear = (monthStr: string) => {
            const parts = monthStr.split(' ');
            const monthName = parts[0];
            const year = parseInt(parts[1]);
            const monthIndex = monthNames[monthName] ?? 0;
            return new Date(year, monthIndex, 1);
          };

          const dateA = parseMonthYear(a.month);
          const dateB = parseMonthYear(b.month);

          return dateA.getTime() - dateB.getTime();
        });

        // Import generatora PDF
        const { generatePDFReport } = await import('./pdfGenerator');

        // Przygotowanie danych dla generatora PDF
        const pdfData = {
          name: calculation.name,
          createdAt: calculation.createdAt,
          preparedBy: ctx.user.name || ctx.user.email || 'Administrator',

          // Parametry
          maxCyclesPerDay: calculation.maxCyclesPerDay,
          minSpreadPlnMwh: calculation.minSpreadPlnMwh,
          capacityMwh: calculation.capacityMwh,
          powerMw: calculation.powerMw,
          socMin: calculation.socMin,
          socMax: calculation.socMax,
          efficiency: calculation.efficiency,
          distributionCostPlnMwh: calculation.distributionCostPlnMwh,

          // KPI
          avgCyclesPerDay: calculation.avgCyclesPerDay ?? 0,
          avgSpreadPerCyclePln: calculation.avgSpreadPerCyclePln ?? 0,
          effectiveAvgSpreadPlnMwh: calculation.effectiveAvgSpreadPlnMwh ?? 0,
          totalEnergyBoughtMwh: calculation.totalEnergyBoughtMwh ?? 0,
          totalEnergySoldMwh: calculation.totalEnergySoldMwh ?? 0,
          energyLossMwh: calculation.energyLossMwh ?? 0,
          totalRevenuePln: calculation.totalRevenuePln ?? 0,

          // Wyniki finansowe
          revenuePln: calculation.revenuePln ?? 0,
          distributionCostPln: calculation.distributionCostPln ?? 0,
          profitPln: calculation.profitPln ?? 0,

          // Dane miesięczne
          monthlyData,

          // Metadane RDN
          rdnDataStartDate: rdnMetadata?.startDate,
          rdnDataEndDate: rdnMetadata?.endDate,

          // Dane godzinowe
          hourlyAverages: hourlyData,
        };

        // Generowanie PDF
        console.log('[PDF] Starting PDF generation for calculation:', calculation.id);
        const pdfBuffer = await generatePDFReport(pdfData);
        console.log('[PDF] PDF buffer size:', pdfBuffer.length, 'bytes');

        // Zwracanie PDF jako base64
        const base64 = pdfBuffer.toString('base64');
        console.log('[PDF] Base64 length:', base64.length, 'characters');

        return {
          pdf: base64,
          filename: `raport-${calculation.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`,
        };
      }),
  }),

  // Admin router - tylko dla administratorów
  admin: router({
    // Upload globalnych cen RDN (tylko admin)
    uploadGlobalRdnPrices: protectedProcedure
      .input(z.object({
        prices: z.array(rdnPriceSchema).min(1, "Wymagane są dane cenowe"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Sprawdzenie czy użytkownik jest adminem
        if (ctx.user.role !== 'admin') {
          throw new Error("Brak uprawnień administratora");
        }

        // Usuń stare ceny
        await db.clearGlobalRdnPrices();

        // Przygotuj dane do wstawienia
        const pricesData = input.prices.map(p => ({
          date: new Date(p.date),
          hour: p.hour,
          priceRdnPlnMwh: p.priceRdnPlnMwh,
          uploadedBy: ctx.user.id,
        }));

        // Wstaw nowe ceny
        await db.insertGlobalRdnPrices(pricesData);

        return {
          success: true,
          count: pricesData.length,
        };
      }),

    // Pobranie metadanych globalnych cen RDN
    getGlobalRdnPricesMetadata: publicProcedure
      .query(async () => {
        const metadata = await db.getGlobalRdnPricesMetadata();
        return metadata;
      }),
  }),

  // Router dla użytkowników - korzystają z globalnych cen
  prices: router({
    // Pobranie globalnych cen RDN
    getGlobalPrices: protectedProcedure
      .query(async () => {
        const prices = await db.getGlobalRdnPrices();
        return prices;
      }),
  }),

  // Router dla zgłaszeń błędów
  bugReports: router({
    // Utworzenie nowego zgłoszenia
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1, "Tytuł jest wymagany").max(255),
        description: z.string().min(1, "Opis jest wymagany"),
        pageUrl: z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendBugReportEmail } = await import('./email');

        // Zapisz zgłoszenie w bazie
        await db.createBugReport({
          userId: ctx.user.id,
          userName: ctx.user.name || 'Unknown',
          userEmail: ctx.user.email || 'unknown@example.com',
          title: input.title,
          description: input.description,
          pageUrl: input.pageUrl,
          userAgent: input.userAgent,
        });

        // Wysłanie emaila
        const emailSent = await sendBugReportEmail({
          userName: ctx.user.name || 'Unknown',
          userEmail: ctx.user.email || 'unknown@example.com',
          title: input.title,
          description: input.description,
          pageUrl: input.pageUrl,
          userAgent: input.userAgent,
          createdAt: new Date(),
        });

        return {
          success: true,
          emailSent,
        };
      }),

    // Pobranie wszystkich zgłoszeń (tylko dla adminów)
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error("Brak uprawnień");
        }

        const reports = await db.getAllBugReports();
        return reports;
      }),

    // Aktualizacja statusu zgłoszenia (tylko dla adminów)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "in_progress", "resolved", "closed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error("Brak uprawnień");
        }

        await db.updateBugReportStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // B2B router - dobieranie wielkości magazynu
  b2b: b2bRouter,

  // Behind-the-meter router - symulacja rentowności za licznikiem
  behindMeter: behindMeterRouter,
});

export type AppRouter = typeof appRouter;
