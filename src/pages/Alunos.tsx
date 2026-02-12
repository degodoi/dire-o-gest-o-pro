import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Eye, Loader2, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentForm from "@/components/students/StudentForm";
import StudentDetail from "@/components/students/StudentDetail";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";
import { useAuth } from "@/contexts/AuthContext";

export type Student = {
  id: string;
  full_name: string;
  rg: string | null;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  category: string;
  enrollment_date: string;
  photo_url: string | null;
  status: string;
  course_value: number;
  installments_count: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  em_formacao: "Em Formação",
  formado: "Formado",
  desistente: "Desistente",
};

const statusColors: Record<string, string> = {
  ativo: "bg-success/20 text-success border-success/30",
  em_formacao: "bg-primary/20 text-primary border-primary/30",
  formado: "bg-muted text-muted-foreground",
  desistente: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function Alunos() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Student[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Aluno excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir aluno", variant: "destructive" });
    },
  });

  const filtered = students.filter((s) => {
    const matchSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (s.cpf?.includes(search) ?? false);
    const matchCategory = filterCategory === "all" || s.category === filterCategory;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Alunos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} aluno{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => { setEditingStudent(null); setIsFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Aluno
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input/50" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px] bg-input/50"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="A">Cat. A</SelectItem>
            <SelectItem value="B">Cat. B</SelectItem>
            <SelectItem value="AB">Cat. AB</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] bg-input/50"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="em_formacao">Em Formação</SelectItem>
            <SelectItem value="formado">Formado</SelectItem>
            <SelectItem value="desistente">Desistente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum aluno encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((student, i) => (
            <Card key={student.id} className="bg-card border-border/50 hover:border-border hover-lift transition-all animate-slide-up" style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'both' }}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-border/30">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.email ?? "—"}</p>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs">Cat. {student.category}</Badge>
                <Badge variant="outline" className={`text-xs ${statusColors[student.status] ?? ""}`}>
                  {statusLabels[student.status] ?? student.status}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewingStudent(student)} className="hover:bg-primary/10 hover:text-primary transition-colors"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingStudent(student); setIsFormOpen(true); }} className="hover:bg-primary/10 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></Button>
                  {role === "admin" && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setDeletingStudent(student)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={() => { setIsFormOpen(false); setEditingStudent(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
          </DialogHeader>
          <StudentForm student={editingStudent} onClose={() => { setIsFormOpen(false); setEditingStudent(null); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingStudent} onOpenChange={() => setViewingStudent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do Aluno</DialogTitle>
          </DialogHeader>
          {viewingStudent && <StudentDetail student={viewingStudent} />}
        </DialogContent>
      </Dialog>
      <AdminPasswordDialog
        open={!!deletingStudent}
        onOpenChange={(v) => !v && setDeletingStudent(null)}
        title="Excluir aluno?"
        description={`Tem certeza que deseja excluir ${deletingStudent?.full_name}? Todas as parcelas vinculadas também serão removidas.`}
        onConfirm={async () => {
          if (deletingStudent) {
            await deleteMutation.mutateAsync(deletingStudent.id);
            setDeletingStudent(null);
          }
        }}
      />
    </div>
  );
}
