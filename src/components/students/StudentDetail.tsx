import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { maskCPF, maskPhone, maskCEP } from "@/lib/masks";
import { GraduationCap } from "lucide-react";
import type { Student } from "@/pages/Alunos";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  ativo: "Ativo", em_formacao: "Em Formação", formado: "Formado", desistente: "Desistente",
};
const statusColors: Record<string, string> = {
  ativo: "bg-success/20 text-success border-success/30",
  em_formacao: "bg-primary/20 text-primary border-primary/30",
  formado: "bg-muted text-muted-foreground",
  desistente: "bg-destructive/20 text-destructive border-destructive/30",
};
const payStatusLabels: Record<string, string> = {
  pendente: "Pendente", paga: "Paga", atrasada: "Atrasada",
};
const payStatusColors: Record<string, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  paga: "bg-success/20 text-success border-success/30",
  atrasada: "bg-destructive/20 text-destructive border-destructive/30",
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function StudentDetail({ student }: { student: Student }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["student-payments", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_payments")
        .select("*")
        .eq("student_id", student.id)
        .order("installment_number");
      if (error) throw error;
      return data;
    },
  });

  const address = [student.address_street, student.address_number, student.address_complement].filter(Boolean).join(", ");
  const cityState = [student.address_neighborhood, student.address_city, student.address_state].filter(Boolean).join(" - ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden">
          {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="w-8 h-8 text-muted-foreground" />}
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">{student.full_name}</h3>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">Cat. {student.category}</Badge>
            <Badge variant="outline" className={`text-xs ${statusColors[student.status] ?? ""}`}>{statusLabels[student.status]}</Badge>
          </div>
        </div>
      </div>

      {/* Personal */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados Pessoais</h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="RG" value={student.rg} />
          <InfoRow label="CPF" value={student.cpf ? maskCPF(student.cpf) : null} />
          <InfoRow label="Nascimento" value={formatDate(student.birth_date)} />
          <InfoRow label="Telefone" value={student.phone ? maskPhone(student.phone) : null} />
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Matrícula" value={formatDate(student.enrollment_date)} />
        </div>
      </div>

      {(address || cityState) && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço</h4>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Logradouro" value={address || null} />
            <InfoRow label="Bairro / Cidade / UF" value={cityState || null} />
            <InfoRow label="CEP" value={student.address_zip ? maskCEP(student.address_zip) : null} />
          </div>
        </div>
      )}

      {/* Financial */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financeiro</h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Valor do Curso" value={`R$ ${Number(student.course_value).toFixed(2)}`} />
          <InfoRow label="Parcelas" value={String(student.installments_count)} />
          {(student.category === "A" || student.category === "AB") && (
            <InfoRow label="Aulas Moto (A)" value={String((student as any).max_lessons_a || 0)} />
          )}
          {(student.category === "B" || student.category === "AB") && (
            <InfoRow label="Aulas Carro (B)" value={String((student as any).max_lessons_b || 0)} />
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : payments.length > 0 ? (
          <div className="space-y-2 mt-2">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-accent/50 text-sm">
                <span className="text-foreground">Parcela {p.installment_number}</span>
                <span className="text-muted-foreground">R$ {Number(p.amount).toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">{formatDate(p.due_date)}</span>
                <Badge variant="outline" className={`text-xs ${payStatusColors[p.status] ?? ""}`}>
                  {payStatusLabels[p.status] ?? p.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma parcela registrada.</p>
        )}
      </div>

      {student.notes && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</h4>
          <p className="text-sm text-foreground">{student.notes}</p>
        </div>
      )}
    </div>
  );
}
