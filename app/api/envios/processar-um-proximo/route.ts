import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  try {
    const agora = new Date().toISOString();

    const { data: item, error } = await supabase
      .from("envio_fila")
      .select("*")
      .in("status", ["pendente", "agendado"])
      .or(`agendado_para.is.null,agendado_para.lte.${agora}`)
      .order("agendado_para", { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!item) {
      return NextResponse.json({ ok: true, mensagem: "Nada para processar" });
    }

    await supabase.from("envio_fila").update({ status: "processando" }).eq("id", item.id);

    let midiaUrl: string | null = null;
    if (item.evento_id && item.tipo_envio) {
      const { data: campanha } = await supabase
        .from("envio_campanhas")
        .select("midia_url")
        .eq("evento_id", item.evento_id)
        .eq("tipo_envio", item.tipo_envio)
        .eq("ativo", true)
        .maybeSingle();
      midiaUrl = campanha?.midia_url || null;
    }

    await enviarWhatsApp(item, midiaUrl);

    await supabase
      .from("envio_fila")
      .update({ status: "enviado", processado_em: new Date().toISOString() })
      .eq("id", item.id);

    const colunaStatus =
      item.tipo_envio === "save_the_date" ? "status_envio_save_the_date" :
      item.tipo_envio === "convite" ? "status_envio_convite" :
      item.tipo_envio === "lembrete_rsvp" ? "status_envio_lembrete_rsvp" :
      item.tipo_envio === "lembrete_evento" ? "status_envio_lembrete_evento" :
      item.tipo_envio === "cartao_evento" ? "status_envio_cartao" : null;

    if (colunaStatus && item.convidado_id) {
      await supabase.from("convidados").update({ [colunaStatus]: "enviado" }).eq("id", item.convidado_id);
    }

    await supabase.from("envio_historico").insert({
      evento_id: item.evento_id,
      convidado_id: item.convidado_id,
      tipo_envio: item.tipo_envio,
      telefone: item.telefone,
      mensagem: item.mensagem,
      status: "enviado",
    });

    return NextResponse.json({ ok: true, enviado: item.id, telefone: item.telefone });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

async function enviarWhatsApp(item: any, midiaUrl?: string | null) {
  const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID!;
  const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ZAPI_CLIENT_TOKEN) headers["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;

  if (midiaUrl) {
    const res = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-image`,
      { method: "POST", headers, body: JSON.stringify({ phone: item.telefone, image: midiaUrl, caption: item.mensagem }) }
    );
    if (!res.ok) throw new Error("Erro Z-API (imagem): " + await res.text());
  } else {
    const res = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      { method: "POST", headers, body: JSON.stringify({ phone: item.telefone, message: item.mensagem }) }
    );
    if (!res.ok) throw new Error("Erro Z-API: " + await res.text());
  }
}
