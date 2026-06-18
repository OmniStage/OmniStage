import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 IMPORTANTE
);

export async function GET() {
  try {
    const agora = new Date().toISOString();

    // 1. Buscar envios pendentes (agendado_para nulo ou já passou)
    const { data: filas, error } = await supabase
      .from("envio_fila")
      .select("*")
      .in("status", ["pendente", "agendado"])
      .or(`agendado_para.is.null,agendado_para.lte.${agora}`)
      .limit(20);

    if (error) throw error;

    if (!filas || filas.length === 0) {
      return NextResponse.json({ ok: true, message: "Nada para processar" });
    }

    for (const item of filas) {
      try {
        // 2. Marcar como processando
        await supabase
          .from("envio_fila")
          .update({ status: "processando" })
          .eq("id", item.id);

        // 3. Buscar mídia da campanha (se houver)
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

        // 4. Enviar via Z-API (com delay para evitar bloqueio)
        await new Promise((resolve) => setTimeout(resolve, 4000 + Math.random() * 3000));
        await enviarWhatsApp(item, midiaUrl);

        // 5. Marcar como enviado
        await supabase
          .from("envio_fila")
          .update({
            status: "enviado",
            processado_em: new Date().toISOString(),
          })
          .eq("id", item.id);

        // 6. Atualizar status no convidado
        const colunaStatus =
          item.tipo_envio === "save_the_date" ? "status_envio_save_the_date" :
          item.tipo_envio === "convite" ? "status_envio_convite" :
          item.tipo_envio === "lembrete_rsvp" ? "status_envio_lembrete_rsvp" :
          item.tipo_envio === "lembrete_evento" ? "status_envio_lembrete_evento" :
          item.tipo_envio === "cartao_evento" ? "status_envio_cartao" :
          item.tipo_envio === "cartao" ? "status_envio_cartao" : null;

        if (colunaStatus && item.convidado_id) {
          await supabase
            .from("convidados")
            .update({ [colunaStatus]: "enviado" })
            .eq("id", item.convidado_id);
        }

        // 7. Histórico
        await supabase.from("envio_historico").insert({
          evento_id: item.evento_id,
          convidado_id: item.convidado_id,
          tipo_envio: item.tipo_envio,
          telefone: item.telefone,
          mensagem: item.mensagem,
          status: "enviado",
        });
      } catch (err: any) {
        // erro individual
        await supabase
          .from("envio_fila")
          .update({
            status: "erro",
            erro: err.message,
          })
          .eq("id", item.id);
      }
    }

    const erros = await supabase
      .from("envio_fila")
      .select("id, erro")
      .eq("status", "erro")
      .in("id", filas.map((f) => f.id));

    return NextResponse.json({
      ok: true,
      processados: filas.length,
      erros: erros.data?.filter((e) => e.erro) || [],
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}

async function enviarWhatsApp(item: any, midiaUrl?: string | null) {
  const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID!;
  const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.ZAPI_CLIENT_TOKEN) {
    headers["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
  }

  if (midiaUrl) {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-image`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: item.telefone,
        image: midiaUrl,
        caption: item.mensagem,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error("Erro Z-API (imagem): " + error);
    }
  } else {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: item.telefone,
        message: item.mensagem,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error("Erro Z-API: " + error);
    }
  }

  return true;
}
