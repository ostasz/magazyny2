import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bug } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function BugReportDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createBugReport = trpc.bugReports.create.useMutation({
    onSuccess: () => {
      toast.success("Zgłoszenie wysłane!", {
        description: "Dziękujemy za zgłoszenie błędu. Skontaktujemy się z Tobą wkrótce.",
      });
      setOpen(false);
      setTitle("");
      setDescription("");
    },
    onError: (error) => {
      toast.error("Błąd podczas wysyłania zgłoszenia", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    createBugReport.mutate({
      title: title.trim(),
      description: description.trim(),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bug className="h-4 w-4 mr-2" />
          Zgłoś błąd
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Zgłoś błąd</DialogTitle>
            <DialogDescription>
              Opisz napotkany problem. Twoje zgłoszenie zostanie wysłane do zespołu technicznego.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                placeholder="Krótki opis problemu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Szczegółowy opis *</Label>
              <Textarea
                id="description"
                placeholder="Opisz szczegółowo napotkany problem, kroki do odtworzenia, oczekiwane zachowanie..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createBugReport.isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={createBugReport.isPending}>
              {createBugReport.isPending ? "Wysyłanie..." : "Wyślij zgłoszenie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
