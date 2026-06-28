import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { numero, mensagem } = await req.json();

  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;
  const INSTANCE = process.env.EVOLUTION_INSTANCE!;

  const url = `${BASE_URL}/message/sendText/${INSTANCE}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
    },
    body: JSON.stringify({
      number: numero.replace(/\D/g, ""),
      text: mensagem,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: data }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
