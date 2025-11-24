import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type BugReportStatus = "new" | "in_progress" | "resolved" | "closed";

const statusConfig: Record<BugReportStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: {
    label: "Nowe",
    icon: <AlertCircle className="w-4 h-4" />,
    variant: "destructive",
  },
  in_progress: {
    label: "W trakcie",
    icon: <Clock className="w-4 h-4" />,
    variant: "default",
  },
  resolved: {
    label: "Rozwiązane",
    icon: <CheckCircle2 className="w-4 h-4" />,
    variant: "secondary",
  },
  closed: {
    label: "Zamknięte",
    icon: <XCircle className="w-4 h-4" />,
    variant: "outline",
  },
};

export default function BugReportsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<BugReportStatus | "all">("all");

  const { data: reports, isLoading, refetch } = trpc.bugReports.getAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateStatusMutation = trpc.bugReports.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status zgłoszenia został zaktualizowany");
      refetch();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleStatusChange = (id: number, status: BugReportStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const filteredReports = reports?.filter(
    (report) => filterStatus === "all" || report.status === filterStatus
  );

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Ładowanie zgłoszeń...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Brak dostępu</h2>
            <p className="text-muted-foreground">
              Ta strona jest dostępna tylko dla administratorów.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Zgłoszenia błędów</h1>
          <p className="text-muted-foreground mt-2">
            Zarządzaj zgłoszeniami błędów od użytkowników
          </p>
        </div>

        {/* Filtry */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtruj po statusie:</span>
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as BugReportStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="new">Nowe</SelectItem>
                <SelectItem value="in_progress">W trakcie</SelectItem>
                <SelectItem value="resolved">Rozwiązane</SelectItem>
                <SelectItem value="closed">Zamknięte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            Łącznie: {filteredReports?.length || 0} zgłoszeń
          </div>
        </div>

        {/* Tabela zgłoszeń */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tytuł</TableHead>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data zgłoszenia</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports && filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-sm">{report.id}</TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {report.title}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{report.userName}</div>
                        <div className="text-muted-foreground">{report.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[report.status as BugReportStatus].variant} className="gap-1">
                        {statusConfig[report.status as BugReportStatus].icon}
                        {statusConfig[report.status as BugReportStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(report.createdAt).toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          Szczegóły
                        </Button>
                        <Select
                          value={report.status}
                          onValueChange={(value) =>
                            handleStatusChange(report.id, value as BugReportStatus)
                          }
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Nowe</SelectItem>
                            <SelectItem value="in_progress">W trakcie</SelectItem>
                            <SelectItem value="resolved">Rozwiązane</SelectItem>
                            <SelectItem value="closed">Zamknięte</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="text-muted-foreground">
                      {filterStatus === "all"
                        ? "Brak zgłoszeń"
                        : `Brak zgłoszeń ze statusem "${statusConfig[filterStatus as BugReportStatus]?.label}"`}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog szczegółów zgłoszenia */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Szczegóły zgłoszenia #{selectedReport?.id}</DialogTitle>
            <DialogDescription>
              Zgłoszono: {selectedReport && new Date(selectedReport.createdAt).toLocaleString("pl-PL")}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Tytuł</h3>
                <p className="text-sm">{selectedReport.title}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Opis</h3>
                <p className="text-sm whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Użytkownik</h3>
                  <p className="text-sm">{selectedReport.userName}</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.userEmail}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Status</h3>
                  <Badge variant={statusConfig[selectedReport.status as BugReportStatus].variant} className="gap-1">
                    {statusConfig[selectedReport.status as BugReportStatus].icon}
                    {statusConfig[selectedReport.status as BugReportStatus].label}
                  </Badge>
                </div>
              </div>
              {selectedReport.pageUrl && (
                <div>
                  <h3 className="font-semibold mb-1">Strona</h3>
                  <p className="text-sm text-muted-foreground break-all">{selectedReport.pageUrl}</p>
                </div>
              )}
              {selectedReport.userAgent && (
                <div>
                  <h3 className="font-semibold mb-1">Przeglądarka</h3>
                  <p className="text-sm text-muted-foreground break-all">{selectedReport.userAgent}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold">Utworzono:</span>{" "}
                  {new Date(selectedReport.createdAt).toLocaleString("pl-PL")}
                </div>
                <div>
                  <span className="font-semibold">Zaktualizowano:</span>{" "}
                  {new Date(selectedReport.updatedAt).toLocaleString("pl-PL")}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
