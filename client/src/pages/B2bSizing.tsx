import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileSpreadsheet, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function B2bSizing() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [profileName, setProfileName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Parametry zaawansowane
  const [maxCyclesPerDay, setMaxCyclesPerDay] = useState(2);
  const [minSpreadPlnMwh, setMinSpreadPlnMwh] = useState(100);
  const [socMin, setSocMin] = useState(0.1);
  const [socMax, setSocMax] = useState(0.9);
  const [efficiency, setEfficiency] = useState(0.85);
  const [distributionCostPlnMwh, setDistributionCostPlnMwh] = useState(250);

  const uploadProfileMutation = trpc.b2b.uploadProfile.useMutation({
    onSuccess: async (data) => {
      toast.success(`Profil "${data.name}" został wgrany pomyślnie`);
      
      // Automatycznie uruchom optymalizację
      optimizeSizeMutation.mutate({
        profileId: data.profileId,
        name: profileName,
        maxCyclesPerDay,
        minSpreadPlnMwh,
        socMin,
        socMax,
        efficiency,
        distributionCostPlnMwh,
      });
    },
    onError: (error) => {
      // Jeśli błąd zawiera wiele linii (walidacja), pokaż w dialogu
      if (error.message.includes('\n')) {
        setValidationError(error.message);
      } else {
        toast.error(`Błąd podczas wgrywania profilu: ${error.message}`);
      }
    },
  });

  const optimizeSizeMutation = trpc.b2b.optimizeSize.useMutation({
    onSuccess: (data) => {
      toast.success("Optymalizacja zakończona pomyślnie!");
      setLocation(`/b2b-sizing/results/${data.sizingId}`);
    },
    onError: (error) => {
      toast.error(`Błąd podczas optymalizacji: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      
      // Automatycznie ustaw nazwę profilu na podstawie nazwy pliku
      if (!profileName) {
        const fileName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setProfileName(fileName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Wybierz plik Excel z profilem klienta");
      return;
    }

    if (!profileName) {
      toast.error("Podaj nazwę profilu");
      return;
    }

    // Konwersja pliku do base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const fileBase64 = base64.split(",")[1]; // Usuń prefix "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,"

      uploadProfileMutation.mutate({
        name: profileName,
        fileBase64,
      });
    };
    reader.readAsDataURL(file);
  };

  const isLoading = uploadProfileMutation.isPending || optimizeSizeMutation.isPending;

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
              Dobierz wielkość magazynu dla B2B
            </h1>
            <p className="mt-2 text-gray-600">
              Optymalizuj wielkość magazynu energii na podstawie profilu zużycia klienta biznesowego
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
                Algorytm wykorzysta dane RDN z okresu 01.10.2024 - 30.09.2025
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Upload profilu klienta</CardTitle>
              <CardDescription>
                Wgraj plik Excel z godzinowym profilem zużycia energii
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nazwa profilu */}
                <div className="space-y-2">
                  <Label htmlFor="profileName">Nazwa profilu *</Label>
                  <Input
                    id="profileName"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="np. Klient ABC - 2024"
                    required
                  />
                </div>

                {/* Upload pliku */}
                <div className="space-y-2">
                  <Label htmlFor="file">Plik Excel *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      required
                    />
                    {file && (
                      <div className="flex items-center text-sm text-gray-600">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {file.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Parametry zaawansowane */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      {showAdvanced ? "Ukryj" : "Pokaż"} parametry zaawansowane
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxCyclesPerDay">Liczba cykli dziennie</Label>
                        <Input
                          id="maxCyclesPerDay"
                          type="number"
                          value={maxCyclesPerDay}
                          onChange={(e) => setMaxCyclesPerDay(Number(e.target.value))}
                          min={1}
                          max={10}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minSpreadPlnMwh">Próg opłacalności (PLN/MWh)</Label>
                        <Input
                          id="minSpreadPlnMwh"
                          type="number"
                          value={minSpreadPlnMwh}
                          onChange={(e) => setMinSpreadPlnMwh(Number(e.target.value))}
                          min={0}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="socMin">SoC min (0-1)</Label>
                        <Input
                          id="socMin"
                          type="number"
                          step="0.01"
                          value={socMin}
                          onChange={(e) => setSocMin(Number(e.target.value))}
                          min={0}
                          max={1}
                        />
                        <p className="text-xs text-gray-500">np. 0.1 = 10%</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="socMax">SoC max (0-1)</Label>
                        <Input
                          id="socMax"
                          type="number"
                          step="0.01"
                          value={socMax}
                          onChange={(e) => setSocMax(Number(e.target.value))}
                          min={0}
                          max={1}
                        />
                        <p className="text-xs text-gray-500">np. 0.9 = 90%</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="efficiency">Efektywność (0-1)</Label>
                        <Input
                          id="efficiency"
                          type="number"
                          step="0.01"
                          value={efficiency}
                          onChange={(e) => setEfficiency(Number(e.target.value))}
                          min={0}
                          max={1}
                        />
                        <p className="text-xs text-gray-500">np. 0.85 = 85%</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="distributionCostPlnMwh">Koszty dystrybucji (PLN/MWh)</Label>
                        <Input
                          id="distributionCostPlnMwh"
                          type="number"
                          value={distributionCostPlnMwh}
                          onChange={(e) => setDistributionCostPlnMwh(Number(e.target.value))}
                          min={0}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Przetwarzanie...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Wgraj i optymalizuj
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Dialog z błędami walidacji */}
      <Dialog open={!!validationError} onOpenChange={(open) => !open && setValidationError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Błędy walidacji pliku Excel</DialogTitle>
            <DialogDescription>
              Znaleziono błędy w pliku. Proszę poprawić plik i spróbować ponownie.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-md">
              {validationError}
            </div>
          </ScrollArea>
          <div className="flex justify-end">
            <Button onClick={() => setValidationError(null)}>
              Zamknij
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
