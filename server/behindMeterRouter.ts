import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as XLSX from "xlsx";
import {
  getGlobalRdnPrices,
  saveBehindMeterSimulation,
  getUserBehindMeterSimulations,
  getBehindMeterSimulationById,
} from "./db";
import { calculateEnergyCost } from "./algorithms/behindMeter/calculateEnergyCost";
import { optimizeBehindMeter } from "./algorithms/behindMeter/optimizeBattery";

/**
 * Router dla modułu "Symulacja rentowności za licznikiem"
 */
export const behindMeterRouter = router({
  /**
   * Upload pliku Excel z danymi zużycia i obliczenie wartości energii
   */
  calculate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nazwa symulacji jest wymagana"),
        fileBase64: z.string(),
        capacityMwh: z.number().min(0.1, "Pojemność musi być większa niż 0"),
        powerMw: z.number().min(0.01, "Moc musi być większa niż 0"),
        socMin: z.number().min(0).max(1, "SoC min musi być w zakresie 0-1"),
        socMax: z.number().min(0).max(1, "SoC max musi być w zakresie 0-1"),
        efficiency: z.number().min(0).max(1, "Efektywność musi być w zakresie 0-1"),
        distributionCostPlnMwh: z.number().min(0, "Koszty dystrybucji muszą być nieujemne"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, fileBase64, capacityMwh, powerMw, socMin, socMax, efficiency, distributionCostPlnMwh } = input;

      // Dekodowanie base64
      const buffer = Buffer.from(fileBase64, "base64");

      // Parsowanie pliku Excel
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<{
        Data: string;
        H: number;
        Pobor_MWh: number;
      }>(worksheet);

      // ==== WALIDACJA STRUKTURY ====
      if (data.length === 0) {
        throw new Error("❌ Plik Excel jest pusty. Proszę wgrać plik zawierający dane zużycia energii.");
      }

      const firstRow = data[0];
      const missingColumns: string[] = [];
      if (!firstRow.Data) missingColumns.push('Data');
      if (firstRow.H === undefined) missingColumns.push('H');
      if (firstRow.Pobor_MWh === undefined) missingColumns.push('Pobor_MWh');
      
      if (missingColumns.length > 0) {
        throw new Error(
          `❌ Nieprawidłowa struktura pliku. Brakujące kolumny: ${missingColumns.join(', ')}. \n\nWymagane kolumny:\n- Data: data w formacie YYYY-MM-DD (np. 2024-10-01)\n- H: godzina (1-24)\n- Pobor_MWh: zużycie energii w MWh`
        );
      }

      // ==== PARSOWANIE I WALIDACJA DAT ====
      const parsedData: Array<{
        date: Date;
        hour: number;
        consumptionMwh: number;
        rowIndex: number;
      }> = [];
      
      const errors: string[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 bo Excel zaczyna od 1 i ma nagłówek
        
        // Walidacja daty
        const date = new Date(row.Data);
        if (isNaN(date.getTime())) {
          errors.push(`Wiersz ${rowNum}: Nieprawidłowa data "${row.Data}". Wymagany format: YYYY-MM-DD (np. 2024-10-01)`);
          continue;
        }
        
        // Walidacja godziny
        const hour = Number(row.H);
        if (isNaN(hour) || hour < 1 || hour > 24) {
          errors.push(`Wiersz ${rowNum}: Nieprawidłowa godzina "${row.H}". Wymagana wartość: 1-24`);
          continue;
        }
        
        // Walidacja zużycia
        const consumption = Number(row.Pobor_MWh);
        if (isNaN(consumption)) {
          errors.push(`Wiersz ${rowNum}: Nieprawidłowa wartość zużycia "${row.Pobor_MWh}". Wymagana liczba (np. 1.5)`);
          continue;
        }
        
        if (consumption < 0) {
          errors.push(`Wiersz ${rowNum}: Ujemna wartość zużycia (${consumption} MWh). Zużycie musi być nieujemne`);
          continue;
        }
        
        // Ostrzeżenie o bardzo wysokim zużyciu (>100 MWh/h)
        if (consumption > 100) {
          errors.push(`Wiersz ${rowNum}: ⚠️ Bardzo wysokie zużycie (${consumption} MWh). Proszę sprawdzić czy wartość jest poprawna`);
        }
        
        parsedData.push({
          date,
          hour,
          consumptionMwh: consumption,
          rowIndex: rowNum,
        });
      }
      
      // Jeśli są błędy, zwróć wszystkie naraz
      if (errors.length > 0) {
        const errorMessage = `❌ Znaleziono ${errors.length} błędów w pliku:\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n\n...i ${errors.length - 10} innych błędów` : ''}`;
        throw new Error(errorMessage);
      }
      
      // ==== WALIDACJA KOMPLETNOŚCI DANYCH ====
      // Sprawdzenie duplikatów
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const item of parsedData) {
        const key = `${item.date.toISOString().split('T')[0]}_${item.hour}`;
        if (seen.has(key)) {
          duplicates.push(`${item.date.toISOString().split('T')[0]} godzina ${item.hour}`);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(
          `❌ Znaleziono duplikaty danych dla:\n${duplicates.slice(0, 5).join('\n')}${duplicates.length > 5 ? `\n...i ${duplicates.length - 5} innych` : ''}`
        );
      }
      
      // Sprawdzenie minimalnej ilości danych (przynajmniej 24 godziny)
      if (parsedData.length < 24) {
        throw new Error(
          `❌ Za mało danych. Plik zawiera tylko ${parsedData.length} wierszy. Wymagane minimum: 24 godziny (1 dzień).`
        );
      }

      // Pobranie globalnych cen RDN
      const rdnPrices = await getGlobalRdnPrices();
      
      if (rdnPrices.length === 0) {
        throw new Error(
          "❌ Brak danych cenowych RDN w systemie. Proszę skontaktować się z administratorem."
        );
      }

      // Obliczenie wartości energii
      const consumptionData = parsedData.map(d => ({
        date: d.date,
        hour: d.hour,
        consumptionMwh: d.consumptionMwh,
      }));

      const rdnData = rdnPrices.map(p => ({
        date: p.date,
        hour: p.hour,
        priceRdnPlnMwh: p.priceRdnPlnMwh,
      }));

      const result = calculateEnergyCost(consumptionData, rdnData);
      console.log('[BehindMeter] calculateEnergyCost result:', {
        totalConsumptionMwh: result.totalConsumptionMwh,
        totalEnergyCostPln: result.totalEnergyCostPln,
        averageCostPerMwh: result.averageCostPerMwh,
        monthlyDataLength: result.monthlyData.length,
      });

      // Optymalizacja magazynu
      // Uwaga: Zmiana czasu (letni/zimowy) może powodować brak niektórych godzin
      // W takim przypadku używamy średniej ceny z sąsiednich godzin
      const hourlyData = consumptionData.map((c, i) => {
        const dateStr = c.date.toISOString().split('T')[0];
        let price = rdnData.find(r => 
          r.date.toISOString().split('T')[0] === dateStr && 
          r.hour === c.hour
        )?.priceRdnPlnMwh;
        
        // Jeśli brak ceny (np. zmiana czasu), użyj średniej z sąsiednich godzin
        if (price === undefined) {
          const prevHour = rdnData.find(r => 
            r.date.toISOString().split('T')[0] === dateStr && 
            r.hour === c.hour - 1
          )?.priceRdnPlnMwh;
          const nextHour = rdnData.find(r => 
            r.date.toISOString().split('T')[0] === dateStr && 
            r.hour === c.hour + 1
          )?.priceRdnPlnMwh;
          
          if (prevHour !== undefined && nextHour !== undefined) {
            price = (prevHour + nextHour) / 2;
            console.log(`[BehindMeter] Missing price for ${dateStr} hour ${c.hour}, using average: ${price}`);
          } else if (prevHour !== undefined) {
            price = prevHour;
          } else if (nextHour !== undefined) {
            price = nextHour;
          } else {
            price = 0;
            console.warn(`[BehindMeter] No price found for ${dateStr} hour ${c.hour}, using 0`);
          }
        }
        
        return {
          date: dateStr,
          hour: c.hour,
          consumptionMwh: c.consumptionMwh,
          priceRdnPlnMwh: price,
        };
      });

      const optimizationResult = optimizeBehindMeter(
        hourlyData,
        {
          capacityMwh,
          powerMw,
          socMin,
          socMax,
          efficiency,
          distributionCostPlnMwh,
        }
      );
      console.log('[BehindMeter] optimizeBehindMeter result:', {
        totalCostWithoutBatteryPln: optimizationResult.totalCostWithoutBatteryPln,
        totalCostWithBatteryPln: optimizationResult.totalCostWithBatteryPln,
        totalSavingsPln: optimizationResult.totalSavingsPln,
        hourlyDetailsLength: optimizationResult.hourlyDetails?.length,
      });

      // Obliczenie zakresu dat
      const dates = parsedData.map((d) => d.date);
      const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      // Zapis do bazy danych
      const simulationId = await saveBehindMeterSimulation({
        userId: ctx.user.id,
        name,
        capacityMwh,
        powerMw,
        socMin,
        socMax,
        efficiency,
        distributionCostPlnMwh,
        startDate,
        endDate,
        totalConsumptionMwh: result.totalConsumptionMwh,
        totalEnergyCostPln: result.totalEnergyCostPln,
        averageCostPerMwh: result.averageCostPerMwh,
        totalCostWithoutBatteryPln: optimizationResult.totalCostWithoutBatteryPln,
        totalCostWithBatteryPln: optimizationResult.totalCostWithBatteryPln,
        totalSavingsPln: optimizationResult.totalSavingsPln,
        totalEnergyValueWithBatteryPln: optimizationResult.totalEnergyValueWithBatteryPln,
        energyChargedMwh: optimizationResult.energyChargedMwh,
        energyDischargedMwh: optimizationResult.energyDischargedMwh,
        numberOfCycles: optimizationResult.numberOfCycles,
        monthlyData: JSON.stringify(result.monthlyData),
        hourlyDetails: optimizationResult.hourlyDetails ? JSON.stringify(optimizationResult.hourlyDetails) : null, // Szczegółowe dane godzinowe
        createdAt: new Date(),
      });

      return {
        simulationId,
        name,
        startDate,
        endDate,
        totalConsumptionMwh: result.totalConsumptionMwh,
        totalEnergyCostPln: result.totalEnergyCostPln,
        averageCostPerMwh: result.averageCostPerMwh,
        monthlyData: result.monthlyData,
      };
    }),

  /**
   * Pobierz listę symulacji użytkownika
   */
  getSimulations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserBehindMeterSimulations(ctx.user.id);
  }),

  /**
   * Pobierz szczegóły symulacji
   */
  getSimulationById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const simulation = await getBehindMeterSimulationById(input.id);
      
      if (!simulation) {
        throw new Error("Symulacja nie została znaleziona");
      }
      
      if (simulation.userId !== ctx.user.id) {
        throw new Error("Brak dostępu do tej symulacji");
      }
      
      // Parse monthly data from JSON
      const monthlyData = JSON.parse(simulation.monthlyData);
      
      return {
        ...simulation,
        monthlyData,
      };
    }),

  /**
   * Eksport szczegółowych danych godzinowych do Excel (tylko dla adminów)
   */
  exportHourlyDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Sprawdzenie czy użytkownik jest adminem
      if (ctx.user.role !== 'admin') {
        throw new Error("Brak uprawnień - tylko administratorzy mogą eksportować szczegółowe dane");
      }

      const simulation = await getBehindMeterSimulationById(input.id);
      
      if (!simulation) {
        throw new Error("Symulacja nie została znaleziona");
      }
      
      if (!simulation.hourlyDetails) {
        throw new Error("Brak szczegółowych danych godzinowych dla tej symulacji");
      }

      // Parse hourly details from JSON
      const hourlyDetails = JSON.parse(simulation.hourlyDetails);

      // Generowanie pliku Excel
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet('Szczegółowe dane');

      // Nagłówki kolumn
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'H', key: 'hour', width: 6 },
        { header: 'Price_PLN', key: 'priceRdnPlnMwh', width: 12 },
        { header: 'load_MWh', key: 'loadMwh', width: 12 },
        { header: 'Charge_MWh', key: 'chargeMwh', width: 12 },
        { header: 'Discharge_MWh', key: 'dischargeMwh', width: 14 },
        { header: 'P_bat_MW', key: 'pBatMw', width: 12 },
        { header: 'SoC_end_MWh', key: 'socEndMwh', width: 14 },
        { header: 'Grid_import', key: 'gridImportMwh', width: 12 },
        { header: 'Hour_cost_PLN', key: 'hourCostPln', width: 14 },
        { header: 'energia_bez_mag', key: 'energiaBezMagPln', width: 16 },
      ];

      // Dodanie danych
      for (const detail of hourlyDetails) {
        worksheet.addRow({
          date: detail.date,
          hour: detail.hour,
          priceRdnPlnMwh: Math.round(detail.priceRdnPlnMwh * 100) / 100,
          loadMwh: Math.round(detail.loadMwh * 100) / 100,
          chargeMwh: Math.round(detail.chargeMwh * 100) / 100,
          dischargeMwh: Math.round(detail.dischargeMwh * 100) / 100,
          pBatMw: Math.round(detail.pBatMw * 100) / 100,
          socEndMwh: Math.round(detail.socEndMwh * 100) / 100,
          gridImportMwh: Math.round(detail.gridImportMwh * 100) / 100,
          hourCostPln: Math.round(detail.hourCostPln * 100) / 100,
          energiaBezMagPln: Math.round(detail.energiaBezMagPln * 100) / 100,
        });
      }

      // Formatowanie nagłówków
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Generowanie bufora
      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = Buffer.from(buffer as any).toString('base64');

      return {
        filename: `${simulation.name}_szczegoly.xlsx`,
        fileBase64: base64,
      };
    }),
});
