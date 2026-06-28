import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Protege a rota para ser chamada só pelo cron autorizado
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Janela de envio: 09h–20h horário de Brasília (UTC-3)
  const agora = new Date();
  const horaBrasilia = agora.getUTCHours() - 3;
  if (horaBrasilia < 9 || horaBrasilia >= 20) {
    return NextResponse.json({ ok: true, message: "Fora da janela de envio (09h–20h)." });
  }

  // Data de hoje em Brasília
  const hoje = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hojeStr = hoje.toISOString().split("T")[0]; // YYYY-MM-DD

  // Busca todos os cronogramas ativos
  const { data: cronogramas, error: errCron } = await supabase
    .from("evento_cronograma_envios")
    .select("evento_id, tenant_id, tipo_envio, dias_antes")
    .eq("ativo", true);

  if (errCron || !cronogramas?.length) {
    return NextResponse.json({ ok: true, message: "Nenhum cronograma ativo.", erro: errCron?.message });
  }

  // Busca datas dos eventos relevantes
  const eventoIds = [...new Set(cronogramas.map((c) => c.evento_id))];
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, nome, tenant_id, data_evento")
    .in("id", eventoIds);

  const eventoPorId = Object.fromEntries((eventos || []).map((e) => [e.id, e]));

  const disparos: { evento_id: string; tenant_id: string; tipo_envio: string }[] = [];

  for (const item of cronogramas) {
    const evento = eventoPorId[item.evento_id];
    if (!evento?.data_evento) continue;

    // Calcula a data alvo: data do evento menos dias_antes
    const dataEvento = new Date(evento.data_evento);
    const dataAlvo = new Date(dataEvento.getTime() - item.dias_antes * 24 * 60 * 60 * 1000);
    const dataAlvoStr = dataAlvo.toISOString().split("T")[0];

    if (dataAlvoStr === hojeStr) {
      disparos.push({ evento_id: item.evento_id, tenant_id: item.tenant_id, tipo_envio: item.tipo_envio });
    }
  }

  if (!disparos.length) {
    return NextResponse.json({ ok: true, message: "Nenhum disparo programado para hoje." });
  }

  const resultados: { evento_id: string; tipo_envio: string; inseridos: number; erro?: string }[] = [];

  for (const disparo of disparos) {
    try {
      const resultado = await enfileirarDisparo(disparo.evento_id, disparo.tenant_id, disparo.tipo_envio);
      resultados.push({ evento_id: disparo.evento_id, tipo_envio: disparo.tipo_envio, inseridos: resultado.inseridos, erro: resultado.erro });
    } catch (err: any) {
      resultados.push({ evento_id: disparo.evento_id, tipo_envio: disparo.tipo_envio, inseridos: 0, erro: err.message });
    }
  }

  return NextResponse.json({ ok: true, disparos: resultados });
}

async function enfileirarDisparo(eventoId: string, tenantId: string, tipoEnvio: string) {
  // Busca template ativo da campanha
  const { data: campanha } = await supabase
    .from("envio_campanhas")
    .select("template, template_texto")
    .eq("evento_id", eventoId)
    .eq("tipo_envio", tipoEnvio)
    .eq("ativo", true)
    .maybeSingle();

  const template = campanha?.template_texto || campanha?.template || "";
  if (!template) return { inseridos: 0, erro: "Sem template configurado para " + tipoEnvio };

  // Busca evento
  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome, tenant_id")
    .eq("id", eventoId)
    .maybeSingle();

  if (!evento) return { inseridos: 0, erro: "Evento não encontrado" };

  // Busca convidados do evento
  const { data: convidados } = await supabase
    .from("convidados")
    .select("id, nome, telefone, responsavel_telefone, grupo, crianca, contato_principal, recebe_convite, status_rsvp, token, tag_envio, grupo_envio, email, status_envio_convite, status_envio_save_the_date, status_envio_lembrete_rsvp, status_envio_lembrete_evento, status_envio_cartao, status_envio_album")
    .eq("evento_id", eventoId)
    .eq("tenant_id", tenantId);

  if (!convidados?.length) return { inseridos: 0, erro: "Sem convidados" };

  // Filtra público elegível para este tipo de envio
  const publico = convidados.filter((c) => deveEnviarHoje(c, tipoEnvio, convidados));

  if (!publico.length) return { inseridos: 0 };

  // Monta linhas da fila
  const linhas = publico.flatMap((convidado) => {
    const telefone = getTelefoneEnvio(convidado, convidados);
    if (!telefone) return [];

    const mensagem = montarMensagemServidor(template, convidado, evento, convidados);

    return [{ tenant_id: tenantId, evento_id: eventoId, convidado_id: convidado.id, tipo_envio: tipoEnvio, canal: "whatsapp", telefone, mensagem, status: "pendente", agendado_para: null }];
  });

  if (!linhas.length) return { inseridos: 0 };

  // Remove pendentes existentes para evitar duplicata
  await supabase
    .from("envio_fila")
    .delete()
    .eq("evento_id", eventoId)
    .eq("tipo_envio", tipoEnvio)
    .in("convidado_id", publico.map((c) => c.id))
    .in("status", ["pendente", "agendado"]);

  const { error } = await supabase.from("envio_fila").insert(linhas);
  if (error) return { inseridos: 0, erro: error.message };

  return { inseridos: linhas.length };
}

function deveEnviarHoje(convidado: any, tipoEnvio: string, todos: any[]) {
  const recebe = convidado.recebe_convite !== false && convidado.recebe_convite !== "false" && convidado.recebe_convite !== 0;
  if (!recebe) return false;

  const telefone = getTelefoneEnvio(convidado, todos);
  if (!telefone) return false;

  const jaEnviado = (campo: string) => convidado[campo] === "enviado";

  if (tipoEnvio === "save_the_date") return !jaEnviado("status_envio_save_the_date");
  if (tipoEnvio === "convite") return !jaEnviado("status_envio_convite") && ["pendente", null, undefined].includes(convidado.status_rsvp);
  if (tipoEnvio === "lembrete_rsvp") return !jaEnviado("status_envio_lembrete_rsvp") && jaEnviado("status_envio_convite") && ["pendente", null, undefined].includes(convidado.status_rsvp);
  if (tipoEnvio === "lembrete_evento") return !jaEnviado("status_envio_lembrete_evento") && jaEnviado("status_envio_convite") && ["confirmado", "confirmado_parcial"].includes(convidado.status_rsvp);
  if (tipoEnvio === "cartao_entrada") return !jaEnviado("status_envio_cartao") && ["confirmado", "confirmado_parcial"].includes(convidado.status_rsvp) && !!convidado.token;
  if (tipoEnvio === "link_album") return !jaEnviado("status_envio_album");

  return false;
}

function getTelefoneEnvio(convidado: any, todos: any[]): string | null {
  const tel = normalizarTelefone(convidado.telefone);
  if (tel) return tel;

  const respTel = (convidado.responsavel_telefone || "").split(",").map(normalizarTelefone).find(Boolean);
  if (respTel) return respTel;

  if (!convidado.grupo) return null;
  const principal = todos.find((c) => c.id !== convidado.id && c.contato_principal && normalizarTelefone(c.telefone) && c.grupo === convidado.grupo);
  return normalizarTelefone(principal?.telefone) || null;
}

function normalizarTelefone(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const limpo = tel.replace(/\D/g, "");
  if (limpo.length < 10) return null;
  return limpo.startsWith("55") ? limpo : "55" + limpo;
}

function montarMensagemServidor(template: string, convidado: any, evento: any, todos: any[]) {
  const nome = convidado.nome || "Convidado";
  const nomeEvento = evento?.nome || "";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.omnistageproducoes.com.br";
  const linkConvite = convidado.token ? `${baseUrl}/c/${convidado.token}` : "";
  const linkCartao = convidado.token ? `${baseUrl}/cartao/${convidado.token}` : "";

  return template
    .replaceAll("{{nome}}", nome)
    .replaceAll("{{evento}}", nomeEvento)
    .replaceAll("{{nome_evento}}", nomeEvento)
    .replaceAll("{{link_convite}}", linkConvite)
    .replaceAll("{{link_cartao}}", linkCartao)
    .replaceAll("{{token}}", convidado.token || "")
    .replaceAll("{{email}}", convidado.email || "");
}
