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
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1) : ""
    )
    .join(" ");
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeStatusRsvp(value: string | null): string {
  const v = normalize(value || "");

  if (!v) return "pendente";
  if (v.includes("confirm")) return "confirmado";
  if (v.includes("nao")) return "nao";
  if (v.includes("pend")) return "pendente";

  return "pendente";
}

function normalizeStatusEnvio(value: string | null): string {
  const v = normalize(value || "");

  if (!v) return "pendente";
  if (v.includes("enviado")) return "enviado";
  if (v.includes("erro")) return "erro";
  if (v.includes("pend")) return "pendente";

  return "pendente";
}

export function parseLegacyGuestList(text: string): ParsedLegacyGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^id\s+grupo\s+nome/i.test(line))
    .map((rawLine) => {
      const parts = rawLine
        .split(/\t+|\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      const legacy_id = parts[0] || null;
      const grupo = parts[1] || null;

      const rawName = parts[2] || `Convidado ${legacy_id || "sem nome"}`;
      const name = titleCase(rawName);

      const phone = parts[3] ? cleanPhone(parts[3]) : null;

      return {
        legacy_id,
        grupo,
        name,
        phone,
        status_rsvp: normalizeStatusRsvp(parts[4] || null),
        data_hora_rsvp: parts[5] || null,
        status_envio: normalizeStatusEnvio(parts[6] || null),
        data_hora_envio: parts[7] || null,
        raw: rawLine,
      };
    })
    .filter((guest) => {
      if (guest.name.length > 1) return true;

      console.warn("Linha ignorada na importação:", guest.raw);
      return false;
    });
}
