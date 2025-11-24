import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, TrendingUp, DollarSign, Battery, Zap, RefreshCw, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export default function BehindMeterResults() {
  const [, params] = useRoute("/behind-meter/results/:id");
  const [, setLocation] = useLocation();
  const simulationId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const { data: result, isLoading, error } = trpc.behindMeter.getSimulationById.useQuery(
    { id: simulationId },
    { enabled: simulationId > 0 }
  );
  
  const exportMutation = trpc.behindMeter.exportHourlyDetails.useMutation({
    onSuccess: (data) => {
      // Pobieranie pliku
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.fileBase64}`;
      link.download = data.filename;
      link.click();
      toast.success('Plik Excel został pobrany');
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Wystąpił błąd podczas eksportu');
      setIsExporting(false);
    },
  });
  
  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate({ id: simulationId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-4xl">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/behind-meter")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Błąd</CardTitle>
              <CardDescription>
                {error?.message || "Nie znaleziono wyniku symulacji"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Format liczby z separatorami tysięcy
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString("pl-PL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format daty
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/behind-meter")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nowa symulacja
          </Button>
          
          {user?.role === 'admin' && (
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Eksportowanie...' : 'Pobierz szczegółowe dane (Excel)'}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{result.name}</h1>
            <p className="mt-2 text-gray-600">
              Okres: {formatDate(result.startDate)} - {formatDate(result.endDate)}
            </p>
            <p className="text-sm text-gray-500">
              <Calendar className="inline h-4 w-4 mr-1" />
              {new Date(result.createdAt).toLocaleString("pl-PL")}
            </p>
          </div>

          {/* Parametry magazynu */}
          <Card>
            <CardHeader>
              <CardTitle>Parametry magazynu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Pojemność</p>
                  <p className="text-lg font-semibold">{formatNumber(result.capacityMwh)} MWh</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Moc</p>
                  <p className="text-lg font-semibold">{formatNumber(result.powerMw)} MW</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">SoC min</p>
                  <p className="text-lg font-semibold">{formatNumber(result.socMin * 100, 0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">SoC max</p>
                  <p className="text-lg font-semibold">{formatNumber(result.socMax * 100, 0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efektywność</p>
                  <p className="text-lg font-semibold">{formatNumber(result.efficiency * 100, 0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Koszty dystrybucji</p>
                  <p className="text-lg font-semibold">{formatNumber(result.distributionCostPlnMwh, 0)} PLN/MWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wyniki optymalizacji */}
          <Card>
            <CardHeader>
              <CardTitle>Wyniki optymalizacji magazynu</CardTitle>
              <CardDescription>
                Porównanie kosztów energii bez magazynu i z magazynem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Koszt bez magazynu</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(result.totalCostWithoutBatteryPln)} PLN
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Battery className="h-4 w-4" />
                    <span className="text-sm">Koszt z magazynem</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatNumber(result.totalCostWithBatteryPln)} PLN
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Oszczędności</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(result.totalSavingsPln)} PLN
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatNumber((result.totalSavingsPln / result.totalCostWithoutBatteryPln) * 100, 1)}% redukcji kosztów
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Energia ładowana</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatNumber(result.energyChargedMwh)} MWh
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Energia rozładowana</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatNumber(result.energyDischargedMwh)} MWh
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-sm">Liczba cykli</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatNumber(result.numberOfCycles, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wyniki główne */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-900 text-base">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Całkowite zużycie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  {formatNumber(result.totalConsumptionMwh)} MWh
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center text-red-900 text-base">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Wartość energii (bez magazynu)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">
                  {formatNumber(result.totalEnergyCostPln)} PLN
                </div>
                <div className="text-xs text-gray-600 mt-1">Bez dystrybucji</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-900 text-base">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Wartość energii (z magazynem)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">
                  {formatNumber(result.totalEnergyValueWithBatteryPln)} PLN
                </div>
                <div className="text-xs text-gray-600 mt-1">Bez dystrybucji</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-900 text-base">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Średni koszt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">
                  {formatNumber(result.averageCostPerMwh)} PLN/MWh
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wyniki miesięczne */}
          <Card>
            <CardHeader>
              <CardTitle>Rozkład kosztów miesięcznych</CardTitle>
              <CardDescription>
                Szczegółowe dane zużycia i kosztów energii w podziale na miesiące
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Miesiąc</th>
                      <th className="text-right py-3 px-4 font-semibold">Zużycie (MWh)</th>
                      <th className="text-right py-3 px-4 font-semibold">Koszt (PLN)</th>
                      <th className="text-right py-3 px-4 font-semibold">Średni koszt (PLN/MWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.monthlyData.map((month: any, index: number) => {
                      const avgCost = month.consumptionMwh > 0 
                        ? month.costPln / month.consumptionMwh 
                        : 0;
                      
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {new Date(month.month + "-01").toLocaleDateString("pl-PL", {
                              year: "numeric",
                              month: "long",
                            })}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatNumber(month.consumptionMwh)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatNumber(month.costPln)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatNumber(avgCost)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Wiersz podsumowania */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="py-3 px-4">Suma</td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(result.totalConsumptionMwh)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(result.totalEnergyCostPln)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(result.averageCostPerMwh)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
