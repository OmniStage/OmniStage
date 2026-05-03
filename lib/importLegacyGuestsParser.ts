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
      word
        ? word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1)
        : ""
    )
    .join(" ");
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =========================
   NORMALIZA STATUS RSVP
========================= */
function normalizeStatusRsvp(value: string | null): string {
  const v = normalize(value || "");

  if (!v) return "pendente";

  if (v.includes("confirm")) return "confirmado";
  if (v.includes("nao") || v.includes("não")) return "nao";
  if (v.includes("pend")) return "pendente";

  return "pendente";
}

/* =========================
   NORMALIZA STATUS ENVIO
========================= */
function normalizeStatusEnvio(value: string | null): string {
  const v = normalize(value || "");

  if (!v) return "pendente";

  if (v.includes("enviado")) return "enviado";
  if (v.includes("erro")) return "erro";
  if (v.includes("pend")) return "pendente";

  return "pendente";
}

/* =========================
   PARSER PRINCIPAL
========================= */
export function parseLegacyGuestList(text: string): ParsedLegacyGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)

    // ignora header
    .filter((line) => !/^id\s+grupo\s+nome/i.test(line))

    .map((rawLine) => {
      const parts = rawLine
        .split(/\t+|\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      // segurança para evitar quebra
      const legacy_id = parts[0] || null;
      const grupo = parts[1] || null;
      const name = parts[2] || "";
      const phone = parts[3] ? cleanPhone(parts[3]) : null;

      const status_rsvp = normalizeStatusRsvp(parts[4] || null);
      const data_hora_rsvp = parts[5] || null;

      const status_envio = normalizeStatusEnvio(parts[6] || null);
      const data_hora_envio = parts[7] || null;

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

    // garante que não entra lixo
    .filter((guest) => guest.name.length > 1);
}
