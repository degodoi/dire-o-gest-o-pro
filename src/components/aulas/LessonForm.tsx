import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  lesson?: any | null;
  onSuccess: () => void;
}

export default function LessonForm({ lesson, onSuccess }: Props) {
  const [date, setDate] = useState(lesson?.date || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(lesson?.start_time?.slice(0, 5) || "08:00");
  const [duration, setDuration] = useState(String(lesson?.duration_minutes || 50));
  const [type, setType] = useState(lesson?.type || "pratica");
  const [instructorId, setInstructorId] = useState(lesson?.instructor_id || "");
  const [studentId, setStudentId] = useState(lesson?.student_id || "");
  const [status, setStatus] = useState(lesson?.status || "agendada");
  const [notes, setNotes] = useState(lesson?.notes || "");
  const [saving, setSaving] = useState(false);

  // Value auto-calculated: prática = R$10, prova = R$20
  const value = type === "prova" ? 20 : 10;

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
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructorId || !studentId || !date || !startTime) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
              <SelectItem value="pratica">Prática — R$ 10,00</SelectItem>
              <SelectItem value="prova">Prova — R$ 20,00</SelectItem>
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

      <div className="space-y-2">
        <Label>Aluno *</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
          <SelectContent>
            {students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Valor: <span className="font-semibold text-foreground">R$ {value.toFixed(2).replace(".", ",")}</span></p>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {saving ? "Salvando..." : lesson ? "Atualizar" : "Registrar Aula"}
        </Button>
      </div>
    </form>
  );
}
