import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Search, Filter, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = { pendente: "Pendente", paga: "Paga", atrasada: "Atrasada" };
const statusColors: Record<string, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  paga: "bg-success/20 text-success border-success/30",
  atrasada: "bg-destructive/20 text-destructive border-destructive/30",
};

const PAYMENT_METHODS = ["Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência"];

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
  const [payMethod, setPayMethod] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_payments")
        .select("*, students(full_name, category)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      // Mark overdue
      const today = format(new Date(), "yyyy-MM-dd");
      return (data as Payment[]).map((p) => ({
        ...p,
        status: p.status === "pendente" && p.due_date < today ? "atrasada" : p.status,
      }));
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, method, paidDate }: { id: string; method: string; paidDate: string }) => {
      const { error } = await supabase.from("student_payments").update({
        status: "paga",
        payment_method: method,
        paid_date: paidDate,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPayDialog(null);
      toast({ title: "Parcela marcada como paga!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const filtered = payments.filter((p) => {
    const name = (p.students as any)?.full_name?.toLowerCase() || "";
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

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

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma parcela encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {(p.students as any)?.full_name || "—"}{" "}
                  <span className="text-muted-foreground font-normal">· Parcela {p.installment_number}</span>
                </p>
                <div className="flex gap-2 items-center mt-0.5">
                  <span className="text-xs text-muted-foreground">Venc: {fmtDate(p.due_date)}</span>
                  {p.paid_date && <span className="text-xs text-success">Pago: {fmtDate(p.paid_date)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-sm font-semibold text-foreground">R$ {Number(p.amount).toFixed(2).replace(".", ",")}</span>
                <Badge variant="outline" className={`text-xs ${statusColors[p.status] ?? ""}`}>
                  {statusLabels[p.status] ?? p.status}
                </Badge>
                {p.status !== "paga" && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                    setPayDialog(p);
                    setPayMethod("");
                    setPayDate(format(new Date(), "yyyy-MM-dd"));
                  }}>
                    <CheckCircle2 className="w-3 h-3 mr-1" />Pagar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay dialog */}
      <Dialog open={!!payDialog} onOpenChange={(v) => !v && setPayDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Parcela {payDialog.installment_number} — R$ {Number(payDialog.amount).toFixed(2).replace(".", ",")}
              </p>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Pagamento *</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="bg-input/50" />
              </div>
              <Button
                className="w-full"
                disabled={!payMethod || payMutation.isPending}
                onClick={() => payMutation.mutate({ id: payDialog.id, method: payMethod, paidDate: payDate })}
              >
                {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirmar Pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
