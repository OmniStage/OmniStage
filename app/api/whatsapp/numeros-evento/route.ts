import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Busca números configurados para um evento
export async function GET(req: Request) {
  const url = new URL(req.url);
  const evento_id = url.searchParams.get("evento_id");

  if (!evento_id) {
    return NextResponse.json({ error: "evento_id obrigatório" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("evento_whatsapp_numeros")
    .select("*")
    .eq("evento_id", evento_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Busca as tags de envio únicas e a contagem de convidados por tag
  const { data: convidados } = await supabase
    .from("convidados")
    .select("tag_envio")
    .eq("evento_id", evento_id)
    .not("tag_envio", "is", null);

  const contagemPorTag: Record<string, number> = {};
  for (const c of convidados || []) {
    if (c.tag_envio) contagemPorTag[c.tag_envio] = (contagemPorTag[c.tag_envio] || 0) + 1;
  }

  const relacoes = Object.keys(contagemPorTag);

  return NextResponse.json({ regras: data, relacoes, contagemPorTag });
}

// Salva um número para uma relação do evento
export async function POST(req: Request) {
  const body = await req.json();
  const { evento_id, tenant_id, relacao_evento, whatsapp_instance, whatsapp_numero } = body;

  if (!evento_id || !whatsapp_instance) {
    return NextResponse.json({ error: "evento_id e whatsapp_instance são obrigatórios" }, { status: 400 });
  }

  // Se já existe uma regra para esta relação neste evento, atualiza; caso contrário, insere
  const existingQuery = supabase
    .from("evento_whatsapp_numeros")
    .select("id")
    .eq("evento_id", evento_id);
  if (relacao_evento) {
    existingQuery.eq("relacao_evento", relacao_evento);
  } else {
    existingQuery.is("relacao_evento", null);
  }
  const { data: existing } = await existingQuery.maybeSingle();

  let data, error;
  if (existing?.id) {
    ({ data, error } = await supabase
      .from("evento_whatsapp_numeros")
      .update({ whatsapp_instance, whatsapp_numero: whatsapp_numero || null })
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("evento_whatsapp_numeros")
      .insert({
        evento_id,
        tenant_id,
        relacao_evento: relacao_evento || null,
        whatsapp_instance,
        whatsapp_numero: whatsapp_numero || null,
      })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// Remove um número configurado
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { error } = await supabase
    .from("evento_whatsapp_numeros")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
