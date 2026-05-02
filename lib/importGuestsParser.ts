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
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

export function parseGuestList(text: string): ParsedGuest[] {
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((rawLine) => {
      let line = rawLine.trim();
      let quantidade = 1;
      let phone: string | null = null;
      let grupo: string | null = null;
      let name = "";

      // Remove ID inicial: 3 FAMILIA_ANDREZZA ANDREZZA FERRAZ
      line = line.replace(/^\d+\s+/, "").trim();

      // Pega telefone no final da linha
      const phoneMatch = line.match(/(\+?\d[\d\s().-]{7,}\d)$/);

      if (phoneMatch) {
        phone = cleanPhone(phoneMatch[0]);
        line = line.replace(phoneMatch[0], "").trim();
      }

      // Quantidade entre parênteses: Família Silva (4)
      const quantidadeParenteses = line.match(/\((\d+)\)/);

      if (quantidadeParenteses) {
        quantidade = Number(quantidadeParenteses[1]);
        line = line.replace(quantidadeParenteses[0], "").trim();
      }

      // +1, +2, etc.
      const plusMatch = line.match(/\+(\d+)/);

      if (plusMatch) {
        quantidade = 1 + Number(plusMatch[1]);
        line = line.replace(plusMatch[0], "").trim();
      }

      // Padrão da sua tabela:
      // FAMILIA_ANDREZZA   ANDREZZA FERRAZ
      // INDIVIDUAL_ALESSANDRA BARROS   ALESSANDRA BARROS
      const partes = line
        .split(/\t+|\s{2,}/)
        .map((parte) => parte.trim())
        .filter(Boolean);

      if (partes.length >= 2) {
        grupo = partes[0].toUpperCase();
        name = partes.slice(1).join(" ");
      } else {
        name = line;
      }

      name = name
        .replace(/[-–—]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        name: titleCase(name),
        phone,
        grupo,
        quantidade,
        observacoes: null,
        raw: rawLine,
      };
    })
    .filter((guest) => guest.name.length > 1);
}
