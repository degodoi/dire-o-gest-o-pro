import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, DollarSign, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [employeesRes, studentsRes, paymentsRes, lessonsRes] = await Promise.all([
        supabase.from("employees").select("id, role, is_active"),
        supabase.from("students").select("id, is_active"),
        supabase.from("student_payments").select("amount, status, paid_date"),
        supabase.from("lessons").select("id, status").eq("status", "agendada"),
      ]);

      const employees = employeesRes.data ?? [];
      const students = studentsRes.data ?? [];
      const lessons = lessonsRes.data ?? [];
      const payments = paymentsRes.data ?? [];

      const activeInstructors = employees.filter((e: any) => e.role === "instrutor" && e.is_active).length;
      const totalAlunos = students.filter((s: any) => s.is_active).length;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const receitaMes = payments
        .filter((p: any) => p.status === "paga" && p.paid_date && p.paid_date >= monthStart)
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      return {
        totalAlunos,
        receitaMes: `R$ ${receitaMes.toFixed(2).replace(".", ",")}`,
        aulasAgendadas: lessons.length,
        instrutoresAtivos: activeInstructors,
      };
    },
  });

  const cards = [
    { label: "Total de Alunos", value: stats?.totalAlunos ?? 0, icon: GraduationCap, color: "text-primary" },
    { label: "Receita do Mês", value: stats?.receitaMes ?? "R$ 0,00", icon: DollarSign, color: "text-success" },
    { label: "Aulas Agendadas", value: stats?.aulasAgendadas ?? 0, icon: CalendarDays, color: "text-warning" },
    { label: "Instrutores Ativos", value: stats?.instrutoresAtivos ?? 0, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-display font-bold text-foreground">
                  {String(stat.value)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        </CardContent>
      </Card>
    </div>
  );
}
