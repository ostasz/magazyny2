import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NewCalculation from "./pages/NewCalculation";
import CalculationResults from "./pages/CalculationResults";
import History from "./pages/History";
import AdminPanel from "./pages/AdminPanel";
import BugReportsAdmin from "./pages/BugReportsAdmin";
import B2bSizing from "./pages/B2bSizing";
import B2bSizingResults from "./pages/B2bSizingResults";
import BehindMeterSimulation from "./pages/BehindMeterSimulation";
import BehindMeterResults from "./pages/BehindMeterResults";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/new"} component={NewCalculation} />
      <Route path={"/calculation/:id"} component={CalculationResults} />
      <Route path={"/history"} component={History} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/admin/bug-reports"} component={BugReportsAdmin} />
      <Route path={"/b2b-sizing"} component={B2bSizing} />
      <Route path={"/b2b-sizing/results/:id"} component={B2bSizingResults} />
      <Route path={"/behind-meter"} component={BehindMeterSimulation} />
      <Route path={"/behind-meter/results/:id"} component={BehindMeterResults} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
