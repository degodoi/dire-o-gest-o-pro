import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { maskCPF, maskPhone, maskCEP, maskCurrency, validateCPF, unmaskDigits } from "@/lib/masks";
import type { Student } from "@/pages/Alunos";
import { addMonths, format } from "date-fns";

interface Props {
  student: Student | null;
  onClose: () => void;
}

export default function StudentForm({ student, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photo_url ?? null);

  const [form, setForm] = useState({
    full_name: student?.full_name ?? "",
    rg: student?.rg ?? "",
    cpf: student?.cpf ? maskCPF(student.cpf) : "",
    birth_date: student?.birth_date ?? "",
    phone: student?.phone ? maskPhone(student.phone) : "",
    email: student?.email ?? "",
    address_street: student?.address_street ?? "",
    address_number: student?.address_number ?? "",
    address_complement: student?.address_complement ?? "",
    address_neighborhood: student?.address_neighborhood ?? "",
    address_city: student?.address_city ?? "",
    address_state: student?.address_state ?? "",
    address_zip: student?.address_zip ? maskCEP(student.address_zip) : "",
    category: student?.category ?? "B",
    enrollment_date: student?.enrollment_date ?? format(new Date(), "yyyy-MM-dd"),
    status: student?.status ?? "ativo",
    course_value: student?.course_value ? String(student.course_value) : "",
    installments_count: student?.installments_count ? String(student.installments_count) : "1",
    max_lessons_a: student?.max_lessons_a ? String(student.max_lessons_a) : "0",
    max_lessons_b: student?.max_lessons_b ? String(student.max_lessons_b) : "0",
    notes: student?.notes ?? "",
    is_active: student?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    let masked = value;
    if (field === "cpf" && typeof value === "string") masked = maskCPF(value);
    if (field === "phone" && typeof value === "string") masked = maskPhone(value);
    if (field === "address_zip" && typeof value === "string") masked = maskCEP(value);
    setForm((prev) => ({ ...prev, [field]: masked }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "A foto deve ter no máximo 5MB", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Nome obrigatório";
    if (form.cpf && !validateCPF(form.cpf)) errs.cpf = "CPF inválido";
    if (!form.course_value || Number(form.course_value) <= 0) errs.course_value = "Informe o valor do curso";
    if (!form.installments_count || Number(form.installments_count) < 1) errs.installments_count = "Mínimo 1 parcela";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let photo_url = student?.photo_url ?? null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `students/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("photos").upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      const courseValue = parseFloat(form.course_value);
      const installmentsCount = parseInt(form.installments_count);

      const payload = {
        full_name: form.full_name.trim(),
        rg: form.rg || null,
        cpf: unmaskDigits(form.cpf) || null,
        birth_date: form.birth_date || null,
        phone: unmaskDigits(form.phone) || null,
        email: form.email.trim() || null,
        address_street: form.address_street || null,
        address_number: form.address_number || null,
        address_complement: form.address_complement || null,
        address_neighborhood: form.address_neighborhood || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: unmaskDigits(form.address_zip) || null,
        category: form.category,
        enrollment_date: form.enrollment_date,
        status: form.status,
        course_value: courseValue,
        installments_count: installmentsCount,
        max_lessons_a: parseInt(form.max_lessons_a) || 0,
        max_lessons_b: parseInt(form.max_lessons_b) || 0,
        notes: form.notes || null,
        is_active: form.is_active,
        photo_url,
      };

      if (student) {
        const { error } = await supabase.from("students").update(payload).eq("id", student.id);
        if (error) throw error;
      } else {
        // Insert student
        const { data: newStudent, error } = await supabase.from("students").insert(payload).select().single();
        if (error) throw error;

        // Auto-generate installments
        const installmentAmount = Math.round((courseValue / installmentsCount) * 100) / 100;
        const enrollDate = new Date(form.enrollment_date);
        const installments = Array.from({ length: installmentsCount }, (_, i) => ({
          student_id: newStudent.id,
          installment_number: i + 1,
          amount: i === installmentsCount - 1
            ? Math.round((courseValue - installmentAmount * (installmentsCount - 1)) * 100) / 100
            : installmentAmount,
          due_date: format(addMonths(enrollDate, i + 1), "yyyy-MM-dd"),
          status: "pendente" as const,
        }));

        const { error: payError } = await supabase.from("student_payments").insert(installments);
        if (payError) throw payError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: student ? "Aluno atualizado" : "Aluno cadastrado com parcelas geradas!" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  const states = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
    "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
          {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Foto 3x4</p>
          <p className="text-xs text-muted-foreground">JPG ou PNG, máx. 5MB</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      {/* Personal Data */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dados Pessoais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <Label>Nome Completo *</Label>
            <Input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} className="bg-input/50" />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>
          <div className="space-y-1">
            <Label>RG</Label>
            <Input value={form.rg} onChange={(e) => handleChange("rg", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>CPF</Label>
            <Input value={form.cpf} onChange={(e) => handleChange("cpf", e.target.value)} placeholder="000.000.000-00" className="bg-input/50" />
            {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
          </div>
          <div className="space-y-1">
            <Label>Data de Nascimento</Label>
            <Input type="date" value={form.birth_date} onChange={(e) => handleChange("birth_date", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(00) 00000-0000" className="bg-input/50" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="bg-input/50" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Endereço</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <Label>Rua</Label>
            <Input value={form.address_street} onChange={(e) => handleChange("address_street", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1"><Label>Número</Label><Input value={form.address_number} onChange={(e) => handleChange("address_number", e.target.value)} className="bg-input/50" /></div>
          <div className="space-y-1"><Label>Complemento</Label><Input value={form.address_complement} onChange={(e) => handleChange("address_complement", e.target.value)} className="bg-input/50" /></div>
          <div className="space-y-1"><Label>Bairro</Label><Input value={form.address_neighborhood} onChange={(e) => handleChange("address_neighborhood", e.target.value)} className="bg-input/50" /></div>
          <div className="space-y-1"><Label>Cidade</Label><Input value={form.address_city} onChange={(e) => handleChange("address_city", e.target.value)} className="bg-input/50" /></div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.address_state} onValueChange={(v) => handleChange("address_state", v)}>
              <SelectTrigger className="bg-input/50"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{states.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>CEP</Label>
            <Input value={form.address_zip} onChange={(e) => handleChange("address_zip", e.target.value)} placeholder="00000-000" className="bg-input/50" />
          </div>
        </div>
      </div>

      {/* Course Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Curso e Financeiro</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Categoria *</Label>
            <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
              <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Categoria A</SelectItem>
                <SelectItem value="B">Categoria B</SelectItem>
                <SelectItem value="AB">Categoria AB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data de Matrícula</Label>
            <Input type="date" value={form.enrollment_date} onChange={(e) => handleChange("enrollment_date", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="em_formacao">Em Formação</SelectItem>
                <SelectItem value="formado">Formado</SelectItem>
                <SelectItem value="desistente">Desistente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Valor do Curso (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={form.course_value} onChange={(e) => handleChange("course_value", e.target.value)} placeholder="0.00" className="bg-input/50" />
            {errors.course_value && <p className="text-xs text-destructive">{errors.course_value}</p>}
          </div>
          {!student && (
            <div className="space-y-1">
              <Label>Nº de Parcelas *</Label>
              <Input type="number" min="1" max="48" value={form.installments_count} onChange={(e) => handleChange("installments_count", e.target.value)} className="bg-input/50" />
              {errors.installments_count && <p className="text-xs text-destructive">{errors.installments_count}</p>}
              {form.course_value && form.installments_count && Number(form.installments_count) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Parcela: R$ {(Number(form.course_value) / Number(form.installments_count)).toFixed(2)}
                </p>
              )}
            </div>
          )}
          {/* Lesson quotas */}
          <div className="sm:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Quantidade de Aulas Contratadas</h3>
            <div className="grid grid-cols-2 gap-4">
              {(form.category === "A" || form.category === "AB") && (
                <div className="space-y-1">
                  <Label>Aulas Moto (Cat. A)</Label>
                  <Input type="number" min="0" value={form.max_lessons_a} onChange={(e) => handleChange("max_lessons_a", e.target.value)} className="bg-input/50" />
                </div>
              )}
              {(form.category === "B" || form.category === "AB") && (
                <div className="space-y-1">
                  <Label>Aulas Carro (Cat. B)</Label>
                  <Input type="number" min="0" value={form.max_lessons_b} onChange={(e) => handleChange("max_lessons_b", e.target.value)} className="bg-input/50" />
                </div>
              )}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="bg-input/50 min-h-[80px]" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => handleChange("is_active", v)} />
            <Label className="cursor-pointer">{form.is_active ? "Ativo" : "Inativo"}</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {student ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
