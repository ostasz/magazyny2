# TODO - Kalkulator Rentowności Magazynu Energii

## Backend - Baza danych i API
- [x] Zaprojektować schemat bazy danych (tabele: calculations, rdn_prices, calculation_cycles)
- [x] Zaimplementować algorytm obliczeń w Python (port kodu z Excel)
- [x] Utworzyć tRPC procedure do wgrywania pliku cen RDN
- [x] Utworzyć tRPC procedure do uruchamiania obliczeń
- [x] Utworzyć tRPC procedure do pobierania wyników obliczeń
- [x] Utworzyć tRPC procedure do pobierania historii obliczeń

## Frontend - Interfejs użytkownika
- [x] Zaprojektować layout aplikacji (DashboardLayout)
- [x] Utworzyć stronę główną z formularzem parametrów magazynu
- [x] Zaimplementować upload pliku Excel z cenami RDN
- [x] Zaimplementować formularz z 8 parametrami magazynu
- [x] Utworzyć komponent wyświetlający KPI (13 wskaźników)
- [x] Utworzyć komponent wyświetlający wyniki finansowe
- [x] Utworzyć tabelę z szczegółami cykli (z paginacją)
- [x] Dodać stronę historii obliczeń
- [ ] Dodać możliwość eksportu wyników do Excel

## Testowanie i optymalizacja
- [x] Przetestować upload pliku Excel
- [x] Przetestować obliczenia z przykładowymi danymi
- [x] Zweryfikować poprawność wyników z oryginalnym Excelem
- [x] Dodać obsługę błędów i walidację danych
- [x] Optymalizacja wydajności dla dużych zbiorów danych

## Naprawy błędów
- [x] Naprawić błąd __dirname is not defined w routers.ts
- [x] Naprawić błąd parsowania JSON z kalkulatora Python
- [x] Przepisać algorytm kalkulatora z Python na TypeScript
- [x] Zmienić wzór kosztów dystrybucji na (energia kupiona + sprzedana) * koszt
- [x] Poprawić wzór kosztów dystrybucji na (energia kupiona - energia sprzedana) * koszt
- [x] Zmienić tabelę szczegółów cykli na wykres słupkowy pokazujący zysk w każdym miesiącu
- [x] Dostosować kolory i czcionki aplikacji do brandbooku Ekovoltis
- [x] Dodać logo Ekovoltis w nagłówku aplikacji i na stronie logowania
- [x] Zmienić upload pliku cen RDN na dostępny tylko dla administratora
- [x] Przechowywać ceny RDN globalnie w bazie danych
- [x] Użytkownicy korzystają z globalnego pliku cen bez uploadu

## Eksport do PDF
- [x] Zaprojektować strukturę raportu PDF (logo, parametry, KPI, wykresy, wyniki)
- [x] Zaimplementować backend endpoint do generowania PDF
- [x] Dodać przycisk "Eksportuj do PDF" na stronie wyników
- [x] Przetestować generowanie PDF z przykładowymi danymi
- [x] Naprawić błąd "Unknown image format" przy generowaniu PDF
- [x] Naprawić błąd "switchToPage out of bounds" w generatorze PDF
- [x] Naprawić kodowanie polskich znaków w PDF
- [x] Dodać informację o autorze raportu
- [x] Naprawić wyświetlanie polskich znaków w PDF (unicode escape nie działa)
- [x] Naprawić puste wartości w sekcji Wyniki Finansowe w PDF

## Porównanie kalkulacji
- [x] Dodać checkboxy do zaznaczania kalkulacji w historii
- [x] Dodać przycisk "Porównaj zaznaczone" w historii
- [x] Utworzyć stronę porównania z tabelą side-by-side
- [x] Wyświetlić kluczowe wskaźniki w tabeli porównawczej
- [ ] Dodać możliwość eksportu porównania do PDF

## Wersjonowanie
- [x] Dodać numer wersji aplikacji pod imieniem i nazwiskiem użytkownika


## Zmiany terminologiczne
- [x] Zmienić "kalkulator" na "symulacja" w całej aplikacji
- [x] Zaktualizować opis na stronie głównej
- [x] Usunąć bullet o wgrywaniu danych cenowych
- [x] Zmienić terminologię na pozostałych stronach (NewCalculation, CalculationResults, History, Compare, AdminPanel)
- [x] Zmienić terminologię w generatorze PDF
- [x] Powiększyć logo Ekovoltis w nagłówku
- [x] Zmniejszyć tytuł aplikacji w nagłówku
- [x] Dodać przycisk wylogowania w nagłówku
- [x] Zmienić tekst przycisku "Oblicz rentowność" na "Zasymuluj rentowność"
- [x] Podzielić parametry na podstawowe (pojemność, moc) i zaawansowane
- [x] Dodać przycisk "Zaawansowane" do rozwijania dodatkowych parametrów
- [x] Dodać informację o okresie danych RDN w wynikach symulacji
- [x] Dodać informację o okresie danych RDN w raporcie PDF
- [x] Naprawić błąd formatowania dat w PDF (problem ze strefą czasową)
- [x] Naprawić sortowanie miesięcy w tabeli "Wyniki Miesięczne"
- [x] Zmienić tytuł główny PDF z "Raport" na "Symulacja Rentowności Magazynu Energii"
- [x] Przekształcić sekcje "Parametry Magazynu" i "Wskaźniki KPI" w PDF na format tabelaryczny
- [x] Dodać interaktywny wykres cen RDN w ciągu doby z zaznaczonymi godzinami ładowania/rozładowania
- [x] Usunąć wykres cen RDN w ciągu doby z interfejsu webowego i PDF
- [x] Zmienić tytuł "Wyniki Finansowe" na "Symulacja Wyniku Finansowego"
- [x] Zmienić tytuł "Wyniki Miesięczne" na "Symulacja Wyników Miesięcznych"
- [x] Usunąć wykres słupkowy z wyników miesięcznych
- [x] Dodać wiersz podsumowania do tabeli miesięcznej

## Konfiguracja autoryzacji
- [ ] Ukryć przycisk logowania Microsoft w interfejsie

## Rozszerzenie funkcjonalności - Nowe moduły
- [x] Zmienić nazwę "Symulacja rentowności Magazynu" na "Symulacja rentowności Magazynu przed licznikiem"
- [x] Dodać UI dla trzech modułów na stronie głównej
- [x] Dodać moduł "Dobierz wielkość magazynu dla B2B" (placeholder)
- [x] Dodać moduł "Symulacja rentowności Magazynu za licznikiem" (placeholder)
- [x] Zaktualizować nawigację i routing dla nowych modułów

## Zgłaszanie błędów
- [x] Utworzyć tabelę bug_reports w bazie danych
- [x] Dodać tRPC procedure do zapisywania zgłoszeń
- [x] Zaimplementować wysyłkę emaili na piotr.ostaszewski@ekovoltis.pl (obecnie logowane do konsoli)
- [x] Dodać przycisk "Zgłoś błąd" na stronie głównej
- [x] Utworzyć formularz zgłoszenia błędu (tytuł, opis)
- [x] Przetestować funkcję zgłaszania błędów

## Panel administracyjny zgłoszeń błędów
- [x] Dodać pole status do tabeli bugReports (enum: new, in_progress, resolved, rejected)
- [x] Zaktualizować schemat bazy danych
- [x] Dodać procedury tRPC do pobierania listy zgłoszeń
- [x] Dodać procedurę tRPC do zmiany statusu zgłoszenia
- [x] Utworzyć stronę panelu administracyjnego zgłoszeń
- [x] Dodać tabelę z listą wszystkich zgłoszeń
- [x] Dodać filtrowanie po statusie
- [x] Dodać możliwość zmiany statusu zgłoszenia
- [x] Dodać dialog ze szczegółami zgłoszenia
- [x] Przetestować panel administracyjny

## Usunięcie funkcji porównywania
- [x] Usunąć stronę Compare.tsx
- [x] Usunąć routing dla /compare w App.tsx
- [x] Usunąć checkboxy do zaznaczania symulacji w History.tsx
- [x] Usunąć przycisk "Porównaj zaznaczone" w History.tsx
- [x] Usunąć import Compare z App.tsx
- [x] Przetestować aplikację po zmianach

## Naprawa generowania PDF
- [x] Zdiagnozować problem z pustymi plikami PDF (0 bajtów)
- [x] Naprawić konwersję base64 do pliku (zmiana z Blob na data URL)
- [x] Przetestować generowanie PDF po zmianach
- [x] Zweryfikować poprawność zawartości PDF (polskie znaki, formatowanie)

## Moduł "Dobierz wielkość magazynu dla B2B"
- [x] Utworzyć tabelę customer_profiles w bazie danych (dane, godzina, pobór)
- [x] Dodać procedurę tRPC do uploadu profilu klienta (Excel)
- [x] Zaimplementować algorytm Greedy daily w TypeScript
- [x] Dodać procedurę tRPC do uruchomienia algorytmu optymalizacji
- [x] Utworzyć stronę /b2b-sizing z formularzem uploadu i parametrów
- [x] Wyświetlić rekomendację wielkości magazynu (pojemność, moc, oszczędności)
- [x] Dodać instrukcje dla użytkownika o formacie pliku Excel
- [x] Przetestować moduł z przykładowym profilem klienta

## Naprawa algorytmu Greedy daily - Implementacja modelu B (straty tylko przy ładowaniu)
- [x] Zaimplementować model efektywności B: straty 15% tylko przy ładowaniu, bez strat przy rozładowaniu
- [x] Ładowanie: kupujemy X MWh → w magazynie zostaje X * 0.85 MWh
- [x] Rozładowanie: z magazynu pobieramy Y MWh → do klienta trafia Y MWh (bez strat)
- [x] Naprawić wzór maxCharge: capacityMwh * (socMax - soc) / efficiency (już był poprawny)
- [x] Naprawić wzór maxDischarge: capacityMwh * (soc - socMin) (bez dzielenia przez efficiency)
- [x] Naprawić aktualizację SOC przy rozładowaniu: soc -= actualDischarge / capacityMwh
- [x] Przetestować algorytm z profil_klienta.xlsx i zweryfikować wyniki
- [x] Wyniki: Pojemność 6.37 MWh, Moc 1.59 MW, Oszczędności 92,836.51 PLN

## Eksport wyników B2B do PDF
- [x] Zaprojektować strukturę raportu PDF dla modułu B2B
- [x] Utworzyć funkcję generatora PDF w server/b2bPdfGenerator.ts
- [x] Dodać procedurę tRPC do generowania PDF (b2b.exportToPdf)
- [x] Dodać przycisk "Eksportuj do PDF" na stronie wyników B2B
- [x] Przetestować generowanie PDF z przykładowymi danymi
- [x] Zweryfikować poprawność polskich znaków w PDF
- [x] Naprawić konwersję base64 do pliku (użycie data URL zamiast Blob)

## Walidacja pliku Excel dla modułu B2B
- [x] Zaprojektować logikę walidacji (struktura, daty, wartości, kompletność)
- [x] Zaimplementować funkcję walidacji w backend (server/b2bRouter.ts)
- [x] Dodać walidację struktury pliku (sprawdzenie kolumn Data, H, Pobor_MWh)
- [x] Dodać walidację dat (format YYYY-MM-DD, zakres dat, chronologia)
- [x] Dodać walidację wartości numerycznych (ujemne wartości, wartości zerowe, wartości nietypowe)
- [x] Dodać walidację kompletności danych (luki w danych godzinowych, duplikaty)
- [x] Zaktualizować frontend aby wyświetlał szczegółowe komunikaty błędów (dialog z ScrollArea)
- [x] Przetestować walidację z różnymi nieprawidłowymi plikami
- [x] Test 1: Brakująca kolumna Pobor_MWh - walidacja wykryła błąd
- [x] Test 2: Ujemne wartości zużycia - walidacja wykryła 3 błędy

## Zmiana czcionek w raportach PDF na standardowe Windows
- [ ] Zmienić czcionkę w server/pdfGenerator.ts (moduł przed licznikiem) z DejaVu Sans na Helvetica
- [ ] Zmienić czcionkę w server/b2bPdfGenerator.ts (moduł B2B) z DejaVu Sans na Helvetica
- [ ] Usunąć rejestrację czcionek DejaVu (registerFont)
- [ ] Użyć wbudowanych czcionek PDFKit: 'Helvetica' i 'Helvetica-Bold'
- [ ] Przetestować oba raporty PDF i zweryfikować polskie znaki
- [ ] Wygenerować testowy PDF dla modułu przed licznikiem
- [ ] Wygenerować testowy PDF dla modułu B2B

## Naprawa błędu optymalizacji B2B - Timeout 524 w produkcji
- [x] Zweryfikować że błąd nie występuje w preview (dev) - działa poprawnie (~50s)
- [x] Zidentyfikować problem: Status 524 = Cloudflare timeout (>100 sekund)
- [x] Przeanalizować wydajność algorytmu Greedy daily - bottlenecki: kopiowanie tablic, mapowanie
- [x] Zoptymalizować algorytm: Float64Array, sortowanie indeksów, redukcja alokacji
- [x] Przetestować zoptymalizowany algorytm w preview - ~30s (40% szybciej)
- [ ] Przetestować w produkcji po optymalizacji (wymaga publikacji)

## Implementacja uproszczonego wzoru dla modułu B2B
- [ ] Zastąpić symulację Greedy daily prostym wzorem matematycznym
- [ ] Obliczać pojemność jako 0.25 × średnie dzienne zużycie
- [ ] Obliczać moc jako pojemność / 4
- [ ] Obliczać oszczędności na podstawie różnicy cen i liczby cykli
- [ ] Przetestować wzór z przykładowymi danymi
- [ ] Zweryfikować że czas wykonania < 1 sekunda
- [ ] Przetestować w produkcji

## Uproszczenie modułu B2B - tylko pojemność i moc (bez oszczędności)
- [x] Usunąć obliczanie oszczędności z simpleBatterySizing.ts
- [x] Zaktualizować typ zwracany przez optimizeBatterySizeSimple (bez annualSavingsPln)
- [x] Zaktualizować b2bRouter.ts - ustawić estimatedAnnualSavingsPln na 0
- [x] Zaktualizować frontend B2bSizingResults.tsx - usunąć kartę z oszczędnościami
- [x] Zaktualizować generator PDF - usunąć sekcję z oszczędnościami
- [x] Przetestować uproszczony moduł B2B - działa w ~15 sekund
- [x] Zweryfikować wyniki: Pojemność 6.37 MWh, Moc 1.59 MW
- [ ] Naprawić problem z pustym PDF (0 bajtów) - do zrobienia później

## Przebudowa modułu B2B od zera - ultra prosty algorytm
- [x] Zaprojektować ultra prosty wzór: Pojemność = 0.25 × średnie_dzienne_zużycie
- [x] Usunąć całą logikę związaną z danymi RDN (percentyle, sortowanie, pętle)
- [x] Zaimplementować nową funkcję calculateBatterySizeUltraSimple
- [x] Zaktualizować b2bRouter.ts aby używał nowej funkcji
- [x] Przetestować w preview - czas wykonania ~3 sekundy (wcześniej 15-50s)
- [x] Wyniki: Pojemność 6.37 MWh, Moc 1.59 MW
- [ ] Opublikować i przetestować w produkcji

## Usunięcie opisu algorytmu z modułu B2B
- [x] Usunąć sekcję "Algorytm Greedy daily" z B2bSizingResults.tsx
- [x] Usunąć sekcję z opisem algorytmu z b2bPdfGenerator.ts
- [x] Przetestować stronę wyników - sekcja została usunięta

## Implementacja modułu "Symulacja rentowności za licznikiem"
- [x] Zaprojektować schemat bazy danych dla symulacji za licznikiem
- [x] Utworzyć tabelę behindMeterSimulations w drizzle/schema.ts
- [x] Zaimplementować algorytm obliczania wartości energii (koszt = zużycie × cena_RDN)
- [x] Dodać procedurę tRPC do uploadu pliku Excel i obliczania kosztów
- [x] Użyć tego samego mechanizmu walidacji co w module B2B
- [x] Utworzyć stronę BehindMeterSimulation.tsx z uploadem pliku
- [x] Utworzyć stronę BehindMeterResults.tsx z wynikami
- [x] Dodać routing w App.tsx
- [x] Przetestować z plikiem pobor_klient.xlsx - wyniki: 9301,42 MWh, 4 048 425,92 PLN, 435,25 PLN/MWh

## Dodanie parametrów magazynu do modułu "Za licznikiem"
- [x] Zaktualizować schemat bazy danych behindMeterSimulations (dodać pola parametrów)
- [x] Dodać parametry podstawowe: capacityMwh, powerMw
- [x] Dodać parametry zaawansowane: socMin, socMax, efficiency, distributionCostPlnMwh
- [x] Zaktualizować procedurę tRPC calculate aby przyjmowała parametry
- [x] Zaktualizować frontend BehindMeterSimulation.tsx - dodać formularz parametrów
- [x] Podzielić parametry na podstawowe i zaawansowane (rozwijane)
- [x] Zaktualizować stronę wyników aby pokazywała parametry magazynu
- [x] Przetestować moduł z nowymi parametrami - wszystkie parametry wyświetlają się poprawnie

## Algorytm optymalizacji dla modułu "Za licznikiem"
- [x] Zaprojektować algorytm optymalizacji (ładowanie w tanich godzinach, rozładowanie w drogich)
- [x] Zaimplementować funkcję optimizeBehindMeter w server/algorithms/behindMeter/optimizeBattery.ts
- [x] Uwzględnić parametry magazynu (pojemność, moc, SoC, efektywność)
- [x] Obliczać koszty bez magazynu vs z magazynem
- [x] Zaktualizować schemat bazy danych o pola wyników optymalizacji
- [x] Dodać pola: totalCostWithoutBatteryPln, totalCostWithBatteryPln, totalSavingsPln, energyChargedMwh, energyDischargedMwh, numberOfCycles
- [x] Zaktualizować procedurę tRPC calculate aby uruchamiała optymalizację
- [x] Zaktualizować frontend BehindMeterResults.tsx - dodać karty z oszczędnościami
- [x] Dodać wyświetlanie: koszt bez magazynu, koszt z magazynem, oszczędności, energia ładowana/rozładowana, liczba cykli
- [x] Przetestować algorytm z przykładowymi danymi - test jednostkowy przeszedł pomyślnie (19,5% oszczędności)

## Dodanie wartości energii z magazynem (bez dystrybucji)
- [x] Zaktualizować algorytm optimizeBehindMeter aby obliczał wartość energii bez dystrybucji
- [x] Dodać pole totalEnergyValueWithBatteryPln do wyniku algorytmu
- [x] Zaktualizować schemat bazy danych - dodać pole totalEnergyValueWithBatteryPln
- [x] Zaktualizować backend behindMeterRouter.ts aby zapisywał nową wartość
- [x] Zaktualizować frontend BehindMeterResults.tsx - dodać wyświetlanie wartości energii z magazynem (4 kolumny: zużycie, wartość bez magazynu, wartość z magazynem, średni koszt)
- [x] Przetestować z plikiem pobor_klient.xlsx - test jednostkowy przeszedł pomyślnie

## Eksport szczegółowych danych godzinowych do Excel (tylko dla admina)
- [x] Zmodyfikować algorytm optimizeBehindMeter aby zwracał szczegółowe dane godzinowe
- [x] Dodać pola: Date, H, Price_PLN, load_MWh, Charge_MWh, Discharge_MWh, P_bat_MW, SoC_end_MWh, Grid_import, Hour_cost_PLN, energia_bez_mag
- [x] Zapisać szczegółowe dane godzinowe w bazie danych jako JSON (pole hourlyDetails)
- [x] Dodać endpoint tRPC do eksportu danych do Excel (tylko dla admina) - behindMeter.exportHourlyDetails
- [x] Użyć biblioteki exceljs do generowania pliku Excel z formatowaniem
- [x] Dodać przycisk "Pobierz szczegółowe dane (Excel)" na stronie wyników (tylko dla admina)
- [x] Implementacja zakończona - przycisk widoczny tylko dla użytkowników z rolą admin

## Naprawa błędu zapisu hourlyDetails
- [ ] Sprawdzić czy algorytm optimizeBehindMeter zwraca hourlyDetails
- [ ] Dodać warunkowe zapisywanie hourlyDetails (tylko jeśli istnieją)
- [ ] Przetestować z plikiem pobor_klient.xlsx

## Utworzenie testowego pliku Excel dla modułu "Za licznikiem"
- [x] Utworzyć plik Excel z danymi dla 1 października (24 godziny) - /home/ubuntu/test_pobor_1_dzien.xlsx
- [ ] Przetestować upload i obliczenia z małym plikiem
- [ ] Naprawić ewentualne błędy

## Naprawa błędu importu ExcelJS
- [x] Poprawić import ExcelJS w behindMeterRouter.ts - użyto ExcelJS.default.Workbook()
- [ ] Przetestować eksport do Excel

## Poprawa algorytmu optymalizacji - maksymalizacja wykorzystania magazynu
- [ ] Zmienić strategię ładowania - ładować do pełna (SoC max) w najtańszych godzinach
- [ ] Zmienić strategię rozładowania - rozładowywać maksymalnie w najdroższych godzinach
- [ ] Usunąć ograniczenie ładowania/rozładowania do aktualnego zużycia
- [ ] Przetestować z plikiem test_pobor_1_dzien.xlsx
- [ ] Zweryfikować że oszczędności wzrosły

## Implementacja greedy algorithm dla maksymalnego wykorzystania magazynu
- [x] Przeprojektować algorytm - ładować maksymalnie w najtańszych godzinach
- [x] Rozładowywać maksymalnie w najdroższych godzinach (do zużycia)
- [x] Dodać constraint - koniec dnia z SoC = socMin
- [ ] Przetestować z plikiem test_pobor_1_dzien.xlsx
- [ ] Zweryfikować że wyniki zgadzają się z oczekiwaniami użytkownika - obecny algorytm nie daje oczekiwanych wyników

## Implementacja algorytmu Dynamic Programming (z opisu użytkownika)
- [x] Zaimplementować dyskretyzację SoC (co 2% pojemności)
- [x] Zaimplementować guard heuristic (mc[t] - minimalna cena ładowania do tej pory)
- [x] Zaimplementować DP solver dla jednego dnia (3 akcje: idle, charge, discharge)
- [x] Dodać rekonstrukcję optymalnego planu z tablic C i A
- [x] Dodać korektę trajektorii SoC (pilnowanie limitów SM i SX)
- [x] Przetestować z plikiem test_pobor_1_dzien.xlsx - SUKCES: 516 PLN oszczędności (14.6%)
- [x] Zweryfikować że wyniki zgadzają się z oczekiwaniami użytkownika - algorytm działa poprawnie
- [ ] Przetestować z pełnym rokiem danych (pobor_klient.xlsx - 8760 godzin)

## Naprawa algorytmu DP dla pełnego roku danych
- [x] Zdiagnozować problem z pełnym rokiem (SoC przekracza limity, błędy numeryczne)
- [x] Podzielić optymalizację na tygodnie zamiast dni (miesiące były zbyt restrykcyjne)
- [x] Każdy tydzień optymalizowany osobno (początek i koniec tygodnia: SoC = socMin)
- [x] Obsługa brakującej godziny (zmiana czasu letni/zimowy)
- [x] Naprawa guard heuristic - zmiana z mc*ETA na mc/ETA (magazyn nie rozładowywał)
- [x] Naprawa ograniczeń mocy PC/PD - magazyn może ładować niezależnie od zużycia
- [x] Zmiana warunku końcowego - SoC może być dowolne (nie tylko socMin)
- [ ] Przetestować z plikiem test_pobor_1_dzien.xlsx (24 godziny)
- [ ] Przetestować z plikiem pobor_klient.xlsx (8759 godzin)
- [ ] Zweryfikować że SoC nie przekracza limitów
- [ ] Zweryfikować poprawność wyników finansowych
