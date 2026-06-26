import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID não informado" }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from("envio_fila")
      .select("*")
      .eq("id", id)
      .eq("status", "pendente")
      .maybeSingle();

    if (error) throw error;
    if (!item) {
      return NextResponse.json({ ok: false, error: "Item não encontrado ou já processado" });
    }

    // Marcar como processando
    await supabase.from("envio_fila").update({ status: "processando" }).eq("id", item.id);

    // Buscar mídia da campanha
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

    // Instância correta pelo tag_envio do convidado
    let instancia = process.env.EVOLUTION_INSTANCE!;
    if (item.convidado_id && item.evento_id) {
      const { data: convidado } = await supabase
        .from("convidados")
        .select("tag_envio")
        .eq("id", item.convidado_id)
        .maybeSingle();

      const tagEnvio = convidado?.tag_envio;

      if (tagEnvio) {
        const { data: numeroEvento } = await supabase
          .from("evento_whatsapp_numeros")
          .select("whatsapp_instance")
          .eq("evento_id", item.evento_id)
          .eq("relacao_evento", tagEnvio)
          .maybeSingle();
        if (numeroEvento?.whatsapp_instance) instancia = numeroEvento.whatsapp_instance;
      }

      if (instancia === process.env.EVOLUTION_INSTANCE!) {
        const { data: numeroGeral } = await supabase
          .from("evento_whatsapp_numeros")
          .select("whatsapp_instance")
          .eq("evento_id", item.evento_id)
          .is("relacao_evento", null)
          .maybeSingle();
        if (numeroGeral?.whatsapp_instance) instancia = numeroGeral.whatsapp_instance;
      }
    }

    // Enviar via Evolution API (sem janela de horário — envio manual)
    await enviarWhatsApp(item, midiaUrl, instancia);

    // Marcar como enviado
    await supabase
      .from("envio_fila")
      .update({ status: "enviado", processado_em: new Date().toISOString() })
      .eq("id", item.id);

    // Atualizar status no convidado
    const colunaStatus =
      item.tipo_envio === "save_the_date" ? "status_envio_save_the_date" :
      item.tipo_envio === "convite" ? "status_envio_convite" :
      item.tipo_envio === "lembrete_rsvp" ? "status_envio_lembrete_rsvp" :
      item.tipo_envio === "lembrete_evento" ? "status_envio_lembrete_evento" :
      item.tipo_envio === "cartao_entrada" ? "status_envio_cartao" :
      item.tipo_envio === "cartao_evento" ? "status_envio_cartao" :
      item.tipo_envio === "cartao" ? "status_envio_cartao" :
      item.tipo_envio === "link_album" ? "status_envio_album" : null;

    if (colunaStatus && item.convidado_id) {
      await supabase.from("convidados").update({ [colunaStatus]: "enviado" }).eq("id", item.convidado_id);

      // Se este convidado é o principal do grupo, marcar também todos os sem telefone do mesmo grupo
      const { data: principal } = await supabase
        .from("convidados")
        .select("grupo, contato_principal, telefone")
        .eq("id", item.convidado_id)
        .maybeSingle();

      if (principal?.contato_principal && principal.grupo && principal.telefone) {
        const { data: dependentes } = await supabase
          .from("convidados")
          .select("id")
          .eq("grupo", principal.grupo)
          .or("telefone.is.null,telefone.eq.")
          .neq("id", item.convidado_id);

        if (dependentes && dependentes.length > 0) {
          await supabase
            .from("convidados")
            .update({ [colunaStatus]: "enviado" })
            .in("id", dependentes.map((d) => d.id));
        }
      }
    }

    // Histórico
    await supabase.from("envio_historico").insert({
      evento_id: item.evento_id,
      convidado_id: item.convidado_id,
      tipo_envio: item.tipo_envio,
      telefone: item.telefone,
      mensagem: item.mensagem,
      status: "enviado",
    });

    return NextResponse.json({ ok: true, enviado: item.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

async function enviarWhatsApp(item: any, midiaUrl?: string | null, instancia?: string) {
  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;
  const INSTANCE = instancia || process.env.EVOLUTION_INSTANCE!;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": API_KEY,
  };

  const numero = item.telefone.replace(/\D/g, "");

  if (midiaUrl) {
    const res = await fetch(`${BASE_URL}/message/sendMedia/${INSTANCE}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: numero, mediatype: "image", mediaUrl: midiaUrl, caption: item.mensagem }),
    });
    if (!res.ok) throw new Error("Erro Evolution API (imagem): " + await res.text());
  } else {
    const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: numero, text: item.mensagem }),
    });
    if (!res.ok) throw new Error("Erro Evolution API: " + await res.text());
  }

  return true;
}
