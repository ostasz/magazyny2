import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE } from "@/const";
import { ArrowLeft, Loader2, FileDown } from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";

// Komponent przycisku eksportu PDF
function ExportPDFButton({ calculationId, calculationName }: { calculationId: number, calculationName: string }) {
  const generatePDFMutation = trpc.calculator.generatePDF.useMutation({
    onSuccess: (data) => {
      console.log('[Frontend PDF] Received response:', { hasData: !!data, hasPdf: !!data?.pdf, pdfLength: data?.pdf?.length });
      
      if (!data || !data.pdf) {
        toast.error('Brak danych PDF w odpowiedzi serwera');
        return;
      }
      
      console.log('[Frontend PDF] PDF base64 first 100 chars:', data.pdf.substring(0, 100));
      console.log('[Frontend PDF] Filename:', data.filename);
      
      // Prosta konwersja base64 do data URL
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Raport PDF został wygenerowany!');
    },
    onError: (error) => {
      toast.error(`Błąd generowania PDF: ${error.message}`);
    },
  });
  
  return (
    <Button
      onClick={() => generatePDFMutation.mutate({ calculationId })}
      disabled={generatePDFMutation.isPending}
      variant="default"
      size="sm"
    >
      {generatePDFMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generowanie...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Eksportuj do PDF
        </>
      )}
    </Button>
  );
}

export default function CalculationResults() {
  const params = useParams<{ id: string }>();
  const calculationId = Number(params.id);
  
  const { data: calculation, isLoading: calcLoading } = trpc.calculator.getById.useQuery({
    id: calculationId,
  });
  
  const { data: allCycles, isLoading: cyclesLoading } = trpc.calculator.getCycles.useQuery({
    calculationId,
    limit: 10000, // Pobierz wszystkie cykle
    offset: 0,
  });
  
  const { data: pricesMetadata } = trpc.admin.getGlobalRdnPricesMetadata.useQuery();
  
  // Agregacja zysków po miesiącach
  const monthlyData = useMemo(() => {
    if (!allCycles || !calculation) return [];
    
    const monthlyProfits = new Map<string, { revenue: number, distributionCost: number, profit: number, cycles: number }>();
    
    // Obliczenie kosztów dystrybucji na cykl
    const totalCycles = allCycles.total || 1;
    const distributionCostPerCycle = (calculation.distributionCostPln || 0) / totalCycles;
    
    allCycles.cycles.forEach(cycle => {
      const date = new Date(cycle.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyProfits.has(monthKey)) {
        monthlyProfits.set(monthKey, { revenue: 0, distributionCost: 0, profit: 0, cycles: 0 });
      }
      
      const monthData = monthlyProfits.get(monthKey)!;
      monthData.revenue += cycle.spreadPln;
      monthData.distributionCost += distributionCostPerCycle;
      monthData.profit += (cycle.spreadPln - distributionCostPerCycle);
      monthData.cycles += 1;
    });
    
    return Array.from(monthlyProfits.entries())
      .map(([month, data]) => ({
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' }),
        przychody: Math.round(data.revenue * 100) / 100,
        kosztyDystrybucji: Math.round(data.distributionCost * 100) / 100,
        zysk: Math.round(data.profit * 100) / 100,
        liczbaCykli: data.cycles,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allCycles, calculation]);
  
  if (calcLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Ładowanie wyników...</p>
        </div>
      </div>
    );
  }
  
  if (!calculation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nie znaleziono symulacji</CardTitle>
            <CardDescription>Symulacja o podanym ID nie istnieje</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Powrót do strony głównej</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{APP_TITLE}</h1>
              <p className="text-sm text-muted-foreground">Wyniki Symulacji</p>
            </div>
          </div>
          <ExportPDFButton calculationId={calculationId} calculationName={calculation.name} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Nagłówek symulacji */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{calculation.name}</CardTitle>
              <CardDescription>
                Utworzono: {new Date(calculation.createdAt).toLocaleDateString('pl-PL')}
                {pricesMetadata && (
                  <>
                    <br />
                    Symulacja bazuje na danych RDN za okres: {new Date(pricesMetadata.startDate).toLocaleDateString('pl-PL')} - {new Date(pricesMetadata.endDate).toLocaleDateString('pl-PL')}
                  </>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Wyniki finansowe */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle>Symulacja Wyniku Finansowego</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">Przychody</p>
                  <p className="text-3xl font-bold" style={{color: '#22c55e'}}>{formatNumber(calculation.revenuePln || 0, 2)} PLN</p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">Koszty dystrybucji</p>
                  <p className="text-3xl font-bold text-red-600">{formatNumber(calculation.distributionCostPln || 0, 2)} PLN</p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">Zysk netto</p>
                  <p className="text-3xl font-bold" style={{color: '#009D8F'}}>{formatNumber(calculation.profitPln || 0, 2)} PLN</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI */}
          <Card>
            <CardHeader>
              <CardTitle>Wskaźniki KPI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Moc (MW)</span>
                  <span className="font-semibold">{formatNumber(calculation.powerMw, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Pojemność (MWh)</span>
                  <span className="font-semibold">{formatNumber(calculation.capacityMwh, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">SoC min</span>
                  <span className="font-semibold">{formatNumber((calculation.socMin || 0) * 100, 0)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">SoC max</span>
                  <span className="font-semibold">{formatNumber((calculation.socMax || 0) * 100, 0)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Efektywność cyklu</span>
                  <span className="font-semibold">{formatNumber((calculation.efficiency || 0) * 100, 0)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Max cykli (limit)</span>
                  <span className="font-semibold">{calculation.maxCyclesPerDay}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Średnia dzienna liczba cykli</span>
                  <span className="font-semibold">{formatNumber(calculation.avgCyclesPerDay || 0, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Średni spread na cykl (PLN)</span>
                  <span className="font-semibold">{formatNumber(calculation.avgSpreadPerCyclePln || 0, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Efektywny średni spread (PLN/MWh)</span>
                  <span className="font-semibold">{formatNumber(calculation.effectiveAvgSpreadPlnMwh || 0, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Suma energii kupionej (MWh)</span>
                  <span className="font-semibold">{formatNumber(calculation.totalEnergyBoughtMwh || 0, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Suma energii sprzedanej (MWh)</span>
                  <span className="font-semibold">{formatNumber(calculation.totalEnergySoldMwh || 0, 2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Energia zużyta na sprawność (MWh)</span>
                  <span className="font-semibold">{formatNumber(calculation.energyLossMwh || 0, 2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wykres miesięcznych zysków */}
          <Card>
            <CardHeader>
              <CardTitle>Symulacja Wyników Miesięcznych</CardTitle>
              <CardDescription>
                Szczegółowe zestawienie przychodów, kosztów i zysków w poszczególnych miesiącach
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cyclesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                </div>
              ) : monthlyData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 px-4">Miesiąc</th>
                          <th className="text-right py-2 px-4">Liczba cykli</th>
                          <th className="text-right py-2 px-4">Przychody (PLN)</th>
                          <th className="text-right py-2 px-4">Koszty dystr. (PLN)</th>
                          <th className="text-right py-2 px-4 font-semibold">Zysk netto (PLN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{row.monthLabel}</td>
                            <td className="text-right py-2 px-4">{row.liczbaCykli}</td>
                            <td className="text-right py-2 px-4 text-green-600">{formatNumber(row.przychody, 2)}</td>
                            <td className="text-right py-2 px-4 text-red-600">{formatNumber(row.kosztyDystrybucji, 2)}</td>
                            <td className="text-right py-2 px-4 font-semibold" style={{color: '#009D8F'}}>{formatNumber(row.zysk, 2)}</td>
                          </tr>
                        ))}
                        {/* Wiersz podsumowania */}
                        <tr className="border-t-2 border-primary bg-muted/30 font-semibold">
                          <td className="py-3 px-4">Suma</td>
                          <td className="text-right py-3 px-4">
                            {monthlyData.reduce((sum, row) => sum + row.liczbaCykli, 0)}
                          </td>
                          <td className="text-right py-3 px-4 text-green-600">
                            {formatNumber(monthlyData.reduce((sum, row) => sum + row.przychody, 0), 2)}
                          </td>
                          <td className="text-right py-3 px-4 text-red-600">
                            {formatNumber(monthlyData.reduce((sum, row) => sum + row.kosztyDystrybucji, 0), 2)}
                          </td>
                          <td className="text-right py-3 px-4 font-bold" style={{color: '#009D8F'}}>
                            {formatNumber(monthlyData.reduce((sum, row) => sum + row.zysk, 0), 2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                <p className="text-center text-muted-foreground py-8">Brak danych do wyświetlenia</p>
              )}
            </CardContent>
          </Card>


        </div>
      </main>
    </div>
  );
}
