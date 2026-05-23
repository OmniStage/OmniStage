import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
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
        event_gift_records (
          id,
          foto_url
        )
      `)
      .eq("status", "pendente")
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

    const registro: any = Array.isArray(fila.event_gift_records)
      ? fila.event_gift_records[0]
      : fila.event_gift_records;

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
      });
    }

    await supabase
      .from("event_gift_ai_queue")
      .update({
        status: "processando",
      })
      .eq("id", fila.id);

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
              'Você analisa embalagens visíveis de presentes em eventos. Detecte apenas a marca visível na embalagem e a categoria provável pela embalagem. Nunca tente adivinhar o produto interno. Retorne SOMENTE JSON válido no formato: {"marca": "", "categoria": "", "confianca": 0.95}. Categorias permitidas: beleza, vestuario, joias, eletronicos, infantil, decoracao, calcados, esporte, premium, outros. Se não conseguir identificar, use null nos campos e confianca baixa.',
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
          typeof resultado.confianca === "number"
            ? resultado.confianca
            : null,
        ia_processado: true,
        ia_processado_em: new Date().toISOString(),
      })
      .eq("id", registro.id);

    await supabase
      .from("event_gift_ai_queue")
      .update({
        status: "concluido",
        processado_em: new Date().toISOString(),
      })
      .eq("id", fila.id);

    return NextResponse.json({
      success: true,
      resultado,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

