export type ParsedGuest = {
  name: string;
  phone: string | null;
  grupo: string | null;
  quantidade: number;
  observacoes: string | null;
  raw: string;
};

function cleanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 8) return null;

  return digits;
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function parseGuestList(text: string): ParsedGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let raw = line;
      let quantidade = 1;
      let phone: string | null = null;
      let grupo: string | null = null;
      let observacoes: string | null = null;

      const phoneMatch = line.match(/(\+?\d[\d\s().-]{7,}\d)/);
      if (phoneMatch) {
        phone = cleanPhone(phoneMatch[0]);
        line = line.replace(phoneMatch[0], "").trim();
      }

      const quantidadeParenteses = line.match(/\((\d+)\)/);
      if (quantidadeParenteses) {
        quantidade = Number(quantidadeParenteses[1]);
        line = line.replace(quantidadeParenteses[0], "").trim();
      }

      const plusMatch = line.match(/\+(\d+)/);
      if (plusMatch) {
        quantidade = 1 + Number(plusMatch[1]);
        line = line.replace(plusMatch[0], "").trim();
      }

      if (/família|familia|grupo/i.test(line)) {
        grupo = titleCase(line);
      }

      line = line
        .replace(/[-–—]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        name: titleCase(line),
        phone,
        grupo,
        quantidade,
        observacoes,
        raw,
      };
    })
    .filter((guest) => guest.name.length > 1);
}
