import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";

interface Props {
  lesson?: any | null;
  onSuccess: () => void;
}

const typeLabels: Record<string, string> = {
  pratica_a: "Prática A (Moto) — R$ 10,00",
  pratica_b: "Prática B (Carro) — R$ 10,00",
  exame_a: "Exame A (Moto) — R$ 20,00",
  exame_b: "Exame B (Carro) — R$ 20,00",
};

function getTypeValue(type: string): number {
  return type.startsWith("exame") ? 20 : 10;
}

export default function LessonForm({ lesson, onSuccess }: Props) {
  const [date, setDate] = useState(lesson?.date || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(lesson?.start_time?.slice(0, 5) || "08:00");
  const [duration, setDuration] = useState(String(lesson?.duration_minutes || 50));
  const [type, setType] = useState(lesson?.type || "pratica_b");
  const [instructorId, setInstructorId] = useState(lesson?.instructor_id || "");
  const [studentId, setStudentId] = useState(lesson?.student_id || "");
  const [status, setStatus] = useState(lesson?.status || "agendada");
  const [notes, setNotes] = useState(lesson?.notes || "");
  const [saving, setSaving] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [adminPasswordOpen, setAdminPasswordOpen] = useState(false);

  const value = getTypeValue(type);

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("role", "instrutor")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, category, max_lessons_a, max_lessons_b")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const selectedStudent = students.find((s: any) => s.id === studentId);

  // Filter type options based on student category
  const availableTypes = Object.entries(typeLabels).filter(([key]) => {
    if (!selectedStudent) return true;
    const cat = selectedStudent.category;
    if (cat === "A") return key.endsWith("_a");
    if (cat === "B") return key.endsWith("_b");
    return true; // AB shows all
  });

  const checkQuota = async (): Promise<boolean> => {
    if (!studentId || !type) return false;

    const student = students.find((s: any) => s.id === studentId);
    if (!student) return false;

    const isTypeA = type.endsWith("_a");
    const maxLessons = isTypeA ? student.max_lessons_a : student.max_lessons_b;

    if (!maxLessons || maxLessons <= 0) return false;

    // Count existing lessons of same category for this student (only non-cancelled)
    const categoryTypes = isTypeA ? ["pratica_a", "exame_a"] : ["pratica_b", "exame_b"];
    const { count, error } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .in("type", categoryTypes)
      .neq("status", "cancelada");

    if (error) return false;

    const currentCount = count || 0;
    // If editing, discount the current lesson
    const adjustment = lesson && categoryTypes.includes(lesson.type) ? 1 : 0;

    return (currentCount - adjustment) >= maxLessons;
  };

  const doSave = async () => {
    setSaving(true);
    const payload = {
      date,
      start_time: startTime + ":00",
      duration_minutes: parseInt(duration),
      type,
      instructor_id: instructorId,
      student_id: studentId,
      status,
      value,
      notes: notes || null,
    };

    const { error } = lesson
      ? await supabase.from("lessons").update(payload).eq("id", lesson.id)
      : await supabase.from("lessons").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: lesson ? "Aula atualizada" : "Aula registrada" });
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructorId || !studentId || !date || !startTime) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const exceeded = await checkQuota();
    if (exceeded) {
      setQuotaExceeded(true);
      setAdminPasswordOpen(true);
    } else {
      await doSave();
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Aluno *</Label>
          <Select value={studentId} onValueChange={(v) => { setStudentId(v); }}>
            <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
            <SelectContent>
              {students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} (Cat. {s.category})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-2">
            <Label>Horário *</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-input/50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableTypes.map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-input/50" min="10" max="120" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Instrutor *</Label>
          <Select value={instructorId} onValueChange={setInstructorId}>
            <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione o instrutor" /></SelectTrigger>
            <SelectContent>
              {instructors.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {lesson && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="reagendada">Reagendada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-input/50 resize-none" rows={2} />
        </div>

        {selectedStudent && (
          <div className="text-xs text-muted-foreground bg-accent/50 rounded-md p-2 space-y-0.5">
            {(selectedStudent.category === "A" || selectedStudent.category === "AB") && (
              <p>Aulas Moto (A): limite {selectedStudent.max_lessons_a || "sem limite"}</p>
            )}
            {(selectedStudent.category === "B" || selectedStudent.category === "AB") && (
              <p>Aulas Carro (B): limite {selectedStudent.max_lessons_b || "sem limite"}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Valor: <span className="font-semibold text-foreground">R$ {value.toFixed(2).replace(".", ",")}</span></p>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {saving ? "Salvando..." : lesson ? "Atualizar" : "Registrar Aula"}
          </Button>
        </div>
      </form>

      <AdminPasswordDialog
        open={adminPasswordOpen}
        onOpenChange={(v) => { if (!v) { setAdminPasswordOpen(false); setQuotaExceeded(false); } }}
        title="Limite de aulas excedido"
        description="O aluno já atingiu o limite de aulas contratadas para esta categoria. Confirme com senha de admin para continuar."
        destructive={false}
        onConfirm={async () => {
          setAdminPasswordOpen(false);
          setQuotaExceeded(false);
          await doSave();
        }}
      />
    </>
  );
}
