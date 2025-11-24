import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE } from "@/const";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function History() {
  const { data: calculations, isLoading } = trpc.calculator.list.useQuery();
  
  const formatNumber = (num: number | null | undefined, decimals: number = 2) => {
    if (num === null || num === undefined) return "—";
    return num.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('pl-PL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Historia Symulacji</CardTitle>
              <CardDescription>
                Przeglądaj wszystkie wykonane symulacje rentowności magazynu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="mt-4 text-muted-foreground">Ładowanie historii...</p>
                </div>
              ) : !calculations || calculations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych symulacji</p>
                  <Button asChild>
                    <Link href="/new">Utwórz pierwszą symulację</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa</TableHead>
                        <TableHead>Data utworzenia</TableHead>
                        <TableHead>Pojemność</TableHead>
                        <TableHead>Moc</TableHead>
                        <TableHead className="text-right">Zysk (PLN)</TableHead>
                        <TableHead className="text-center">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculations.map((calc) => (
                        <TableRow key={calc.id}>
                          <TableCell className="font-medium">{calc.name}</TableCell>
                          <TableCell>{formatDate(calc.createdAt)}</TableCell>
                          <TableCell>{formatNumber(calc.capacityMwh, 1)} MWh</TableCell>
                          <TableCell>{formatNumber(calc.powerMw, 1)} MW</TableCell>
                          <TableCell className="text-right">
                            <span className={calc.profitPln && calc.profitPln > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                              {formatNumber(calc.profitPln, 2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/calculation/${calc.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Zobacz
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
