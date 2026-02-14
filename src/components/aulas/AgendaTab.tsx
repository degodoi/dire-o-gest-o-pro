import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type Lesson = {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  type: string;
  status: string;
  value: number;
  notes: string | null;
  employees?: { full_name: string } | null;
  students?: { full_name: string } | null;
};

const typeLabels: Record<string, string> = {
  pratica_a: "Prát. A",
  pratica_b: "Prát. B",
  exame_a: "Ex. A",
  exame_b: "Ex. B",
  pratica: "Prática",
  prova: "Prova",
};

const statusColors: Record<string, string> = {
  agendada: "bg-primary/20 text-primary border-primary/30",
  realizada: "bg-success/20 text-success border-success/30",
  cancelada: "bg-destructive/20 text-destructive border-destructive/30",
  reagendada: "bg-warning/20 text-warning border-warning/30",
};

const typeColors: Record<string, string> = {
  pratica_a: "border-l-warning",
  pratica_b: "border-l-primary",
  exame_a: "border-l-destructive",
  exame_b: "border-l-success",
  pratica: "border-l-primary",
  prova: "border-l-destructive",
};

type ViewMode = "week" | "month";

export default function AgendaTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, employees(full_name), students(full_name)")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const days = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start, end });
    // Pad start to Monday
    const firstDay = startOfWeek(start, { weekStartsOn: 1 });
    const lastDay = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  }, [viewMode, currentDate]);

  const lessonsByDate = useMemo(() => {
    const map: Record<string, Lesson[]> = {};
    for (const lesson of lessons) {
      if (!map[lesson.date]) map[lesson.date] = [];
      map[lesson.date].push(lesson);
    }
    return map;
  }, [lessons]);

  const navigate = (dir: "prev" | "next") => {
    if (viewMode === "week") {
      setCurrentDate((d) => (dir === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)));
    } else {
      setCurrentDate((d) => (dir === "prev" ? subMonths(d, 1) : addMonths(d, 1)));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel =
    viewMode === "week"
      ? `${format(days[0], "dd MMM", { locale: ptBR })} — ${format(days[days.length - 1], "dd MMM yyyy", { locale: ptBR })}`
      : format(currentDate, "MMMM yyyy", { locale: ptBR });

  const weekDayHeaders = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground ml-2 capitalize">{headerLabel}</h2>
        </div>
        <div className="flex gap-1 bg-accent/50 rounded-lg p-0.5">
          <Button
            size="sm"
            variant={viewMode === "week" ? "default" : "ghost"}
            className="h-7 text-xs px-3"
            onClick={() => setViewMode("week")}
          >
            Semana
          </Button>
          <Button
            size="sm"
            variant={viewMode === "month" ? "default" : "ghost"}
            className="h-7 text-xs px-3"
            onClick={() => setViewMode("month")}
          >
            Mês
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : viewMode === "week" ? (
        /* ====== WEEK VIEW ====== */
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayLessons = lessonsByDate[key] || [];
            const today = isToday(day);

            return (
              <div key={key} className="min-h-[180px]">
                <div
                  className={`text-center py-1.5 rounded-t-lg text-xs font-medium ${
                    today
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/60 text-muted-foreground"
                  }`}
                >
                  <span className="block">{format(day, "EEE", { locale: ptBR })}</span>
                  <span className={`text-lg font-bold ${today ? "text-primary-foreground" : "text-foreground"}`}>
                    {format(day, "dd")}
                  </span>
                </div>
                <div className="border border-t-0 border-border/50 rounded-b-lg p-1 space-y-1 bg-card/50 min-h-[140px]">
                  {dayLessons.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/40 text-center pt-6">—</p>
                  ) : (
                    dayLessons.map((l) => (
                      <LessonCard key={l.id} lesson={l} compact={false} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ====== MONTH VIEW ====== */
        <div>
          <div className="grid grid-cols-7 gap-px bg-border/30 rounded-t-lg overflow-hidden">
            {weekDayHeaders.map((d) => (
              <div key={d} className="bg-accent/60 text-center py-2 text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border/30 rounded-b-lg overflow-hidden">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayLessons = lessonsByDate[key] || [];
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={key}
                  className={`min-h-[100px] p-1 ${
                    inMonth ? "bg-card/50" : "bg-background/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        today
                          ? "bg-primary text-primary-foreground"
                          : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayLessons.length > 0 && (
                      <span className="text-[9px] text-muted-foreground">{dayLessons.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayLessons.slice(0, 3).map((l) => (
                      <LessonCard key={l.id} lesson={l} compact />
                    ))}
                    {dayLessons.length > 3 && (
                      <p className="text-[9px] text-muted-foreground text-center">
                        +{dayLessons.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-warning" />
          <span className="text-[10px] text-muted-foreground">Prát. A (Moto)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <span className="text-[10px] text-muted-foreground">Prát. B (Carro)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
          <span className="text-[10px] text-muted-foreground">Exame A (Moto)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-success" />
          <span className="text-[10px] text-muted-foreground">Exame B (Carro)</span>
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson, compact }: { lesson: Lesson; compact: boolean }) {
  const studentName = (lesson.students as any)?.full_name || "—";
  const time = lesson.start_time.slice(0, 5);

  if (compact) {
    return (
      <div
        className={`text-[9px] leading-tight p-0.5 pl-1.5 rounded border-l-2 truncate ${
          typeColors[lesson.type] || "border-l-muted"
        } ${
          lesson.status === "cancelada"
            ? "opacity-40 line-through"
            : lesson.status === "realizada"
            ? "opacity-60"
            : ""
        } bg-accent/40`}
        title={`${time} - ${studentName} - ${typeLabels[lesson.type] || lesson.type}`}
      >
        <span className="font-medium">{time}</span>{" "}
        <span className="text-muted-foreground">{studentName.split(" ")[0]}</span>
      </div>
    );
  }

  return (
    <div
      className={`text-[11px] leading-tight p-1.5 pl-2 rounded-md border-l-2 ${
        typeColors[lesson.type] || "border-l-muted"
      } ${
        lesson.status === "cancelada"
          ? "opacity-40 line-through"
          : lesson.status === "realizada"
          ? "opacity-60"
          : ""
      } bg-accent/40 hover:bg-accent/60 transition-colors`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold text-foreground">{time}</span>
        <Badge
          variant="outline"
          className={`text-[8px] px-1 py-0 h-3.5 ${statusColors[lesson.status] || ""}`}
        >
          {lesson.status === "agendada"
            ? "AG"
            : lesson.status === "realizada"
            ? "OK"
            : lesson.status === "cancelada"
            ? "CN"
            : "RE"}
        </Badge>
      </div>
      <p className="text-foreground truncate mt-0.5">{studentName}</p>
      <p className="text-muted-foreground truncate text-[9px]">
        {typeLabels[lesson.type] || lesson.type}
      </p>
    </div>
  );
}
