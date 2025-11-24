import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_TITLE } from "@/const";
import { ArrowLeft, Upload, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface RdnPrice {
  date: string;
  hour: number;
  priceRdnPlnMwh: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Stan pliku
  const [prices, setPrices] = useState<RdnPrice[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  
  const { data: pricesMetadata, refetch } = trpc.admin.getGlobalRdnPricesMetadata.useQuery();
  
  const uploadMutation = trpc.admin.uploadGlobalRdnPrices.useMutation({
    onSuccess: (data) => {
      toast.success(`Pomyślnie wgrano ${data.count} rekordów cenowych!`);
      setPrices([]);
      setFileName("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Błąd uploadu: ${error.message}`);
    },
  });
  
  // Sprawdzenie uprawnień
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Brak uprawnień</CardTitle>
            <CardDescription>
              Ta strona jest dostępna tylko dla administratorów.
            </CardDescription>
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
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setFileError("");
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Odczytanie pierwszego arkusza
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Znalezienie nagłówków
        let headerRow = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          const hasDate = row.some((cell: any) => 
            typeof cell === 'string' && (cell.toLowerCase().includes('data') || cell.toLowerCase().includes('date'))
          );
          const hasHour = row.some((cell: any) => 
            typeof cell === 'string' && (cell.toLowerCase().includes('h') || cell.toLowerCase().includes('hour') || cell.toLowerCase().includes('godzina'))
          );
          const hasPrice = row.some((cell: any) => 
            typeof cell === 'string' && (cell.toLowerCase().includes('cena') || cell.toLowerCase().includes('price') || cell.toLowerCase().includes('rdn'))
          );
          
          if (hasDate && hasHour && hasPrice) {
            headerRow = i;
            break;
          }
        }
        
        const headers = jsonData[headerRow].map((h: any) => String(h).toLowerCase().trim());
        const dateIdx = headers.findIndex((h: string) => h.includes('data') || h.includes('date'));
        const hourIdx = headers.findIndex((h: string) => h === 'h' || h.includes('hour') || h.includes('godzina'));
        const priceIdx = headers.findIndex((h: string) => h.includes('cena') || h.includes('price') || h.includes('rdn'));
        
        if (dateIdx === -1 || hourIdx === -1 || priceIdx === -1) {
          setFileError("Nie znaleziono wymaganych kolumn: Data, H, CenaRDN");
          setPrices([]);
          return;
        }
        
        // Parsowanie danych
        const parsedPrices: RdnPrice[] = [];
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const dateValue = row[dateIdx];
          const hourValue = row[hourIdx];
          const priceValue = row[priceIdx];
          
          if (dateValue === undefined || hourValue === undefined || priceValue === undefined) continue;
          
          // Parsowanie daty
          let dateStr: string;
          if (typeof dateValue === 'number') {
            // Excel serial date
            const date = XLSX.SSF.parse_date_code(dateValue);
            dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          } else {
            // String date
            const dateObj = new Date(dateValue);
            if (isNaN(dateObj.getTime())) continue;
            dateStr = dateObj.toISOString().split('T')[0];
          }
          
          const hour = Number(hourValue);
          const price = Number(priceValue);
          
          if (isNaN(hour) || isNaN(price)) continue;
          if (hour < 1 || hour > 24) continue;
          
          parsedPrices.push({
            date: dateStr,
            hour: hour,
            priceRdnPlnMwh: price,
          });
        }
        
        if (parsedPrices.length === 0) {
          setFileError("Nie znaleziono poprawnych danych w pliku");
          setPrices([]);
          return;
        }
        
        setPrices(parsedPrices);
        toast.success(`Wczytano ${parsedPrices.length} rekordów cenowych`);
      } catch (error) {
        setFileError(`Błąd parsowania pliku: ${error}`);
        setPrices([]);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (prices.length === 0) {
      toast.error("Wgraj plik z cenami RDN");
      return;
    }
    
    uploadMutation.mutate({ prices });
  };
  
  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #E1E1E1 0%, #047BAAE 100%)'}}>
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Panel Administratora</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Szybkie akcje */}
          <Card>
            <CardHeader>
              <CardTitle>Szybkie akcje</CardTitle>
              <CardDescription>
                Przejdź do innych sekcji panelu administracyjnego
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild variant="outline">
                  <Link href="/admin/bug-reports">
                    Zarządzaj zgłoszeniami błędów
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Aktualne dane */}
          <Card>
            <CardHeader>
              <CardTitle>Aktualne dane cenowe RDN</CardTitle>
              <CardDescription>
                Dane używane przez wszystkich użytkowników aplikacji
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pricesMetadata ? (
                <div className="space-y-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Okres danych</p>
                      <p className="font-semibold">
                        {new Date(pricesMetadata.startDate).toLocaleDateString('pl-PL')} - {new Date(pricesMetadata.endDate).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Liczba rekordów</p>
                      <p className="font-semibold">{pricesMetadata.rowCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data uploadu</p>
                      <p className="font-semibold">
                        {new Date(pricesMetadata.uploadedAt).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Brak danych cenowych w systemie. Wgraj plik z cenami RDN poniżej.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Upload nowych danych */}
          <Card>
            <CardHeader>
              <CardTitle>Wgraj nowe dane cenowe</CardTitle>
              <CardDescription>
                Nowe dane zastąpią obecne ceny. Wszyscy użytkownicy będą korzystać z nowych danych.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file">Plik z cenami RDN (Excel) *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Format: kolumny Data, Godzina (H), Cena RDN (PLN/MWh)
                  </p>
                  {fileName && (
                    <p className="text-sm text-muted-foreground">
                      Wczytano: {fileName} ({prices.length} rekordów)
                    </p>
                  )}
                  {fileError && (
                    <Alert variant="destructive">
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={uploadMutation.isPending || prices.length === 0}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wgrywanie...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Wgraj dane cenowe
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
