import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AulasListTab from "@/components/aulas/AulasListTab";
import InstructorPaymentTab from "@/components/aulas/InstructorPaymentTab";

export default function Aulas() {
  const [tab, setTab] = useState("aulas");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Aulas</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro de aulas e pagamento de instrutores</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-accent/50">
          <TabsTrigger value="aulas">Aulas</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamento Instrutores</TabsTrigger>
        </TabsList>

        <TabsContent value="aulas" className="mt-6">
          <AulasListTab />
        </TabsContent>
        <TabsContent value="pagamentos" className="mt-6">
          <InstructorPaymentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
