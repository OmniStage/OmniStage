"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Convidado = {
  id: string;
  nome: string;
  token: string;
  evento_id: string;
  grupo: string | null;
};

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  invite_template_id: string | null;
  horario?: string | null;
  endereco?: string | null;
  mapa_url?: string | null;
  background_image?: string | null;
  logo_image?: string | null;
  music_file?: string | null;
};

type Template = {
  id: string;
  html_template: string | null;
};

export default function ConvitePublicoPage() {
  const params = useParams();
  const token = String(params.token || "");

  const [htmlFinal, setHtmlFinal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) carregarConvite(token);
  }, [token]);

  async function carregarConvite(tokenUrl: string) {
    setLoading(true);

    const tokenDecodificado = decodeURIComponent(tokenUrl);

    const { data: convidado, error: convidadoError } = await supabase
      .from("convidados")
      .select("id,nome,token,evento_id,grupo")
      .eq("token", tokenDecodificado)
      .maybeSingle();

    if (convidadoError || !convidado) {
      setHtmlFinal(htmlErro("Convite não encontrado."));
      setLoading(false);
      return;
    }

    const { data: evento, error: eventoError } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        local,
        invite_template_id,
        horario,
        endereco,
        mapa_url,
        background_image,
        logo_image,
        music_file
      `)
      .eq("id", convidado.evento_id)
      .maybeSingle();

    if (eventoError || !evento?.invite_template_id) {
      setHtmlFinal(htmlErro("Evento sem convite aplicado."));
      setLoading(false);
      return;
    }

    const { data: template, error: templateError } = await supabase
      .from("invite_templates")
      .select("id,html_template")
      .eq("id", evento.invite_template_id)
      .maybeSingle();

    if (templateError || !template?.html_template) {
      setHtmlFinal(htmlErro("Modelo de convite não encontrado."));
      setLoading(false);
      return;
    }

    let nomesDoConvite = [convidado.nome];

    if (convidado.grupo) {
      const { data: convidadosGrupo } = await supabase
        .from("convidados")
        .select("nome")
        .eq("evento_id", convidado.evento_id)
        .eq("grupo", convidado.grupo)
        .order("nome");

      if (convidadosGrupo && convidadosGrupo.length > 0) {
        nomesDoConvite = convidadosGrupo.map((item) => item.nome);
      }
    }

    const htmlDoEvento = preencherTemplate(template.html_template, evento);
    const htmlComConvidados = injetarConvidados(htmlDoEvento, nomesDoConvite);

    setHtmlFinal(htmlComConvidados);
    setLoading(false);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Carregando convite...
      </main>
    );
  }

  return (
    <iframe
      title="Convite digital"
      srcDoc={htmlFinal}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        background: "#020617",
      }}
    />
  );
}

function preencherTemplate(html: string, evento: Evento) {
  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventoDataIso = dataEvento?.toISOString() || "";
  const eventoDataScript = dataEvento?.toISOString() || "";

  const valores: Record<string, string> = {
    evento_nome: evento.nome || "",
    EVENTO_NOME: evento.nome || "",
    nome_evento: evento.nome || "",
    NOME_EVENTO: evento.nome || "",
    nome: evento.nome || "",
    NOME: evento.nome || "",

    data_evento: dataFormatada,
    DATA_EVENTO: dataFormatada,
    data: dataFormatada,
    DATA: dataFormatada,

    horario_evento: horarioFormatado,
    HORARIO_EVENTO: horarioFormatado,
    horario: horarioFormatado,
    HORARIO: horarioFormatado,

    data_horario_evento: [dataFormatada, horarioFormatado].filter(Boolean).join(" • "),
    DATA_HORARIO_EVENTO: [dataFormatada, horarioFormatado].filter(Boolean).join(" • "),

    local_evento: local,
    LOCAL_EVENTO: local,
    local: local,
    LOCAL: local,

    endereco_evento: evento.endereco || "",
    ENDERECO_EVENTO: evento.endereco || "",

    mapa_url: evento.mapa_url || "",
    MAPA_URL: evento.mapa_url || "",

    background_image: evento.background_image || "",
    BACKGROUND_IMAGE: evento.background_image || "",

    logo_image: evento.logo_image || "",
    LOGO_IMAGE: evento.logo_image || "",
    logo_evento: evento.logo_image || "",
    LOGO_EVENTO: evento.logo_image || "",

    music_file: evento.music_file || "",
    MUSIC_FILE: evento.music_file || "",
    musica_evento: evento.music_file || "",
    MUSICA_EVENTO: evento.music_file || "",

    data_iso_evento: eventoDataIso,
    DATA_ISO_EVENTO: eventoDataIso,
  };

  const preenchido = Object.entries(valores).reduce((content, [key, value]) => {
    return content.replaceAll(`{{${key}}}`, value || "");
  }, html);

  return injetarModoEvento(
    preenchido
      .replaceAll("VALENTINA XV", (evento.nome || "Evento").toUpperCase())
      .replaceAll("Valentina XV", evento.nome || "Evento")
      .replaceAll("Guerrah Hall", local || "Local do evento")
      .replaceAll("16 de maio de 2026", dataFormatada || "Data do evento")
      .replaceAll("20h", horarioFormatado || "Horário")
      .replaceAll("21h", horarioFormatado || "Horário")
      .replace(
        /const EVENT_LOCATION = ["'].*?["'];/g,
        `const EVENT_LOCATION = ${JSON.stringify(local || "")};`
      )
      .replace(
        /const EVENT_TITLE = ["'].*?["'];/g,
        `const EVENT_TITLE = ${JSON.stringify(evento.nome || "")};`
      )
      .replace(
        /const EVENT_DATE = new Date\(["'].*?["']\);/g,
        `const EVENT_DATE = new Date(${JSON.stringify
