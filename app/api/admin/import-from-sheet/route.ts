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

function findHeaderIndex(rows: string[][]) {
  return rows.findIndex((cols) => {
    const normalized = cols.map((col) => col.toLocaleLowerCase("pt-BR"));

    return (
      normalized.some((col) => col.includes("id")) &&
      normalized.some((col) => col.includes("grupo")) &&
      normalized.some((col) => col.includes("nome"))
    );
  });
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

    const headers =
      headerIndex >= 0
        ? rows[headerIndex]
        : rows[0].map((_, index) => `Coluna ${index + 1}`);

    const dataRows =
      headerIndex >= 0
        ? rows.slice(headerIndex + 1)
        : rows;

    const cleanedRows = dataRows
      .filter((cols) => cols.some((value) => value && value.trim()))
      .filter((cols) => cols.length >= 2);

    return NextResponse.json({
      ok: true,
      total: cleanedRows.length,
      headers,
      rows: cleanedRows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao importar planilha" },
      { status: 500 }
    );
  }
}
