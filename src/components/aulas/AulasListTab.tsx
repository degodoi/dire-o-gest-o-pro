import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Filter, CalendarDays, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import LessonForm from "@/components/aulas/LessonForm";

const statusLabels: Record<string, string> = {
  agendada: "Agendada", realizada: "Realizada", cancelada: "Cancelada", reagendada: "Reagendada",
};
const statusColors: Record<string, string> = {
  agendada: "bg-primary/20 text-primary border-primary/30",
  realizada: "bg-success/20 text-success border-success/30",
  cancelada: "bg-destructive/20 text-destructive border-destructive/30",
  reagendada: "bg-warning/20 text-warning border-warning/30",
};
const typeLabels: Record<string, string> = { pratica: "Prática", prova: "Prova" };

export type Lesson = {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  type: string;
  instructor_id: string;
  student_id: string;
  status: string;
  value: number;
  notes: string | null;
  created_at: string;
  employees?: { full_name: string } | null;
  students?: { full_name: string } | null;
};

export default function AulasListTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const queryClient = useQueryClient();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, employees(full_name), students(full_name)")
        .order("date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lessons").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Status atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const filtered = lessons.filter((l) => {
    const instrName = (l.employees as any)?.full_name?.toLowerCase() || "";
    const studName = (l.students as any)?.full_name?.toLowerCase() || "";
    const matchSearch = !search || instrName.includes(search.toLowerCase()) || studName.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  const fmtTime = (t: string) => t.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar instrutor ou aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input/50" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-input/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="realizada">Realizada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="reagendada">Reagendada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditLesson(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nova Aula</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editLesson ? "Editar" : "Registrar"} Aula</DialogTitle>
            </DialogHeader>
            <LessonForm
              lesson={editLesson}
              onSuccess={() => {
                setFormOpen(false);
                setEditLesson(null);
                queryClient.invalidateQueries({ queryKey: ["lessons"] });
                queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma aula encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {(l.students as any)?.full_name || "—"}
                  </p>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {typeLabels[l.type] || l.type}
                  </Badge>
                </div>
                <div className="flex gap-3 items-center mt-0.5">
                  <span className="text-xs text-muted-foreground">{fmtDate(l.date)} às {fmtTime(l.start_time)}</span>
                  <span className="text-xs text-muted-foreground">Instrutor: {(l.employees as any)?.full_name || "—"}</span>
                  <span className="text-xs font-medium text-foreground">R$ {Number(l.value).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Badge variant="outline" className={`text-xs ${statusColors[l.status] ?? ""}`}>
                  {statusLabels[l.status] ?? l.status}
                </Badge>
                {l.status === "agendada" && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" title="Marcar como realizada"
                      onClick={() => updateStatusMutation.mutate({ id: l.id, status: "realizada" })}>
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Cancelar"
                      onClick={() => updateStatusMutation.mutate({ id: l.id, status: "cancelada" })}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
