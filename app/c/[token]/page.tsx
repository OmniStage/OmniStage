"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  preencherTemplate,
  injetarConvidadosNoConvite,
  type EventoConvite,
} from "@/lib/convite-render";

type Convidado = {
  id: string;
  nome: string;
  token: string;
  evento_id: string;
  grupo: string | null;
};

type Evento = EventoConvite & {
  invite_template_id: string | null;
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

    const { data: convidado } = await supabase
      .from("convidados")
      .select("id,nome,token,evento_id,grupo")
      .eq("token", tokenDecodificado)
      .maybeSingle();

    if (!convidado) {
      setHtmlFinal(htmlErro("Convite não encontrado."));
      setLoading(false);
      return;
    }

    const { data: evento } = await supabase
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

    if (!evento?.invite_template_id) {
      setHtmlFinal(htmlErro("Evento sem convite aplicado."));
      setLoading(false);
      return;
    }

    const { data: template } = await supabase
      .from("invite_templates")
      .select("id,html_template")
      .eq("id", evento.invite_template_id)
      .maybeSingle();

    if (!template?.html_template) {
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

      if (convidadosGrupo?.length) {
        nomesDoConvite = convidadosGrupo.map((item) => item.nome);
      }
    }

    const htmlDoEvento = preencherTemplate(template.html_template, evento as Evento);
    const htmlComConvidados = injetarConvidadosNoConvite(htmlDoEvento, nomesDoConvite);

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

function htmlErro(message: string) {
  return `
    <main style="min-height:100vh;background:#020617;color:white;display:grid;place-items:center;font-family:Arial,sans-serif;text-align:center;padding:24px;">
      <div>
        <h1>${message}</h1>
      </div>
    </main>
  `;
}
