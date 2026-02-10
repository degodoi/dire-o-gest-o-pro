import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { maskCurrency } from "@/lib/masks";

const CATEGORIES_RECEITA = ["Mensalidade", "Matrícula", "Taxa de exame", "Outros"];
const CATEGORIES_DESPESA = ["Aluguel", "Salários", "Combustível", "Manutenção", "Marketing", "Material", "Impostos", "Outros"];
const PAYMENT_METHODS = ["Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência"];

interface Props {
  transaction?: {
    id: string;
    type: string;
    category: string;
    description: string | null;
    amount: number;
    date: string;
    payment_method: string | null;
  } | null;
  onSuccess: () => void;
}

export default function TransactionForm({ transaction, onSuccess }: Props) {
  const [type, setType] = useState(transaction?.type || "despesa");
  const [category, setCategory] = useState(transaction?.category || "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method || "");
  const [saving, setSaving] = useState(false);

  const categories = type === "receita" ? CATEGORIES_RECEITA : CATEGORIES_DESPESA;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount || !date) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      type,
      category,
      description: description || null,
      amount: parseFloat(amount),
      date,
      payment_method: paymentMethod || null,
    };

    const { error } = transaction
      ? await supabase.from("transactions").update(payload).eq("id", transaction.id)
      : await supabase.from("transactions").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: transaction ? "Movimentação atualizada" : "Movimentação criada" });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select value={type} onValueChange={(v) => { setType(v); setCategory(""); }}>
            <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-input/50 resize-none" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor (R$) *</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-input/50" placeholder="0,00" />
        </div>
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-input/50" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Forma de Pagamento</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="bg-input/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {saving ? "Salvando..." : transaction ? "Atualizar" : "Criar Movimentação"}
      </Button>
    </form>
  );
}
