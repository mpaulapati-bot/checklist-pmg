import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/auth";

type Table = "celulas" | "turnos" | "monitoras";
type Row = { id: string; nome: string; ativo: boolean; created_at: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function CadastroTab({
  table,
  singular,
  novoLabel,
  ativaLabel,
  editable,
}: {
  table: Table;
  singular: string;
  novoLabel: string;
  ativaLabel: string;
  editable: boolean;
}) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [somenteAtivas, setSomenteAtivas] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id, nome, ativo, created_at")
        .order("nome");
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = useMemo(
    () => data.filter((r) => (!somenteAtivas || r.ativo) && norm(r.nome).includes(norm(busca))),
    [data, busca, somenteAtivas],
  );

  const errMsg = (e: { code?: string; message: string }) =>
    e.code === "23505"
      ? `Já existe ${singular.toLowerCase()} ativa com esse nome.`
      : e.code === "42501"
        ? "Sem permissão para esta ação."
        : e.message;

  const save = useMutation({
    mutationFn: async () => {
      const value = nome.trim();
      if (!value) throw new Error("Informe o nome.");
      const q = editing
        ? supabase.from(table).update({ nome: value }).eq("id", editing.id)
        : supabase.from(table).insert({ nome: value });
      const { error } = await q;
      if (error) throw new Error(errMsg(error));
    },
    onSuccess: () => {
      toast.success("Salvo com sucesso.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase.from(table).update({ ativo: !r.ativo }).eq("id", r.id);
      if (error) throw new Error(errMsg(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function openForm(r: Row | null) {
    setEditing(r);
    setNome(r?.nome ?? "");
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome"
            className="pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg bg-card px-4 font-semibold">
          <Switch checked={somenteAtivas} onCheckedChange={setSomenteAtivas} />
          {ativaLabel}
        </label>
        {editable && (
          <Button onClick={() => openForm(null)}>
            <Plus /> {novoLabel}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-secondary text-sm uppercase tracking-wide text-secondary-foreground">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3">Cadastro</th>
              {editable && <th className="px-5 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="px-5 py-6 text-muted-foreground" colSpan={4}>Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td className="px-5 py-6 text-muted-foreground" colSpan={4}>Nenhum registro encontrado.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-5 py-3 text-lg font-semibold">{r.nome}</td>
                <td className="px-5 py-3">
                  <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                {editable && (
                  <td className="px-5 py-2">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => openForm(r)}>
                        <Pencil /> Editar
                      </Button>
                      <Button variant="outline" onClick={() => toggle.mutate(r)} disabled={toggle.isPending}>
                        <Power /> {r.ativo ? "Inativar" : "Reativar"}
                      </Button>
                    </div>
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
            <DialogTitle>{editing ? `Editar ${singular.toLowerCase()}` : novoLabel}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" autoFocus maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
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
