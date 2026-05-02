export type ParsedLegacyGuest = {
  legacy_id: string | null;
  grupo: string | null;
  name: string;
  phone: string | null;
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
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

export function parseLegacyGuestList(text: string): ParsedLegacyGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((rawLine) => {
      let line = rawLine.trim();

      const idMatch = line.match(/^(\d+)\s+/);
      const legacyId = idMatch ? idMatch[1] : null;

      if (idMatch) {
        line = line.replace(idMatch[0], "").trim();
      }

      const phoneMatch = line.match(/(\+?\d[\d\s().-]{7,}\d)$/);
      const phone = phoneMatch ? cleanPhone(phoneMatch[0]) : null;

      if (phoneMatch) {
        line = line.replace(phoneMatch[0], "").trim();
      }

      const partes = line
        .split(/\t+|\s{2,}/)
        .map((parte) => parte.trim())
        .filter(Boolean);

      let grupo: string | null = null;
      let name = "";

      if (partes.length >= 2) {
        grupo = partes[0].toUpperCase();
        name = partes.slice(1).join(" ");
      } else {
        name = line;
      }

      return {
        legacy_id: legacyId,
        grupo,
        name: titleCase(name),
        phone,
        raw: rawLine,
      };
    })
    .filter((guest) => guest.name.length > 1);
}
