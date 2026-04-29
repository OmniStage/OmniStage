export type GuestStatus = "pendente" | "confirmado" | "entrou" | "nao";

export type Guest = {
  id: string | number;
  name?: string;
  nome?: string;
  email?: string | null;
  phone?: string | null;
  telefone?: string | null;
  grupo?: string | null;
  status?: GuestStatus | string | null;
  token?: string | null;
  checkin?: boolean | null;
  created_at?: string | null;
  data_confirmacao?: string | null;
  link_cartao?: string | null;
};

export function guestName(g: Guest) {
  return g.nome || g.name || "Convidado";
}

export function guestPhone(g: Guest) {
  return g.telefone || g.phone || "";
}

export function guestStatus(g: Guest): GuestStatus {
  const s = String(g.status || "pendente").toLowerCase();
  if (s.includes("entrou")) return "entrou";
  if (s.includes("confirm")) return "confirmado";
  if (s.includes("nao") || s.includes("não")) return "nao";
  return "pendente";
}
