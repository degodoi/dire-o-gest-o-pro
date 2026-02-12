import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}

export default function AdminPasswordDialog({
  open, onOpenChange, title, description, onConfirm, destructive = true,
}: AdminPasswordDialogProps) {
  const { role, user } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = role === "admin";

  const handleConfirm = async () => {
    if (!isAdmin) {
      toast({ title: "Acesso negado", description: "Apenas administradores podem realizar esta ação.", variant: "destructive" });
      return;
    }
    if (!password.trim()) {
      setError("Digite sua senha para confirmar.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Re-authenticate by signing in with current email + provided password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? "",
        password,
      });

      if (authError) {
        setError("Senha incorreta. Tente novamente.");
        setLoading(false);
        return;
      }

      await onConfirm();
      setPassword("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Erro ao executar ação.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  if (!isAdmin) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" /> Acesso Restrito
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apenas administradores podem realizar esta ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning" /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha do Administrador</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="Digite sua senha para confirmar"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="bg-input/50"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={destructive ? "destructive" : "default"}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
