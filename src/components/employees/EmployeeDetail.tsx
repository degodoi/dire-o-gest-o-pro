import { Badge } from "@/components/ui/badge";
import { maskCPF, maskPhone, maskCEP } from "@/lib/masks";
import { UserCircle } from "lucide-react";

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

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
  instrutor: "Instrutor",
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

export default function EmployeeDetail({ employee }: { employee: Employee }) {
  const address = [
    employee.address_street,
    employee.address_number,
    employee.address_complement,
  ].filter(Boolean).join(", ");

  const cityState = [
    employee.address_neighborhood,
    employee.address_city,
    employee.address_state,
  ].filter(Boolean).join(" - ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">{employee.full_name}</h3>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">{roleLabels[employee.role]}</Badge>
            <Badge
              variant={employee.is_active ? "default" : "outline"}
              className={`text-xs ${employee.is_active ? "bg-success/20 text-success border-success/30" : ""}`}
            >
              {employee.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados Pessoais</h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="RG" value={employee.rg} />
          <InfoRow label="CPF" value={employee.cpf ? maskCPF(employee.cpf) : null} />
          <InfoRow label="Data de Nascimento" value={formatDate(employee.birth_date)} />
          <InfoRow label="Telefone" value={employee.phone ? maskPhone(employee.phone) : null} />
          <InfoRow label="Email" value={employee.email} />
          <InfoRow label="Data de Admissão" value={formatDate(employee.hire_date)} />
        </div>
      </div>

      {(address || cityState) && (
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço</h4>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Logradouro" value={address || null} />
            <InfoRow label="Bairro / Cidade / UF" value={cityState || null} />
            <InfoRow label="CEP" value={employee.address_zip ? maskCEP(employee.address_zip) : null} />
          </div>
        </div>
      )}
    </div>
  );
}
