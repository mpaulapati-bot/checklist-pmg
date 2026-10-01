import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFirstUser } from "@/lib/users.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Checklist de Células - Viveo" },
      { name: "description", content: "Acesse o Checklist de Células da Viveo." },
      { property: "og:title", content: "Entrar | Checklist de Células - Viveo" },
      { property: "og:description", content: "Acesse o Checklist de Células da Viveo." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const createFirst = useServerFn(createFirstUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstSetup, setFirstSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/cadastros", replace: true });
    });
    supabase.rpc("system_has_users").then(({ data }) => setFirstSetup(data === false));
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (firstSetup) {
        await createFirst({ data: { email, password } });
        toast.success("Coordenador criado. Entrando...");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("banned")
            ? "Usuário inativo. Procure um coordenador."
            : "E-mail ou senha inválidos.",
        );
        return;
      }
      navigate({ to: "/cadastros", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <span className="text-3xl font-extrabold tracking-tight">
          viveo<span className="text-sidebar-primary">.</span>
        </span>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Checklist de Células</h1>
          <p className="mt-3 max-w-sm text-lg opacity-80">
            Padronize as auditorias das células, turnos e monitoras.
          </p>
        </div>
        <div className="h-1 w-24 rounded-full bg-sidebar-primary" />
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-card p-8 shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-primary">
              {firstSetup ? "Primeiro acesso" : "Entrar"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {firstSetup
                ? "Nenhum usuário cadastrado. Crie o coordenador inicial."
                : "Use seu e-mail e senha cadastrados."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              required
              minLength={firstSetup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : firstSetup ? "Criar coordenador" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
