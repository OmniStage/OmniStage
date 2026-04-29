
export type GuestStatus = "confirmado" | "pendente" | "entrou";

export type Guest = {
  id: string;
  nome: string;
  grupo: string;
  telefone?: string;
  token: string;
  status: GuestStatus;
};
