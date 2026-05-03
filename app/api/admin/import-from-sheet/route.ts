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

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function isRealHeaderRow(cols: string[]) {
  const normalized = cols.map(normalizeHeader);

  const hasId = normalized.includes("id");
  const hasGrupo = normalized.includes("grupo");
  const hasNome = normalized.includes("nome");
  const hasTelefone = normalized.includes("telefone");

  return hasId && hasGrupo && hasNome && hasTelefone;
}

function findHeaderIndex(rows: string[][]) {
  return rows.findIndex((cols) => isRealHeaderRow(cols));
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

    const rows = csv
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter(Boolean)
      .map(parseCsvLine)
      .filter((cols) => cols.length > 0);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Planilha vazia ou sem dados válidos." },
        { status: 400 }
      );
    }

    const headerIndex = findHeaderIndex(rows);

    if (headerIndex < 0) {
      return NextResponse.json(
        {
          error:
            "Não encontrei a linha de títulos da planilha. Ela precisa conter: ID, Grupo, Nome e Telefone.",
        },
        { status: 400 }
      );
    }

    const headers = rows[headerIndex].map((header) => header.trim());

    const dataRows = rows
      .slice(headerIndex + 1)
      .filter((cols) => cols.some((value) => value && value.trim()))
      .filter((cols) => {
        const normalized = cols.map(normalizeHeader);
        return !isRealHeaderRow(cols) && !normalized.includes("id_grupo_nome");
      });

    return NextResponse.json({
      ok: true,
      total: dataRows.length,
      headers,
      rows: dataRows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao importar planilha" },
      { status: 500 }
    );
  }
}
