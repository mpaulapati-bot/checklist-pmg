import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["analista", "coordenador", "lider", "monitora"]);

async function assertEditor(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_editor", { _user_id: userId });
  if (error || !data) throw new Error("Sem permissão para esta ação.");
}

export const createFirstUser = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().email().max(255), password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: has } = await supabaseAdmin.rpc("system_has_users");
    if (has) throw new Error("O sistema já possui usuários.");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(8).max(72),
        role: roleSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      app_metadata: { role: data.role },
    });
    if (error) {
      if (error.message.toLowerCase().includes("already")) throw new Error("Este e-mail já está cadastrado.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), role: roleSchema, ativo: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId);
    if (data.id === context.userId && (!data.ativo || !["analista", "coordenador"].includes(data.role))) {
      throw new Error("Você não pode inativar nem remover sua própria permissão de edição.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r1 = await supabaseAdmin.from("user_roles").update({ role: data.role }).eq("user_id", data.id);
    if (r1.error) throw new Error(r1.error.message);
    const r2 = await supabaseAdmin.from("profiles").update({ ativo: data.ativo }).eq("id", data.id);
    if (r2.error) throw new Error(r2.error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.ativo ? "none" : "876000h",
    });
    return { ok: true };
  });
