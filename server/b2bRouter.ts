import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as XLSX from "xlsx";
import {
  createCustomerProfile,
  insertCustomerProfileData,
  getUserCustomerProfiles,
  getCustomerProfileById,
  getCustomerProfileData,
  saveB2bSizingResult,
  getUserB2bSizingResults,
  getB2bSizingResultById,
  getGlobalRdnPrices,
} from "./db";
import { calculateBatterySizeUltraSimple } from "./ultraSimpleBatterySizing";
import { generateB2BPDFReport } from "./b2bPdfGenerator";

/**
 * Router dla modułu "Dobierz wielkość magazynu dla B2B"
 */
export const b2bRouter = router({
  /**
   * Upload profilu klienta (plik Excel)
   */
  uploadProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nazwa profilu jest wymagana"),
        fileBase64: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, fileBase64 } = input;

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
          `❌ Nieprawiłowa struktura pliku. Brakujące kolumny: ${missingColumns.join(', ')}. \n\nWymagane kolumny:\n- Data: data w formacie YYYY-MM-DD (np. 2024-10-01)\n- H: godzina (1-24)\n- Pobor_MWh: zużycie energii w MWh`
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
          errors.push(`Wiersz ${rowNum}: Nieprawiłowa data "${row.Data}". Wymagany format: YYYY-MM-DD (np. 2024-10-01)`);
          continue;
        }
        
        // Walidacja godziny
        const hour = Number(row.H);
        if (isNaN(hour) || hour < 1 || hour > 24) {
          errors.push(`Wiersz ${rowNum}: Nieprawiłowa godzina "${row.H}". Wymagana wartość: 1-24`);
          continue;
        }
        
        // Walidacja zużycia
        const consumption = Number(row.Pobor_MWh);
        if (isNaN(consumption)) {
          errors.push(`Wiersz ${rowNum}: Nieprawiłowa wartość zużycia "${row.Pobor_MWh}". Wymagana liczba (np. 1.5)`);
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

      // Obliczenie statystyk
      const dates = parsedData.map((d) => d.date);
      const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      const totalConsumption = parsedData.reduce(
        (sum, d) => sum + d.consumptionMwh,
        0
      );

      // Zapis profilu do bazy
      const profileId = await createCustomerProfile({
        userId: ctx.user.id,
        name,
        uploadDate: new Date(),
        startDate,
        endDate,
        totalConsumptionMwh: totalConsumption,
        createdAt: new Date(),
      });

      // Zapis danych godzinowych
      await insertCustomerProfileData(
        parsedData.map((d) => ({
          profileId,
          date: d.date,
          hour: d.hour,
          consumptionMwh: d.consumptionMwh,
        }))
      );

      return {
        profileId,
        name,
        startDate,
        endDate,
        totalConsumptionMwh: totalConsumption,
        recordCount: parsedData.length,
      };
    }),

  /**
   * Pobierz listę profili klienta
   */
  getProfiles: protectedProcedure.query(async ({ ctx }) => {
    return await getUserCustomerProfiles(ctx.user.id);
  }),

  /**
   * Uruchom optymalizację wielkości magazynu
   */
  optimizeSize: protectedProcedure
    .input(
      z.object({
        profileId: z.number(),
        name: z.string().min(1, "Nazwa symulacji jest wymagana"),
        maxCyclesPerDay: z.number().min(1).max(10),
        minSpreadPlnMwh: z.number().min(0),
        socMin: z.number().min(0).max(1),
        socMax: z.number().min(0).max(1),
        efficiency: z.number().min(0).max(1),
        distributionCostPlnMwh: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        profileId,
        name,
        maxCyclesPerDay,
        minSpreadPlnMwh,
        socMin,
        socMax,
        efficiency,
        distributionCostPlnMwh,
      } = input;

      // Pobierz profil klienta
      const profile = await getCustomerProfileById(profileId);
      if (!profile) {
        throw new Error("Profil klienta nie został znaleziony");
      }

      // Sprawdź czy profil należy do użytkownika
      if (profile.userId !== ctx.user.id) {
        throw new Error("Brak dostępu do tego profilu");
      }

      // Pobierz dane godzinowe profilu
      const profileData = await getCustomerProfileData(profileId);

      // Pobierz ceny RDN
      const rdnPrices = await getGlobalRdnPrices();
      if (rdnPrices.length === 0) {
        throw new Error("Brak danych cenowych RDN");
      }

      // Połącz dane profilu z cenami RDN
      const hourlyData = profileData.map((pd) => {
        const dateKey = pd.date.toISOString().split("T")[0];
        const rdnPrice = rdnPrices.find(
          (rp) =>
            rp.date.toISOString().split("T")[0] === dateKey &&
            rp.hour === pd.hour
        );

        if (!rdnPrice) {
          throw new Error(
            `Brak ceny RDN dla daty ${dateKey} godzina ${pd.hour}`
          );
        }

        return {
          date: pd.date,
          hour: pd.hour,
          pricePlnMwh: rdnPrice.priceRdnPlnMwh,
          consumptionMwh: pd.consumptionMwh,
        };
      });

      // Uruchom algorytm optymalizacji (ultra prosty - bez pętli)
      const customerData = profileData.map((pd) => ({
        date: pd.date.toISOString().split("T")[0],
        hour: pd.hour,
        consumptionMwh: pd.consumptionMwh,
      }));
      
      const result = calculateBatterySizeUltraSimple(customerData);

      // Zapisz wynik do bazy
      const sizingId = await saveB2bSizingResult({
        userId: ctx.user.id,
        profileId,
        name,
        maxCyclesPerDay,
        minSpreadPlnMwh,
        socMin,
        socMax,
        efficiency,
        distributionCostPlnMwh,
        recommendedCapacityMwh: result.capacityMwh,
        recommendedPowerMw: result.powerMw,
        estimatedAnnualSavingsPln: 0, // Oszczędności nie są obliczane w uproszczonym algorytmie
        createdAt: new Date(),
      });

      return {
        sizingId,
        profileName: profile.name,
        recommendedCapacityMwh: result.capacityMwh,
        recommendedPowerMw: result.powerMw,
        estimatedAnnualSavingsPln: 0, // Oszczędności nie są obliczane w uproszczonym algorytmie
      };
    }),

  /**
   * Pobierz listę wyników optymalizacji
   */
  getSizingResults: protectedProcedure.query(async ({ ctx }) => {
    return await getUserB2bSizingResults(ctx.user.id);
  }),

  /**
   * Pobierz szczegóły wyniku optymalizacji
   */
  getSizingResultById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await getB2bSizingResultById(input.id);
      if (!result) {
        throw new Error("Wynik optymalizacji nie został znaleziony");
      }

      // Sprawdź czy wynik należy do użytkownika
      if (result.userId !== ctx.user.id) {
        throw new Error("Brak dostępu do tego wyniku");
      }

      // Pobierz profil klienta
      const profile = await getCustomerProfileById(result.profileId);

      return {
        ...result,
        profileName: profile?.name || "Nieznany profil",
      };
    }),

  /**
   * Eksportuj wynik optymalizacji do PDF
   */
  exportToPdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await getB2bSizingResultById(input.id);
      if (!result) {
        throw new Error("Wynik optymalizacji nie został znaleziony");
      }

      // Sprawdź czy wynik należy do użytkownika
      if (result.userId !== ctx.user.id) {
        throw new Error("Brak dostępu do tego wyniku");
      }

      // Pobierz profil klienta
      const profile = await getCustomerProfileById(result.profileId);

      // Przygotuj dane do PDF
      const pdfData = {
        name: result.name,
        createdAt: result.createdAt,
        preparedBy: ctx.user.name || ctx.user.email || undefined,
        recommendedCapacityMwh: result.recommendedCapacityMwh,
        recommendedPowerMw: result.recommendedPowerMw,
        estimatedAnnualSavingsPln: result.estimatedAnnualSavingsPln,
        maxCyclesPerDay: result.maxCyclesPerDay,
        minSpreadPlnMwh: result.minSpreadPlnMwh,
        socMin: result.socMin,
        socMax: result.socMax,
        efficiency: result.efficiency,
        distributionCostPlnMwh: result.distributionCostPlnMwh,
      };

      // Generuj PDF
      const pdfBuffer = await generateB2BPDFReport(pdfData);

      // Zwróć jako base64
      return {
        pdfBase64: pdfBuffer.toString("base64"),
        filename: `Dobor_magazynu_B2B_${result.name.replace(/[^a-z0-9]/gi, "_")}.pdf`,
      };
    }),
});
