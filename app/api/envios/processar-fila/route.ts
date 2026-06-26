import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 IMPORTANTE
);

export async function GET() {
  try {
    // Janela de envio: apenas entre 09h e 20h (horário de Brasília, UTC-3)
    const agora = new Date();
    const horaBrasilia = agora.getUTCHours() - 3;
    if (horaBrasilia < 9 || horaBrasilia >= 20) {
      return NextResponse.json({ ok: true, message: "Fora da janela de envio (09h–20h). Aguardando próximo horário permitido." });
    }
    const agoraISO = agora.toISOString();

    // 1. Buscar envios pendentes (agendado_para nulo ou já passou)
    const { data: filas, error } = await supabase
      .from("envio_fila")
      .select("*")
      .in("status", ["pendente", "agendado"])
      .or(`agendado_para.is.null,agendado_para.lte.${agoraISO}`)
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

        // 4. Buscar instância correta pelo tag_envio do convidado
        let instancia = process.env.EVOLUTION_INSTANCE!;
        if (item.convidado_id && item.evento_id) {
          const { data: convidado } = await supabase
            .from("convidados")
            .select("tag_envio")
            .eq("id", item.convidado_id)
            .maybeSingle();

          const tagEnvio = convidado?.tag_envio;

          if (tagEnvio) {
            // Busca regra específica para a tag do convidado
            const { data: numeroEvento } = await supabase
              .from("evento_whatsapp_numeros")
              .select("whatsapp_instance")
              .eq("evento_id", item.evento_id)
              .eq("relacao_evento", tagEnvio)
              .maybeSingle();

            if (numeroEvento?.whatsapp_instance) {
              instancia = numeroEvento.whatsapp_instance;
            }
          }

          if (instancia === process.env.EVOLUTION_INSTANCE!) {
            // Fallback: regra geral do evento (relacao_evento = null = "Todos os convidados")
            const { data: numeroGeral } = await supabase
              .from("evento_whatsapp_numeros")
              .select("whatsapp_instance")
              .eq("evento_id", item.evento_id)
              .is("relacao_evento", null)
              .maybeSingle();

            if (numeroGeral?.whatsapp_instance) {
              instancia = numeroGeral.whatsapp_instance;
            }
          }
        }

        // 5. Enviar via Evolution API
        // Delay anti-bloqueio: 7-15s aleatório por mensagem.
        // Motivo: WhatsApp detecta padrões de envio em massa e bloqueia números.
        // Intervalo randomizado simula comportamento humano e reduz risco de ban.
        // Taxa resultante: ~4-8 msgs/min → ~240-480/hora por número.
        const delayMs = 7000 + Math.random() * 8000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await enviarWhatsApp(item, midiaUrl, instancia);

        // 6. Marcar como enviado
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
          item.tipo_envio === "cartao_entrada" ? "status_envio_cartao" :
          item.tipo_envio === "cartao_evento" ? "status_envio_cartao" :
          item.tipo_envio === "cartao" ? "status_envio_cartao" :
          item.tipo_envio === "link_album" ? "status_envio_album" : null;

        if (colunaStatus && item.convidado_id) {
          await supabase
            .from("convidados")
            .update({ [colunaStatus]: "enviado" })
            .eq("id", item.convidado_id);

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

async function enviarWhatsApp(item: any, midiaUrl?: string | null, instancia?: string) {
  const BASE_URL = process.env.EVOLUTION_API_URL!;
  const API_KEY = process.env.EVOLUTION_API_KEY!;
  const INSTANCE = instancia || process.env.EVOLUTION_INSTANCE!;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": API_KEY,
  };

  // Evolution API espera número no formato 5511999999999 (sem + e sem @)
  const numero = item.telefone.replace(/\D/g, "");

  if (midiaUrl) {
    const url = `${BASE_URL}/message/sendMedia/${INSTANCE}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: numero,
        mediatype: "image",
        mediaUrl: midiaUrl,
        caption: item.mensagem,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error("Erro Evolution API (imagem): " + error);
    }
  } else {
    const url = `${BASE_URL}/message/sendText/${INSTANCE}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: numero,
        text: item.mensagem,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error("Erro Evolution API: " + error);
    }
  }

  return true;
}
