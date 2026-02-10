import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, UserCircle } from "lucide-react";
import { maskCPF, maskPhone, maskCEP, validateCPF, unmaskDigits } from "@/lib/masks";

export interface EmployeeFormData {
  full_name: string;
  rg: string;
  cpf: string;
  birth_date: string;
  phone: string;
  email: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  role: "admin" | "secretaria" | "instrutor";
  hire_date: string;
  is_active: boolean;
}

type Employee = {
  id: string;
  full_name: string;
  rg: string | null;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  role: "admin" | "secretaria" | "instrutor";
  hire_date: string | null;
  photo_url: string | null;
  is_active: boolean;
};

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

export default function EmployeeForm({ employee, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee?.photo_url ?? null);

  const [form, setForm] = useState<EmployeeFormData>({
    full_name: employee?.full_name ?? "",
    rg: employee?.rg ?? "",
    cpf: employee?.cpf ? maskCPF(employee.cpf) : "",
    birth_date: employee?.birth_date ?? "",
    phone: employee?.phone ? maskPhone(employee.phone) : "",
    email: employee?.email ?? "",
    address_street: employee?.address_street ?? "",
    address_number: employee?.address_number ?? "",
    address_complement: employee?.address_complement ?? "",
    address_neighborhood: employee?.address_neighborhood ?? "",
    address_city: employee?.address_city ?? "",
    address_state: employee?.address_state ?? "",
    address_zip: employee?.address_zip ? maskCEP(employee.address_zip) : "",
    role: employee?.role ?? "instrutor",
    hire_date: employee?.hire_date ?? "",
    is_active: employee?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof EmployeeFormData, value: string | boolean) => {
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
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Email inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let photo_url = employee?.photo_url ?? null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `employees/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

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
        role: form.role as "admin" | "secretaria" | "instrutor",
        hire_date: form.hire_date || null,
        is_active: form.is_active,
        photo_url,
      };

      if (employee) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", employee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: employee ? "Funcionário atualizado" : "Funcionário cadastrado" });
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
        <div
          className="w-20 h-20 rounded-full bg-accent flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Foto do funcionário</p>
          <p className="text-xs text-muted-foreground">JPG ou PNG, máx. 5MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />
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
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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
          <div className="space-y-1">
            <Label>Número</Label>
            <Input value={form.address_number} onChange={(e) => handleChange("address_number", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>Complemento</Label>
            <Input value={form.address_complement} onChange={(e) => handleChange("address_complement", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>Bairro</Label>
            <Input value={form.address_neighborhood} onChange={(e) => handleChange("address_neighborhood", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>Cidade</Label>
            <Input value={form.address_city} onChange={(e) => handleChange("address_city", e.target.value)} className="bg-input/50" />
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.address_state} onValueChange={(v) => handleChange("address_state", v)}>
              <SelectTrigger className="bg-input/50">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {states.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>CEP</Label>
            <Input value={form.address_zip} onChange={(e) => handleChange("address_zip", e.target.value)} placeholder="00000-000" className="bg-input/50" />
          </div>
        </div>
      </div>

      {/* Role & Status */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cargo e Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Cargo *</Label>
            <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
              <SelectTrigger className="bg-input/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="secretaria">Secretaria</SelectItem>
                <SelectItem value="instrutor">Instrutor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data de Admissão</Label>
            <Input type="date" value={form.hire_date} onChange={(e) => handleChange("hire_date", e.target.value)} className="bg-input/50" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => handleChange("is_active", v)} />
            <Label className="cursor-pointer">{form.is_active ? "Ativo" : "Inativo"}</Label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {employee ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
