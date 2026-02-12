import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";
import { Search, Filter, CheckCircle2, Loader2, ChevronDown, ChevronRight, Trash2, Pencil, GraduationCap } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = { pendente: "Pendente", paga: "Paga", atrasada: "Atrasada" };
const statusColors: Record<string, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  paga: "bg-success/20 text-success border-success/30",
  atrasada: "bg-destructive/20 text-destructive border-destructive/30",
};

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
];

type Payment = {
  id: string;
  student_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
  receipt_url: string | null;
  students?: { full_name: string; category: string } | null;
};

export default function FinanceiroParcelasTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payDialog, setPayDialog] = useState<Payment | null>(null);
  const [editDialog, setEditDialog] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [payMethod, setPayMethod] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [openStudents, setOpenStudents] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_payments")
        .select("*, students(full_name, category)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      const today = format(new Date(), "yyyy-MM-dd");
      return (data as Payment[]).map((p) => ({
        ...p,
        status: p.status === "pendente" && p.due_date < today ? "atrasada" : p.status,
      }));
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["all-payments"] });
    queryClient.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const payMutation = useMutation({
    mutationFn: async ({ id, method, paidDate }: { id: string; method: string; paidDate: string }) => {
      const { error } = await supabase.from("student_payments").update({
        status: "paga", payment_method: method, paid_date: paidDate,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setPayDialog(null); toast({ title: "Parcela marcada como paga!" }); },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, amount, due_date, status, payment_method }: { id: string; amount: number; due_date: string; status: string; payment_method: string | null }) => {
      const { error } = await supabase.from("student_payments").update({
        amount, due_date, status, payment_method: payment_method || null,
        paid_date: status === "paga" ? format(new Date(), "yyyy-MM-dd") : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setEditDialog(null); toast({ title: "Parcela atualizada!" }); },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Parcela excluída!" }); },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const filtered = payments.filter((p) => {
    const name = (p.students as any)?.full_name?.toLowerCase() || "";
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Group by student
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; category: string; payments: Payment[]; totalPending: number; totalPaid: number }>();
    for (const p of filtered) {
      const sid = p.student_id;
      if (!map.has(sid)) {
        map.set(sid, {
          name: (p.students as any)?.full_name || "—",
          category: (p.students as any)?.category || "",
          payments: [],
          totalPending: 0,
          totalPaid: 0,
        });
      }
      const group = map.get(sid)!;
      group.payments.push(p);
      if (p.status === "paga") group.totalPaid += Number(p.amount);
      else group.totalPending += Number(p.amount);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filtered]);

  const toggleStudent = (id: string) => {
    setOpenStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  const fmtMoney = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input/50" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-input/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : grouped.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma parcela encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(([studentId, group]) => {
            const isOpen = openStudents.has(studentId);
            const overdueCount = group.payments.filter(p => p.status === "atrasada").length;
            return (
              <Collapsible key={studentId} open={isOpen} onOpenChange={() => toggleStudent(studentId)}>
                <Card className="bg-card border-border/50 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left">
                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {group.name}
                          <span className="text-muted-foreground font-normal ml-2">Cat. {group.category}</span>
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{group.payments.length} parcela{group.payments.length !== 1 ? "s" : ""}</span>
                          {group.totalPaid > 0 && <span className="text-success">Pago: {fmtMoney(group.totalPaid)}</span>}
                          {group.totalPending > 0 && <span className="text-warning">Pendente: {fmtMoney(group.totalPending)}</span>}
                        </div>
                      </div>
                      {overdueCount > 0 && (
                        <Badge variant="outline" className="text-xs bg-destructive/20 text-destructive border-destructive/30">
                          {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {group.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2.5 px-4 hover:bg-accent/20 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground">
                              Parcela {p.installment_number}
                              <span className="text-muted-foreground ml-2">· Venc: {fmtDate(p.due_date)}</span>
                            </p>
                            {p.paid_date && <span className="text-xs text-success">Pago em {fmtDate(p.paid_date)} {p.payment_method ? `· ${p.payment_method}` : ""}</span>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <span className="text-sm font-semibold text-foreground">{fmtMoney(Number(p.amount))}</span>
                            <Badge variant="outline" className={`text-xs ${statusColors[p.status] ?? ""}`}>
                              {statusLabels[p.status] ?? p.status}
                            </Badge>
                            {p.status !== "paga" && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                                setPayDialog(p); setPayMethod(""); setPayDate(format(new Date(), "yyyy-MM-dd"));
                              }}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />Pagar
                              </Button>
                            )}
                            {role === "admin" && (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => {
                                  setEditDialog(p);
                                  setEditAmount(String(p.amount));
                                  setEditDueDate(p.due_date);
                                  setEditStatus(p.status === "atrasada" ? "pendente" : p.status);
                                  setEditMethod(p.payment_method || "");
                                }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingPayment(p)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Pay dialog */}
      <Dialog open={!!payDialog} onOpenChange={(v) => !v && setPayDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Parcela {payDialog.installment_number} — {fmtMoney(Number(payDialog.amount))}
              </p>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Pagamento *</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="bg-input/50" />
              </div>
              <Button className="w-full" disabled={!payMethod || payMutation.isPending}
                onClick={() => payMutation.mutate({ id: payDialog.id, method: payMethod, paidDate: payDate })}>
                {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmar Pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDialog} onOpenChange={(v) => !v && setEditDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Parcela</DialogTitle></DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {(editDialog.students as any)?.full_name} · Parcela {editDialog.installment_number}
              </p>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-input/50" />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="bg-input/50" />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={editMethod} onValueChange={setEditMethod}>
                  <SelectTrigger className="bg-input/50"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!editAmount || !editDueDate || editMutation.isPending}
                onClick={() => editMutation.mutate({
                  id: editDialog.id,
                  amount: parseFloat(editAmount),
                  due_date: editDueDate,
                  status: editStatus,
                  payment_method: editMethod || null,
                })}>
                {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AdminPasswordDialog
        open={!!deletingPayment}
        onOpenChange={(v) => !v && setDeletingPayment(null)}
        title="Excluir parcela?"
        description={`Deseja excluir a parcela ${deletingPayment?.installment_number} no valor de ${fmtMoney(Number(deletingPayment?.amount || 0))}?`}
        onConfirm={async () => {
          if (deletingPayment) {
            await deleteMutation.mutateAsync(deletingPayment.id);
            setDeletingPayment(null);
          }
        }}
      />
    </div>
  );
}
