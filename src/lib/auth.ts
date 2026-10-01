export type AppRole = "analista" | "coordenador" | "lider" | "monitora";

export const ROLE_LABELS: Record<AppRole, string> = {
  analista: "Analista",
  coordenador: "Coordenador",
  lider: "Líder",
  monitora: "Monitora",
};

export const canEdit = (role: AppRole | null | undefined) =>
  role === "analista" || role === "coordenador";

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
