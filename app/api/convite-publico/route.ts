import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const tokens = decodeURIComponent(token)
    .split(",")
    .map((t) => t.trim().replace(/\s/g, ""))
    .filter(Boolean);

  if (!tokens.length) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  // Busca convidados pelo token
  const { data: convidados, error: convidadosError } = await supabase
    .from("convidados")
    .select("id, nome, token, evento_id, grupo, tipo_convite")
    .in("token", tokens)
    .order("nome", { ascending: true });

  if (convidadosError || !convidados?.length) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const eventoId = convidados[0].evento_id;

  // Busca evento
  const { data: evento } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", eventoId)
    .single();

  if (!evento) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  // Busca template do evento
  const { data: eventTemplate } = await supabase
    .from("event_invite_templates")
    .select("*")
    .eq("evento_id", eventoId)
    .maybeSingle();

  let template = null;
  let blocks: any[] = [];

  if (eventTemplate?.template_id) {
    const { data: tpl } = await supabase
      .from("invite_templates")
      .select("*")
      .eq("id", eventTemplate.template_id)
      .single();

    // Mescla visual_config do template com override do evento
    if (tpl && eventTemplate.visual_config_override) {
      tpl.visual_config = {
        ...(tpl.visual_config || {}),
        ...eventTemplate.visual_config_override,
      };
    }

    template = tpl;

    if (tpl) {
      const { data: blks } = await supabase
        .from("invite_template_blocks")
        .select("*")
        .eq("template_id", tpl.id)
        .order("z_index", { ascending: true });

      blocks = blks || [];
    }
  }

  // Busca convidados do grupo se necessário
  const convidadoBase = convidados[0];
  const tipoConvite = String(convidadoBase?.tipo_convite || "").trim().toLowerCase();
  const ehNucleo = ["grupo", "nucleo"].includes(tipoConvite);

  let convidadosGrupo = convidados;

  if (tokens.length === 1 && convidadoBase?.grupo && ehNucleo) {
    const { data: grupo } = await supabase
      .from("convidados")
      .select("id, nome, token, evento_id, grupo, tipo_convite")
      .eq("evento_id", eventoId)
      .eq("grupo", convidadoBase.grupo)
      .order("nome", { ascending: true });

    if (grupo?.length) convidadosGrupo = grupo;
  }

  return NextResponse.json({
    convidados: convidadosGrupo,
    evento,
    eventTemplate,
    template,
    blocks,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, status_rsvp, convidado_ids } = body;

  if (!token || !status_rsvp) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (convidado_ids?.length) {
    const { error } = await supabase
      .from("convidados")
      .update({
        status_rsvp,
        data_resposta: new Date().toISOString(),
      })
      .in("id", convidado_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("convidados")
      .update({
        status_rsvp,
        data_resposta: new Date().toISOString(),
      })
      .eq("token", token);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
