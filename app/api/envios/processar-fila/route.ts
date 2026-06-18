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

        // 3. Enviar via Z-API
        await enviarWhatsApp(item);

        // 4. Marcar como enviado
        await supabase
          .from("envio_fila")
          .update({
            status: "enviado",
            processado_em: new Date().toISOString(),
          })
          .eq("id", item.id);

        // 5. Atualizar status no convidado
        const colunaStatus =
          item.tipo_envio === "convite" ? "status_envio_convite" :
          item.tipo_envio === "lembrete_rsvp" ? "status_envio_lembrete_rsvp" :
          item.tipo_envio === "cartao" ? "status_envio_cartao" : null;

        if (colunaStatus && item.convidado_id) {
          await supabase
            .from("convidados")
            .update({ [colunaStatus]: "enviado" })
            .eq("id", item.convidado_id);
        }

        // 6. Histórico
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

async function enviarWhatsApp(item: any) {
  const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID!;
  const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

  const body = {
    phone: item.telefone,
    message: item.mensagem,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.ZAPI_CLIENT_TOKEN) {
    headers["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error("Erro Z-API: " + error);
  }

  return true;
}
