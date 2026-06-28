import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;
  const url = new URL(req.url);
  const INSTANCE = url.searchParams.get("instance") || process.env.EVOLUTION_INSTANCE!;

  // Verifica status atual da instância
  const statusRes = await fetch(`${BASE_URL}/instance/fetchInstances`, {
    headers: { apikey: API_KEY },
  });

  let instanciaExiste = false;

  if (statusRes.ok) {
    const instancias: any[] = await statusRes.json();
    const instancia = instancias.find((i: any) => i.name === INSTANCE);

    if (instancia?.connectionStatus === "open") {
      return NextResponse.json({ error: "WhatsApp já está conectado." }, { status: 400 });
    }

    instanciaExiste = !!instancia;
  }

  // Cria instância se não existe
  if (!instanciaExiste) {
    const createRes = await fetch(`${BASE_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify({ instanceName: INSTANCE, integration: "WHATSAPP-BAILEYS" }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: "Erro ao criar instância: " + errText }, { status: 500 });
    }
    // Aguarda instância inicializar
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Gera QR Code
  const res = await fetch(`${BASE_URL}/instance/connect/${INSTANCE}`, {
    headers: { apikey: API_KEY },
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: "Erro ao conectar: " + errText }, { status: 500 });
  }

  const data = await res.json();

  // Prefere o código raw para renderizar localmente (preto e branco)
  // Evolution API retorna: { code: "2@xxx...", base64: "data:image/png..." }
  const qrRaw = data.code || data.qrcode || null;
  const qrBase64 = data.base64 || null;

  if (!qrRaw && !qrBase64) {
    return NextResponse.json({ error: "Instância sem sessão ativa. Vá ao Evolution Manager, delete a instância e tente novamente." }, { status: 400 });
  }

  return NextResponse.json({ qrcode: qrBase64, qrRaw });
}
