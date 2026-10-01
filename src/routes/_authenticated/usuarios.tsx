import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createUser, updateUser } from "@/lib/users.functions";
import { ROLE_LABELS, canEdit, formatDate, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | Checklist de Células - Viveo" },
      { name: "description", content: "Gestão de usuários e perfis de acesso." },
      { property: "og:title", content: "Usuários | Checklist de Células - Viveo" },
      { property: "og:description", content: "Gestão de usuários e perfis de acesso." },
    ],
  }),
  component: Usuarios,
});

type U = { id: string; email: string; ativo: boolean; created_at: string; role: AppRole | null };

function Usuarios() {
  const { role } = Route.useRouteContext();
  const editable = canEdit(role);
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<U | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<AppRole>("lider");
  const [ativo, setAtivo] = useState(true);

  const { data = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, email, ativo, created_at").order("email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      const map = new Map((r.data ?? []).map((x) => [x.user_id, x.role as AppRole]));
      return (p.data ?? []).map((u) => ({ ...u, role: map.get(u.id) ?? null })) as U[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) await updateFn({ data: { id: editing.id, role: perfil, ativo } });
      else await createFn({ data: { email: email.trim(), password: senha, role: perfil } });
    },
    onSuccess: () => {
      toast.success("Usuário salvo.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openForm(u: U | null) {
    setEditing(u);
    setEmail(u?.email ?? "");
    setSenha("");
    setPerfil(u?.role ?? "lider");
    setAtivo(u?.ativo ?? true);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-primary">Usuários</h1>
        {editable && (
          <Button onClick={() => openForm(null)}>
            <Plus /> Novo usuário
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-secondary text-sm uppercase tracking-wide text-secondary-foreground">
            <tr>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">Perfil</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3">Cadastro</th>
              {editable && <th className="px-5 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-5 py-6 text-muted-foreground">Carregando...</td></tr>
            )}
            {data.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-5 py-3 text-lg font-semibold">{u.email}</td>
                <td className="px-5 py-3">{u.role ? ROLE_LABELS[u.role] : "—"}</td>
                <td className="px-5 py-3">
                  <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                {editable && (
                  <td className="px-5 py-2 text-right">
                    <Button variant="outline" onClick={() => openForm(u)}>
                      <Pencil /> Editar
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required disabled={!!editing} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="senha">Senha inicial (mín. 8 caracteres)</Label>
                <Input id="senha" type="password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={perfil} onValueChange={(v) => setPerfil(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r} className="min-h-12 text-base">{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <label className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold">
                <Switch checked={ativo} onCheckedChange={setAtivo} /> {ativo ? "Ativo" : "Inativo"}
              </label>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
