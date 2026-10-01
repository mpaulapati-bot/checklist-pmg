import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CadastroTab } from "@/components/CadastroTab";
import { canEdit } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros | Checklist de Células - Viveo" },
      { name: "description", content: "Cadastro de células, turnos e monitoras." },
      { property: "og:title", content: "Cadastros | Checklist de Células - Viveo" },
      { property: "og:description", content: "Cadastro de células, turnos e monitoras." },
    ],
  }),
  component: Cadastros,
});

function Cadastros() {
  const { role } = Route.useRouteContext();
  const editable = canEdit(role);
  const trigger = "min-h-12 px-6 text-base font-semibold data-[state=active]:text-primary";
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-primary">Cadastros</h1>
      <Tabs defaultValue="celulas">
        <TabsList>
          <TabsTrigger value="celulas" className={trigger}>Células</TabsTrigger>
          <TabsTrigger value="turnos" className={trigger}>Turnos</TabsTrigger>
          <TabsTrigger value="monitoras" className={trigger}>Monitoras</TabsTrigger>
        </TabsList>
        <TabsContent value="celulas" className="mt-6">
          <CadastroTab table="celulas" singular="Célula" novoLabel="Nova célula" ativaLabel="Somente ativas" editable={editable} />
        </TabsContent>
        <TabsContent value="turnos" className="mt-6">
          <CadastroTab table="turnos" singular="Turno" novoLabel="Novo turno" ativaLabel="Somente ativos" editable={editable} />
        </TabsContent>
        <TabsContent value="monitoras" className="mt-6">
          <CadastroTab table="monitoras" singular="Monitora" novoLabel="Nova monitora" ativaLabel="Somente ativas" editable={editable} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
