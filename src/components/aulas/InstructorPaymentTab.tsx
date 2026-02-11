import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, CalendarDays, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodType = "semana" | "quinzena" | "mes";

export default function InstructorPaymentTab() {
  const now = new Date();
  const [period, setPeriod] = useState<PeriodType>("mes");
  const [customStart, setCustomStart] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(now), "yyyy-MM-dd"));

  const getDateRange = () => {
    if (period === "mes") return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    if (period === "quinzena") return { start: format(subWeeks(now, 2), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    return { start: format(startOfWeek(now, { locale: ptBR }), "yyyy-MM-dd"), end: format(endOfWeek(now, { locale: ptBR }), "yyyy-MM-dd") };
  };

  const range = period === "mes" || period === "semana" || period === "quinzena" ? getDateRange() : { start: customStart, end: customEnd };

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-payments", range.start, range.end],
    queryFn: async () => {
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("*, employees(id, full_name), students(full_name)")
        .eq("status", "realizada")
        .gte("date", range.start)
        .lte("date", range.end)
        .order("date");
      if (error) throw error;

      // Group by instructor
      const byInstructor: Record<string, {
        name: string;
        praticas: number;
        provas: number;
        totalValue: number;
        lessons: any[];
      }> = {};

      (lessons || []).forEach((l: any) => {
        const instrId = l.instructor_id;
        const instrName = l.employees?.full_name || "—";
        if (!byInstructor[instrId]) {
          byInstructor[instrId] = { name: instrName, praticas: 0, provas: 0, totalValue: 0, lessons: [] };
        }
        const entry = byInstructor[instrId];
        if (l.type === "pratica") entry.praticas++;
        else entry.provas++;
        entry.totalValue += Number(l.value);
        entry.lessons.push(l);
      });

      const instructors = Object.entries(byInstructor)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalValue - a.totalValue);

      const totalGeral = instructors.reduce((s, i) => s + i.totalValue, 0);
      const totalAulas = instructors.reduce((s, i) => s + i.praticas + i.provas, 0);

      return { instructors, totalGeral, totalAulas };
    },
  });

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-44 bg-input/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="quinzena">Últimos 15 dias</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {fmtDate(range.start)} — {fmtDate(range.end)}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle>
            <DollarSign className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-display font-bold text-foreground">{fmt(data?.totalGeral || 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aulas Realizadas</CardTitle>
            <CalendarDays className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-2xl font-display font-bold text-foreground">{data?.totalAulas || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Instrutores</CardTitle>
            <Users className="w-5 h-5 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-2xl font-display font-bold text-foreground">{data?.instructors?.length || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructor breakdown */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !data?.instructors?.length ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma aula realizada no período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.instructors.map((instr) => (
            <Card key={instr.id} className="bg-card border-border/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{instr.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{instr.praticas} prática{instr.praticas !== 1 ? "s" : ""}</span>
                      <span className="text-xs text-muted-foreground">{instr.provas} prova{instr.provas !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-display font-bold text-success">{fmt(instr.totalValue)}</p>
                    <p className="text-[10px] text-muted-foreground">{instr.praticas + instr.provas} aulas</p>
                  </div>
                </div>

                {/* Lesson details */}
                <div className="space-y-1 border-t border-border/50 pt-2">
                  {instr.lessons.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{fmtDate(l.date)}</span>
                        <span className="text-foreground">{(l as any).students?.full_name || "—"}</span>
                        <Badge variant="outline" className="text-[9px] h-4">{l.type === "pratica" ? "Prática" : "Prova"}</Badge>
                      </div>
                      <span className="text-foreground font-medium">R$ {Number(l.value).toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
