import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileSpreadsheet, Info, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function BehindMeterSimulation() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [simulationName, setSimulationName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Parametry podstawowe
  const [capacityMwh, setCapacityMwh] = useState(5);
  const [powerMw, setPowerMw] = useState(1);

  // Parametry zaawansowane
  const [socMin, setSocMin] = useState(0.1);
  const [socMax, setSocMax] = useState(0.9);
  const [efficiency, setEfficiency] = useState(0.85);
  const [distributionCostPlnMwh, setDistributionCostPlnMwh] = useState(250);

  const calculateMutation = trpc.behindMeter.calculate.useMutation({
    onSuccess: (data) => {
      toast.success("Symulacja zakończona pomyślnie!");
      setLocation(`/behind-meter/results/${data.simulationId}`);
    },
    onError: (error) => {
      // Jeśli błąd zawiera wiele linii (walidacja), pokaż w dialogu
      if (error.message.includes('\n')) {
        setValidationError(error.message);
      } else {
        toast.error(`Błąd podczas symulacji: ${error.message}`);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      
      // Automatycznie ustaw nazwę symulacji na podstawie nazwy pliku
      if (!simulationName) {
        const fileName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setSimulationName(fileName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Wybierz plik Excel z danymi zużycia");
      return;
    }

    if (!simulationName) {
      toast.error("Podaj nazwę symulacji");
      return;
    }

    // Konwersja pliku do base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const fileBase64 = base64.split(",")[1]; // Usuń prefix

      calculateMutation.mutate({
        name: simulationName,
        fileBase64,
        capacityMwh,
        powerMw,
        socMin,
        socMax,
        efficiency,
        distributionCostPlnMwh,
      });
    };
    reader.readAsDataURL(file);
  };

  const isLoading = calculateMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do strony głównej
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Symulacja rentowności za licznikiem
            </h1>
            <p className="mt-2 text-gray-600">
              Oblicz wartość energii na podstawie danych zużycia i cen RDN
            </p>
          </div>

          {/* Instrukcje dla użytkownika */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Format pliku Excel:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li><strong>Kolumna A (Data):</strong> Data w formacie YYYY-MM-DD (np. 2024-10-01)</li>
                <li><strong>Kolumna B (H):</strong> Godzina (1-24)</li>
                <li><strong>Kolumna C (Pobor_MWh):</strong> Zużycie energii w MWh</li>
                <li><strong>Okres:</strong> Dane powinny obejmować pełny rok (365 dni × 24 godziny = 8760 wierszy)</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">
                Symulacja wykorzysta dane RDN z okresu 01.10.2024 - 30.09.2025
              </p>
            </AlertDescription>
          </Alert>

          {/* Formularz uploadu */}
          <Card>
            <CardHeader>
              <CardTitle>Wgraj dane zużycia energii</CardTitle>
              <CardDescription>
                Wybierz plik Excel z danymi godzinowymi zużycia energii i określ parametry magazynu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nazwa symulacji */}
                <div className="space-y-2">
                  <Label htmlFor="simulation-name">Nazwa symulacji</Label>
                  <Input
                    id="simulation-name"
                    type="text"
                    placeholder="np. Klient A - 2024"
                    value={simulationName}
                    onChange={(e) => setSimulationName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Upload pliku */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Plik Excel z danymi zużycia</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    {file && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>{file.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parametry podstawowe */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Parametry podstawowe</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Pojemność magazynu (MWh)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={capacityMwh}
                        onChange={(e) => setCapacityMwh(parseFloat(e.target.value))}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="power">Moc magazynu (MW)</Label>
                      <Input
                        id="power"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={powerMw}
                        onChange={(e) => setPowerMw(parseFloat(e.target.value))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Parametry zaawansowane */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-between"
                      disabled={isLoading}
                    >
                      <span>Parametry zaawansowane</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showAdvanced ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="soc-min">SoC min (0-1)</Label>
                        <Input
                          id="soc-min"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={socMin}
                          onChange={(e) => setSocMin(parseFloat(e.target.value))}
                          disabled={isLoading}
                        />
                        <p className="text-sm text-gray-500">np. 0,1 = 10%</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="soc-max">SoC max (0-1)</Label>
                        <Input
                          id="soc-max"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={socMax}
                          onChange={(e) => setSocMax(parseFloat(e.target.value))}
                          disabled={isLoading}
                        />
                        <p className="text-sm text-gray-500">np. 0,9 = 90%</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="efficiency">Efektywność (0-1)</Label>
                        <Input
                          id="efficiency"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={efficiency}
                          onChange={(e) => setEfficiency(parseFloat(e.target.value))}
                          disabled={isLoading}
                        />
                        <p className="text-sm text-gray-500">np. 0,85 = 85%</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="distribution-cost">Koszty dystrybucji (PLN/MWh)</Label>
                        <Input
                          id="distribution-cost"
                          type="number"
                          step="1"
                          min="0"
                          value={distributionCostPlnMwh}
                          onChange={(e) => setDistributionCostPlnMwh(parseFloat(e.target.value))}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Przycisk submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#009D8F] hover:bg-[#007d72]"
                >
                  {isLoading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Obliczanie...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Oblicz wartość energii
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog z błędami walidacji */}
      <Dialog open={!!validationError} onOpenChange={() => setValidationError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Błędy walidacji pliku</DialogTitle>
            <DialogDescription>
              Znaleziono problemy w wgranym pliku Excel. Proszę poprawić poniższe błędy i spróbować ponownie.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="whitespace-pre-wrap font-mono text-sm">
              {validationError}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
