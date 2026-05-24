import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  let filaAtual: any = null;

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const { data: fila, error: filaError } = await supabase
      .from("event_gift_ai_queue")
      .select(`
        id,
        gift_record_id,
        status,
        tentativas,
        event_gift_records (
          id,
          foto_url,
          status
        )
      `)
      .in("status", ["pendente", "processando"])
      .is("processado_em", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (filaError) throw filaError;

    if (!fila) {
      return NextResponse.json({
        success: true,
        message: "Nenhum item pendente",
      });
    }

    filaAtual = fila;

    const tentativasAtuais =
      typeof fila.tentativas === "number" ? fila.tentativas : 0;

    await supabase
      .from("event_gift_ai_queue")
      .update({
        status: "processando",
        tentativas: tentativasAtuais + 1,
        erro: null,
      })
      .eq("id", fila.id);

    const registro: any = Array.isArray(fila.event_gift_records)
      ? fila.event_gift_records[0]
      : fila.event_gift_records;

    if (registro?.status !== "ativo") {
      await supabase
        .from("event_gift_ai_queue")
        .update({
          status: "cancelado",
          erro: "Presente cancelado ignorado pela IA",
          processado_em: new Date().toISOString(),
        })
        .eq("id", fila.id);

      return NextResponse.json({
        success: false,
        ignored: true,
        fila_id: fila.id,
        gift_record_id: fila.gift_record_id,
        message: "Presente cancelado ignorado",
      });
    }

    if (!registro?.foto_url) {
      await supabase
        .from("event_gift_ai_queue")
        .update({
          status: "erro",
          erro: "Registro sem foto",
          processado_em: new Date().toISOString(),
        })
        .eq("id", fila.id);

      return NextResponse.json({
        success: false,
        message: "Registro sem foto",
        fila_id: fila.id,
      });
    }

    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Você analisa embalagens visíveis de presentes em eventos. Detecte apenas a marca visível na embalagem e a categoria provável pela embalagem. Nunca tente adivinhar o produto interno. Retorne SOMENTE JSON válido no formato: {"marca": "", "categoria": "", "confianca": 0.95}. Categorias permitidas: beleza, vestuario, joias, semijoias, bijuterias, eletronicos, decoracao, infantil, calcados, esporte, brinquedos, premium, outros. Se não conseguir identificar, use null nos campos e confianca baixa.',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta embalagem de presente.",
              },
              {
                type: "image_url",
                image_url: {
                  url: registro.foto_url,
                },
              },
            ],
          },
        ],
      }),
    });

    const respostaTexto = await resposta.text();

    if (!resposta.ok) {
      throw new Error("Erro OpenAI: " + respostaTexto);
    }

    const respostaJson = JSON.parse(respostaTexto);
    const conteudo = respostaJson?.choices?.[0]?.message?.content;

    if (!conteudo) {
      throw new Error("IA sem resposta");
    }

    const resultado = JSON.parse(conteudo);

    await supabase
      .from("event_gift_records")
      .update({
        marca_detectada: resultado.marca || null,
        produto_detectado: null,
        categoria_detectada: resultado.categoria || null,
        ia_confianca:
          typeof resultado.confianca === "number" ? resultado.confianca : null,
        ia_processado: true,
        ia_processado_em: new Date().toISOString(),
      })
      .eq("id", registro.id)
      .eq("status", "ativo");

    await supabase
      .from("event_gift_ai_queue")
      .update({
        status: "concluido",
        erro: null,
        processado_em: new Date().toISOString(),
      })
      .eq("id", fila.id);

    return NextResponse.json({
      success: true,
      fila_id: fila.id,
      gift_record_id: registro.id,
      resultado,
    });
  } catch (error: any) {
    console.error(error);

    if (filaAtual?.id) {
      const tentativasAtuais =
        typeof filaAtual.tentativas === "number" ? filaAtual.tentativas : 0;

      await supabase
        .from("event_gift_ai_queue")
        .update({
          status: tentativasAtuais + 1 >= 3 ? "erro" : "pendente",
          erro: error.message || "Erro desconhecido ao processar IA",
          processado_em:
            tentativasAtuais + 1 >= 3 ? new Date().toISOString() : null,
        })
        .eq("id", filaAtual.id);
    }

    return NextResponse.json(
      {
        success: false,
        fila_id: filaAtual?.id || null,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
