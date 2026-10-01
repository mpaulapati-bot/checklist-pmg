import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    const [{ data: role }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle(),
      supabase.from("profiles").select("ativo").eq("id", data.user.id).maybeSingle(),
    ]);
    if (!profile?.ativo) {
      await supabase.auth.signOut();
      throw redirect({ to: "/" });
    }
    return { user: data.user, role: (role?.role ?? null) as AppRole | null };
  },
  component: AppShell,
});

function AppShell() {
  const { user, role } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const item =
    "flex min-h-12 items-center gap-3 rounded-lg px-4 font-semibold transition-colors hover:bg-sidebar-accent";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground">
        <div className="px-3 py-4">
          <div className="text-2xl font-extrabold tracking-tight">
            viveo<span className="text-sidebar-primary">.</span>
          </div>
          <div className="text-sm opacity-75">Checklist de Células</div>
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          <Link
            to="/cadastros"
            className={item}
            activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
          >
            <ClipboardList className="size-5" /> Cadastros
          </Link>
          <Link
            to="/usuarios"
            className={item}
            activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
          >
            <Users className="size-5" /> Usuários
          </Link>
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <div className="px-3">
            <div className="truncate font-semibold" title={user.email}>{user.email}</div>
            <div className="text-sm text-sidebar-primary">{role ? ROLE_LABELS[role] : "Sem perfil"}</div>
          </div>
          <button onClick={signOut} className={`${item} mt-2 w-full`}>
            <LogOut className="size-5" /> Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
