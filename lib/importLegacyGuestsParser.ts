export type ParsedLegacyGuest = {
  legacy_id: string | null;
  grupo: string | null;
  name: string;
  phone: string | null;
  status_rsvp: string;
  status_envio: string;
  observacoes: string | null;
  raw: string;
};

function cleanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1) : ""
    )
    .join(" ");
}

function normalizeStatusRsvp(value: string | null): string {
  const status = (value || "").trim().toLocaleLowerCase("pt-BR");

  if (status.includes("confirm")) return "confirmado";
  if (status.includes("não") || status.includes("nao")) return "nao";
  if (status.includes("pend")) return "pendente";

  return "pendente";
}

function normalizeStatusEnvio(value: string | null): string {
  const status = (value || "").trim().toLocaleLowerCase("pt-BR");

  if (status.includes("enviado")) return "enviado";
  if (status.includes("erro")) return "erro";
  if (status.includes("pend")) return "pendente";

  return "pendente";
}

export function parseLegacyGuestList(text: string): ParsedLegacyGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^id\s+grupo\s+nome/i.test(line))
    .map((rawLine) => {
      const cols = rawLine
        .split(/\t+|\s{2,}/)
        .map((col) => col.trim())
        .filter(Boolean);

      const legacyId = cols[0] || null;
      const grupo = cols[1] ? cols[1].toUpperCase() : null;
      const name = cols[2] || "";
      const phone = cols[3] ? cleanPhone(cols[3]) : null;

      const statusRsvp = normalizeStatusRsvp(cols[4] || null);
      const dataResposta = cols[5] || null;
      const statusEnvio = normalizeStatusEnvio(cols[6] || null);
      const dataHora = cols[7] || null;

      const observacoesParts: string[] = [];

      if (dataResposta) {
        observacoesParts.push(`Data_Resposta: ${dataResposta}`);
      }

      if (dataHora) {
        observacoesParts.push(`Dia / Horário: ${dataHora}`);
      }

      return {
        legacy_id: legacyId,
        grupo,
        name: titleCase(name),
        phone,
        status_rsvp: statusRsvp,
        status_envio: statusEnvio,
        observacoes: observacoesParts.length ? observacoesParts.join("\n") : null,
        raw: rawLine,
      };
    })
    .filter((guest) => guest.name.length > 1);
}
