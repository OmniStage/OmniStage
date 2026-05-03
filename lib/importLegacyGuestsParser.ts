export type ParsedLegacyGuest = {
  legacy_id: string | null;
  grupo: string | null;
  name: string;
  phone: string | null;

  status_rsvp: string | null;
  status_envio: string | null;

  data_hora_rsvp: string | null;
  data_hora_envio: string | null;

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
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseLegacyGuestList(text: string): ParsedLegacyGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((rawLine) => {
      let line = rawLine;

      const parts = line.split(/\s{2,}|\t+/).filter(Boolean);

      let legacy_id = parts[0] || null;
      let grupo = parts[1] || null;
      let name = parts[2] || "";
      let phone = parts[3] ? cleanPhone(parts[3]) : null;

      let status_rsvp: string | null = null;
      let status_envio: string | null = null;
      let data_hora_rsvp: string | null = null;
      let data_hora_envio: string | null = null;

      const lower = normalize(rawLine);

      if (lower.includes("confirmado")) status_rsvp = "confirmado";
      if (lower.includes("pendente")) status_rsvp = "pendente";

      if (lower.includes("enviado")) status_envio = "enviado";

      // datas (simples - pega padrões dd/mm/yyyy)
      const dateMatches = rawLine.match(/\d{2}\/\d{2}\/\d{4}(\s\d{2}:\d{2})?/g);

      if (dateMatches) {
        if (dateMatches[0]) data_hora_rsvp = dateMatches[0];
        if (dateMatches[1]) data_hora_envio = dateMatches[1];
      }

      return {
        legacy_id,
        grupo,
        name: titleCase(name),
        phone,
        status_rsvp,
        status_envio,
        data_hora_rsvp,
        data_hora_envio,
        raw: rawLine,
      };
    })
    .filter((g) => g.name.length > 1);
}
