import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const evento_id = url.searchParams.get("evento_id");
  const tenant_id = url.searchParams.get("tenant_id");

  if (!evento_id || !tenant_id) {
    return NextResponse.json({ error: "evento_id e tenant_id obrigatórios" }, { status: 400 });
  }

  // Busca cronograma salvo
  const { data: cronograma } = await supabase
    .from("evento_cronograma_envios")
    .select("*")
    .eq("evento_id", evento_id);

  // Busca features do plano do tenant
  const { data: membro } = await supabase
    .from("tenants")
    .select("plano_id")
    .eq("id", tenant_id)
    .maybeSingle();

  let plano: any = {};
  if (membro?.plano_id) {
    const { data } = await supabase
      .from("planos")
      .select("permite_whatsapp, permite_lista_presentes, permite_album, checkin_qrcode")
      .eq("id", membro.plano_id)
      .maybeSingle();
    plano = data || {};
  }

  // Busca data do evento
  const { data: evento } = await supabase
    .from("eventos")
    .select("data_evento")
    .eq("id", evento_id)
    .maybeSingle();

  return NextResponse.json({ cronograma: cronograma || [], plano, data_evento: evento?.data_evento || null });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { evento_id, tenant_id, tipo_envio, ativo, dias_antes, hora_envio } = body;

  if (!evento_id || !tenant_id || !tipo_envio) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("evento_cronograma_envios")
    .upsert({ evento_id, tenant_id, tipo_envio, ativo, dias_antes, hora_envio }, { onConflict: "evento_id,tipo_envio" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
