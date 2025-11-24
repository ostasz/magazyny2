import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Battery, Zap, Calendar, Settings, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function B2bSizingResults() {
  const [, params] = useRoute("/b2b-sizing/results/:id");
  const [, setLocation] = useLocation();
  const sizingId = params?.id ? parseInt(params.id) : 0;

  const { data: result, isLoading, error } = trpc.b2b.getSizingResultById.useQuery(
    { id: sizingId },
    { enabled: sizingId > 0 }
  );

  const [isExporting, setIsExporting] = useState(false);
  const exportPdfMutation = trpc.b2b.exportToPdf.useMutation({
    onSuccess: (data) => {
      if (!data || !data.pdfBase64) {
        toast.error('Brak danych PDF w odpowiedzi serwera');
        setIsExporting(false);
        return;
      }
      
      // Prosta konwersja base64 do data URL (jak w CalculationResults)
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdfBase64}`;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Raport PDF został wygenerowany!');
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(`Błąd podczas generowania PDF: ${error.message}`);
      setIsExporting(false);
    },
  });

  const handleExportPdf = () => {
    setIsExporting(true);
    exportPdfMutation.mutate({ id: sizingId });
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
            onClick={() => setLocation("/b2b-sizing")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Błąd</CardTitle>
              <CardDescription>
                {error?.message || "Nie znaleziono wyniku optymalizacji"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/b2b-sizing")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nowa optymalizacja
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{result.name}</h1>
            <p className="mt-2 text-gray-600">
              Profil: {result.profileName}
            </p>
            <p className="text-sm text-gray-500">
              <Calendar className="inline h-4 w-4 mr-1" />
              {new Date(result.createdAt).toLocaleString("pl-PL")}
            </p>
          </div>

          {/* Rekomendacje */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-900">
                  <Battery className="mr-2 h-5 w-5" />
                  Pojemność
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">
                  {result.recommendedCapacityMwh.toFixed(2)} MWh
                </div>
                <p className="text-sm text-blue-700 mt-1">Rekomendowana pojemność magazynu</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-900">
                  <Zap className="mr-2 h-5 w-5" />
                  Moc
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">
                  {result.recommendedPowerMw.toFixed(2)} MW
                </div>
                <p className="text-sm text-purple-700 mt-1">Rekomendowana moc magazynu</p>
              </CardContent>
            </Card>


          </div>

          {/* Parametry symulacji */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Parametry symulacji
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Liczba cykli dziennie</div>
                  <div className="font-semibold">{result.maxCyclesPerDay}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Próg opłacalności</div>
                  <div className="font-semibold">{result.minSpreadPlnMwh} PLN/MWh</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">SoC min</div>
                  <div className="font-semibold">{(result.socMin * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">SoC max</div>
                  <div className="font-semibold">{(result.socMax * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Efektywność</div>
                  <div className="font-semibold">{(result.efficiency * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Koszty dystrybucji</div>
                  <div className="font-semibold">{result.distributionCostPlnMwh} PLN/MWh</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex-1"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? 'Generowanie PDF...' : 'Eksportuj do PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/b2b-sizing")}
              className="flex-1"
            >
              Nowa optymalizacja
            </Button>
            <Button
              onClick={() => setLocation("/")}
              className="flex-1"
            >
              Powrót do strony głównej
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
