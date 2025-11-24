import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_TITLE } from "@/const";
import { ArrowLeft, Calculator, ChevronDown, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";


export default function NewCalculation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Stan formularza
  const [name, setName] = useState("");
  const [maxCyclesPerDay, setMaxCyclesPerDay] = useState(2);
  const [minSpreadPlnMwh, setMinSpreadPlnMwh] = useState(100);
  const [capacityMwh, setCapacityMwh] = useState(5);
  const [powerMw, setPowerMw] = useState(1);
  const [socMin, setSocMin] = useState(0.1);
  const [socMax, setSocMax] = useState(0.9);
  const [efficiency, setEfficiency] = useState(0.85);
  const [distributionCostPlnMwh, setDistributionCostPlnMwh] = useState(250);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Pobranie metadanych globalnych cen
  const { data: pricesMetadata } = trpc.admin.getGlobalRdnPricesMetadata.useQuery();
  
  const calculateMutation = trpc.calculator.calculate.useMutation({
    onSuccess: (data) => {
      toast.success("Symulacja zakończona pomyślnie!");
      setLocation(`/calculation/${data.calculationId}`);
    },
    onError: (error) => {
      toast.error(`Błąd symulacji: ${error.message}`);
    },
  });
  

  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nazwa symulacji jest wymagana");
      return;
    }
    
    if (!pricesMetadata) {
      toast.error("Brak globalnych cen RDN. Skontaktuj się z administratorem.");
      return;
    }
    
    if (socMax < socMin) {
      toast.error("SoC max musi być większy lub równy SoC min");
      return;
    }
    
    calculateMutation.mutate({
      params: {
        name,
        maxCyclesPerDay,
        minSpreadPlnMwh,
        capacityMwh,
        powerMw,
        socMin,
        socMax,
        efficiency,
        distributionCostPlnMwh,
      },
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Nowa Symulacja</CardTitle>
              <CardDescription>
                Wprowadź parametry magazynu energii. Aplikacja korzysta z globalnych cen RDN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Nazwa symulacji */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nazwa symulacji *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Magazyn 5MWh - Październik 2024"
                    required
                  />
                </div>

                {/* Informacja o globalnych cenach */}
                <div className="space-y-2">
                  <Label>Dane cenowe RDN</Label>
                  {pricesMetadata ? (
                    <Alert>
                      <AlertDescription>
                        Aplikacja korzysta z globalnych cen RDN wgranych przez administratora.
                        <br />
                        <strong>Okres danych:</strong> {new Date(pricesMetadata.startDate).toLocaleDateString('pl-PL')} - {new Date(pricesMetadata.endDate).toLocaleDateString('pl-PL')}
                        <br />
                        <strong>Liczba rekordów:</strong> {pricesMetadata.rowCount}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Brak danych cenowych RDN. Skontaktuj się z administratorem.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Parametry podstawowe */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Parametry podstawowe</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Pojemność magazynu (MWh)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={capacityMwh}
                        onChange={(e) => setCapacityMwh(Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="power">Moc magazynu (MW)</Label>
                      <Input
                        id="power"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={powerMw}
                        onChange={(e) => setPowerMw(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Przycisk zaawansowane */}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full"
                  >
                    <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    Parametry zaawansowane
                  </Button>
                </div>

                {/* Parametry zaawansowane */}
                {showAdvanced && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxCycles">Liczba cykli dziennie</Label>
                        <Input
                          id="maxCycles"
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          value={maxCyclesPerDay}
                          onChange={(e) => setMaxCyclesPerDay(Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="minSpread">Próg opłacalności (PLN/MWh)</Label>
                        <Input
                          id="minSpread"
                          type="number"
                          min="0"
                          step="0.01"
                          value={minSpreadPlnMwh}
                          onChange={(e) => setMinSpreadPlnMwh(Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="socMin">SoC min (0-1)</Label>
                        <Input
                          id="socMin"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={socMin}
                          onChange={(e) => setSocMin(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">np. 0.1 = 10%</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="socMax">SoC max (0-1)</Label>
                        <Input
                          id="socMax"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={socMax}
                          onChange={(e) => setSocMax(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">np. 0.9 = 90%</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="efficiency">Efektywność (0-1)</Label>
                        <Input
                          id="efficiency"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={efficiency}
                          onChange={(e) => setEfficiency(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">np. 0.85 = 85%</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="distCost">Koszty dystrybucji (PLN/MWh)</Label>
                        <Input
                          id="distCost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={distributionCostPlnMwh}
                          onChange={(e) => setDistributionCostPlnMwh(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Przyciski */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={calculateMutation.isPending || !pricesMetadata}
                    className="flex-1"
                  >
                    {calculateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Obliczanie...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-5 w-5" />
                        Zasymuluj rentowność
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
