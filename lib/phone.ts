/**
 * Aplica máscara visual: (11) 99999-9999
 * Recebe qualquer string, retorna formatada com no máximo 11 dígitos (sem 55).
 */
export function aplicarMascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Converte valor do DB (ex: "5511999999999") para exibição formatada: "(11) 99999-9999"
 */
export function telefoneParaExibir(stored: string | null | undefined): string {
  if (!stored) return "";
  const digits = stored.replace(/\D/g, "");
  // Remove prefixo 55 se houver (13 dígitos = 55 + DDD + número)
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return aplicarMascaraTelefone(local);
}

/**
 * Converte valor digitado pelo usuário para formato de storage: "55XXXXXXXXXXX"
 * Retorna string vazia se não houver dígitos suficientes.
 */
export function telefoneParaStorage(valor: string): string {
  const digits = valor.replace(/\D/g, "");
  if (digits.length === 0) return "";
  // Se já tem 55 no início e >= 12 dígitos, mantém
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}
