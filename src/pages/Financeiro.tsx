import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet,
  Plus, Search, Filter, CreditCard, CheckCircle2, Trash2,
} from "lucide-react";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import FinanceiroParcelasTab from "@/components/financeiro/ParcelasTab";
import TransactionForm from "@/components/financeiro/TransactionForm";

type Transaction = {
  id: string;
  type: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  payment_method: string | null;
  created_at: string;
};

const CHART_COLORS = [
  "hsl(213, 80%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 65%, 60%)",
  "hsl(180, 60%, 45%)",
];

export default function Financeiro() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão financeira completa</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-accent/50">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <FinanceiroDashboard />
        </TabsContent>
        <TabsContent value="parcelas" className="mt-6">
          <FinanceiroParcelasTab />
        </TabsContent>
        <TabsContent value="movimentacoes" className="mt-6">
          <MovimentacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ==================== DASHBOARD ==================== */
function FinanceiroDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["financeiro-dashboard"],
    queryFn: async () => {
      const [paymentsRes, transactionsRes] = await Promise.all([
        supabase.from("student_payments").select("amount, status, paid_date, due_date"),
        supabase.from("transactions").select("type, category, amount, date"),
      ]);
      const payments = paymentsRes.data ?? [];
      const transactions = transactionsRes.data ?? [];

      const now = new Date();
      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
      const today = format(now, "yyyy-MM-dd");

      // Payment stats
      const paidThisMonth = payments
        .filter((p: any) => p.status === "paga" && p.paid_date && p.paid_date >= monthStart)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);

      const pendingTotal = payments
        .filter((p: any) => p.status === "pendente")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);

      const overdueTotal = payments
        .filter((p: any) => p.status === "pendente" && p.due_date < today)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);

      // Transaction stats
      const receitasMonth = transactions
        .filter((t: any) => t.type === "receita" && t.date >= monthStart)
        .reduce((s: number, t: any) => s + Number(t.amount), 0);

      const despesasMonth = transactions
        .filter((t: any) => t.type === "despesa" && t.date >= monthStart)
        .reduce((s: number, t: any) => s + Number(t.amount), 0);

      // Monthly chart data (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStart = format(d, "yyyy-MM-dd");
        const mEnd = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd");
        const label = format(d, "MMM", { locale: ptBR });

        const rec = payments.filter((p: any) => p.status === "paga" && p.paid_date >= mStart && p.paid_date <= mEnd)
          .reduce((s: number, p: any) => s + Number(p.amount), 0) +
          transactions.filter((t: any) => t.type === "receita" && t.date >= mStart && t.date <= mEnd)
          .reduce((s: number, t: any) => s + Number(t.amount), 0);

        const desp = transactions.filter((t: any) => t.type === "despesa" && t.date >= mStart && t.date <= mEnd)
          .reduce((s: number, t: any) => s + Number(t.amount), 0);

        monthlyData.push({ name: label, receitas: rec, despesas: desp });
      }

      // Category breakdown for expenses
      const categoryMap: Record<string, number> = {};
      transactions.filter((t: any) => t.type === "despesa" && t.date >= monthStart).forEach((t: any) => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount);
      });
      const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

      return {
        totalReceitas: paidThisMonth + receitasMonth,
        totalDespesas: despesasMonth,
        saldo: paidThisMonth + receitasMonth - despesasMonth,
        pendente: pendingTotal,
        atrasado: overdueTotal,
        monthlyData,
        categoryData,
      };
    },
  });

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const cards = [
    { label: "Receitas (Mês)", value: data ? fmt(data.totalReceitas) : "—", icon: TrendingUp, color: "text-success" },
    { label: "Despesas (Mês)", value: data ? fmt(data.totalDespesas) : "—", icon: TrendingDown, color: "text-destructive" },
    { label: "Saldo", value: data ? fmt(data.saldo) : "—", icon: Wallet, color: "text-primary" },
    { label: "A Receber", value: data ? fmt(data.pendente) : "—", icon: DollarSign, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={c.label} className="bg-card border-border/50 hover-lift animate-slide-up" style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.atrasado ? (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="py-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">
              {fmt(data.atrasado)} em parcelas atrasadas
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Receitas x Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="name" stroke="hsl(0 0% 60%)" fontSize={12} />
                  <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{ background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 20%)", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(0 0% 88%)" }}
                  />
                  <Bar dataKey="receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              data?.categoryData && data.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {data.categoryData.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 20%)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-20">Sem despesas no mês</p>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ==================== MOVIMENTAÇÕES ==================== */
function MovimentacoesTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
      toast({ title: "Movimentação excluída" });
    },
  });

  const filtered = transactions.filter((t) => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input/50" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 bg-input/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditTx(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nova Movimentação</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editTx ? "Editar" : "Nova"} Movimentação</DialogTitle>
            </DialogHeader>
            <TransactionForm
              transaction={editTx}
              onSuccess={() => {
                setFormOpen(false);
                setEditTx(null);
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                queryClient.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === "receita" ? "bg-success/20" : "bg-destructive/20"}`}>
                  {t.type === "receita" ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.description || t.category}</p>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    {t.payment_method && <span className="text-[10px] text-muted-foreground">{t.payment_method}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type === "receita" ? "text-success" : "text-destructive"}`}>
                    {t.type === "receita" ? "+" : "-"} R$ {Number(t.amount).toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                {role === "admin" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingTx(t)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPasswordDialog
        open={!!deletingTx}
        onOpenChange={(v) => !v && setDeletingTx(null)}
        title="Excluir movimentação?"
        description={`Deseja excluir "${deletingTx?.description || deletingTx?.category}" no valor de R$ ${Number(deletingTx?.amount || 0).toFixed(2).replace(".", ",")}?`}
        onConfirm={async () => {
          if (deletingTx) {
            await deleteMutation.mutateAsync(deletingTx.id);
            setDeletingTx(null);
          }
        }}
      />
    </div>
  );
}
