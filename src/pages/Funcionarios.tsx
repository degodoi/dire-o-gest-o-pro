import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Eye, Loader2, UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmployeeForm, { type EmployeeFormData } from "@/components/employees/EmployeeForm";
import EmployeeDetail from "@/components/employees/EmployeeDetail";

type Employee = {
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
  role: "admin" | "secretaria" | "instrutor";
  hire_date: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
  instrutor: "Instrutor",
};

export default function Funcionarios() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Funcionário excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir funcionário", variant: "destructive" });
    },
  });

  const filtered = employees.filter((emp) => {
    const matchSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (emp.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchRole = filterRole === "all" || emp.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? emp.is_active : !emp.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Funcionários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} funcionário{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Funcionário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input/50"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px] bg-input/50">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="secretaria">Secretaria</SelectItem>
            <SelectItem value="instrutor">Instrutor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-input/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <UserCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum funcionário encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp, i) => (
            <Card key={emp.id} className="bg-card border-border/50 hover:border-border hover-lift transition-all animate-slide-up" style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'both' }}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Photo */}
                <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-border/30">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.email ?? "—"}</p>
                </div>

                {/* Role badge */}
                <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                  {roleLabels[emp.role]}
                </Badge>

                {/* Status */}
                <Badge
                  variant={emp.is_active ? "default" : "outline"}
                  className={`text-xs ${emp.is_active ? "bg-success/20 text-success border-success/30" : "text-muted-foreground"}`}
                >
                  {emp.is_active ? "Ativo" : "Inativo"}
                </Badge>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewingEmployee(emp)} className="hover:bg-primary/10 hover:text-primary transition-colors">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)} className="hover:bg-primary/10 hover:text-primary transition-colors">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{emp.full_name}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(emp.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
            </DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            onClose={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewingEmployee} onOpenChange={() => setViewingEmployee(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do Funcionário</DialogTitle>
          </DialogHeader>
          {viewingEmployee && <EmployeeDetail employee={viewingEmployee} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
