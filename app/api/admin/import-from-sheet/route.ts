import { NextResponse } from "next/server";

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

    const linhas = csv.split("\n").map((l) => l.trim()).filter(Boolean);

    // remove header (linha 1 ou 2 dependendo da sua planilha)
    const dados = linhas.slice(2);

    const parsed = dados.map((linha) => {
      const col = linha.split(",");

      return {
        legacy_id: col[0],
        grupo: col[1],
        nome: col[2],
        telefone: col[3],
      };
    });

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
