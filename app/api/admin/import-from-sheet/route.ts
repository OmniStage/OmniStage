import { NextResponse } from "next/server";

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  return result.map((value) => value.replace(/^"|"$/g, "").trim());
}

function isHeader(cols: string[]) {
  const first = (cols[0] || "").toLowerCase();
  const second = (cols[1] || "").toLowerCase();
  const third = (cols[2] || "").toLowerCase();

  return first.includes("id") && second.includes("grupo") && third.includes("nome");
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Erro ao acessar planilha");
    }

    const csv = await response.text();

    const linhas = csv
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter(Boolean);

    const parsed = linhas
      .map(parseCsvLine)
      .filter((cols) => cols.length >= 3)
      .filter((cols) => !isHeader(cols))
      .map((cols) => ({
        legacy_id: cols[0] || "",
        grupo: cols[1] || "",
        nome: cols[2] || "",
        telefone: cols[3] || "",
        status_rsvp: cols[4] || "",
        data_resposta: cols[5] || "",
        status_envio: cols[6] || "",
        data_hora: cols[7] || "",
      }))
      .filter((item) => item.nome);

    return NextResponse.json({
      ok: true,
      total: parsed.length,
      data: parsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao importar planilha" },
      { status: 500 }
    );
  }
}
