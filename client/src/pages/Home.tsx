import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Calculator, History, LogOut, Zap, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import { BugReportDialog } from "@/components/BugReportDialog";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #E1E1E1 0%, #047BAAE 100%)'}}>
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/ekovoltis-logo.png" alt="Ekovoltis" className="h-12" />
            </div>
            <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
            <CardDescription className="text-base mt-2">
              Oblicz rentowność magazynu energii na podstawie cen RDN
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <a href={getLoginUrl()}>Zaloguj się</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #E1E1E1 0%, #047BAAE 100%)'}}>
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/ekovoltis-logo.png" alt="Ekovoltis" className="h-12" />
              <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-4">
              <BugReportDialog />
              {user?.role === 'admin' && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">Panel Admina</Link>
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Witaj, {user?.name || user?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    v1.0.0
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Narzędzia Symulacji Magazynów Energii</h2>
            <p className="text-lg text-muted-foreground">
              Wybierz narzędzie odpowiednie do Twoich potrzeb
            </p>
          </div>

          {/* Główne moduły - 3 karty */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Moduł 1: Symulacja przed licznikiem */}
            <Card className="hover:shadow-lg transition-shadow border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Calculator className="h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">Symulacja rentowności przed licznikiem</CardTitle>
                </div>
                <CardDescription>
                  Zasymuluj rentowność magazynu energii na podstawie cen RDN dla instalacji przed licznikiem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" size="lg">
                  <Link href="/new">Rozpocznij symulację</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Moduł 2: Dobór wielkości dla B2B */}
            <Card className="hover:shadow-lg transition-shadow border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">Dobierz wielkość magazynu dla B2B</CardTitle>
                </div>
                <CardDescription>
                  Optymalizuj wielkość magazynu dla klientów biznesowych na podstawie profilu zużycia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" size="lg">
                  <Link href="/b2b-sizing">Rozpocznij dobór wielkości</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Moduł 3: Symulacja za licznikiem */}
            <Card className="hover:shadow-lg transition-shadow border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">Symulacja rentowności za licznikiem</CardTitle>
                </div>
                <CardDescription>
                  Oblicz wartość energii na podstawie danych zużycia i cen RDN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" size="lg">
                  <Link href="/behind-meter">Rozpocznij symulację</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Historia symulacji - osobna sekcja */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <History className="h-8 w-8 text-primary" />
                <CardTitle>Historia Symulacji</CardTitle>
              </div>
              <CardDescription>
                Przeglądaj zapisane symulacje i porównuj wyniki różnych scenariuszy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/history">Zobacz historię</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Sekcja informacyjna */}
          <Card className="mt-12 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Jak to działa?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Wybierz narzędzie</h3>
                  <p className="text-sm text-muted-foreground">
                    Wybierz odpowiednie narzędzie w zależności od typu instalacji (przed/za licznikiem) lub potrzeby doboru wielkości magazynu
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Wprowadź parametry</h3>
                  <p className="text-sm text-muted-foreground">
                    Określ pojemność, moc, efektywność i inne parametry magazynu energii lub profil zużycia
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Otrzymaj wyniki</h3>
                  <p className="text-sm text-muted-foreground">
                    Algorytm obliczy optymalne parametry, cykle ładowania/rozładowania i pokaże KPI oraz rentowność
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
