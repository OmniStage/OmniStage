import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;
  const INSTANCE = process.env.EVOLUTION_INSTANCE!;

  const res = await fetch(`${BASE_URL}/instance/fetchInstances`, {
    headers: { apikey: API_KEY },
  });

  if (!res.ok) {
    return NextResponse.json({ conectado: false });
  }

  const instancias: any[] = await res.json();
  const instancia = instancias.find((i: any) => i.name.toLowerCase() === INSTANCE.toLowerCase());

  if (!instancia || instancia.connectionStatus !== "open") {
    return NextResponse.json({ conectado: false });
  }

  const numero = instancia.ownerJid?.replace("@s.whatsapp.net", "") || null;
  return NextResponse.json({ conectado: true, numero });
}
