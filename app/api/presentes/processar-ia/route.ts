import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
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
      .limit(1)
      .single();

    if (filaError || !fila) {
      return NextResponse.json({
        success: false,
        message: "Nenhum item pendente",
      });
    }

    const registro: any = fila.event_gift_records;

    if (!registro?.foto_url) {
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

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },

      messages: [
        {
          role: "system",
          content: `
Você analisa embalagens de presentes.

Retorne SOMENTE JSON válido.

Formato:
{
  "marca": "",
  "produto": "",
  "categoria": "",
  "confianca": 0.95
}
          `,
        },

        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise esta embalagem de presente",
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
    });

    const conteudo = resposta.choices?.[0]?.message?.content;

    if (!conteudo) {
      throw new Error("IA sem resposta");
    }

    const resultado = JSON.parse(conteudo);

    await supabase
      .from("event_gift_records")
      .update({
        marca_detectada: resultado.marca || null,
        produto_detectado: resultado.produto || null,
        categoria_detectada: resultado.categoria || null,
        ia_confianca: resultado.confianca || null,
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
