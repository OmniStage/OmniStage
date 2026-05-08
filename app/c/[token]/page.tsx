"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  preencherTemplate,
  injetarConvidadosNoConvite,
  renderizarTemplateVisual,
  type EventoConvite,
  type VisualBlock,
} from "@/lib/convite-render";

type Convidado = {
  id: string;
  nome: string;
  token: string;
  evento_id: string;
  grupo: string | null;
  tipo_convite: string | null;
};

type Evento = EventoConvite & {
  invite_template_id: string | null;
};

type Template = {
  id: string;
  nome: string | null;
  name: string | null;
  html_template: string | null;
  editor_mode: "html" | "visual" | null;
  preview_image: string | null;
  background_image: string | null;
  logo_image: string | null;
  visual_config: any;
};

export default function ConvitePublicoPage() {
  const params = useParams();
  const token = String(params.token || "");

  const [htmlFinal, setHtmlFinal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) carregarConvite(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function carregarConvite(tokenUrl: string) {
    setLoading(true);

    const tokenDecodificado = decodeURIComponent(tokenUrl);

    const tokens = tokenDecodificado
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!tokens.length) {
      setHtmlFinal(htmlErro("Convite inválido."));
      setLoading(false);
      return;
    }

    const { data: convidados, error: convidadosError } = await supabase
      .from("convidados")
      .select("id,nome,token,evento_id,grupo,tipo_convite")
      .in("token", tokens);

    if (convidadosError || !convidados?.length) {
      setHtmlFinal(htmlErro("Convite não encontrado."));
      setLoading(false);
      return;
    }

    const convidadosOrdenados = tokens
      .map((tokenItem) =>
        convidados.find((convidado) => convidado.token === tokenItem),
      )
      .filter(Boolean) as Convidado[];

    const convidadosDoConvite = convidadosOrdenados.length
      ? convidadosOrdenados
      : (convidados as Convidado[]);

    const convidadoBase = convidadosDoConvite[0];

    if (!convidadoBase?.evento_id) {
      setHtmlFinal(htmlErro("Convite inválido."));
      setLoading(false);
      return;
    }

    const { data: evento } = await supabase
      .from("eventos")
      .select(
        `
        id,
        nome,
        data_evento,
        local,
        invite_template_id,
        horario,
        endereco,
        mapa_url,
        background_image,
        background_url,
        logo_image,
        logo_url,
        music_file,
        musica_url
      `,
      )
      .eq("id", convidadoBase.evento_id)
      .maybeSingle();

    if (!evento?.invite_template_id) {
      setHtmlFinal(htmlErro("Evento sem convite aplicado."));
      setLoading(false);
      return;
    }

    const { data: template } = await supabase
      .from("invite_templates")
      .select(
        `
        id,
        nome,
        name,
        html_template,
        editor_mode,
        preview_image,
        background_image,
        logo_image,
        visual_config
      `,
      )
      .eq("id", evento.invite_template_id)
      .maybeSingle();

    if (!template) {
      setHtmlFinal(htmlErro("Modelo de convite não encontrado."));
      setLoading(false);
      return;
    }

    const nomesDoConvite = convidadosDoConvite
      .map((item) => item.nome)
      .filter(Boolean);

    let htmlDoEvento = "";
    const isVisual = template.editor_mode === "visual";

    if (isVisual) {
      const { data: blocksData, error: blocksError } = await supabase
        .from("invite_template_blocks")
        .select("*")
        .eq("template_id", template.id)
        .order("z_index", { ascending: true });

      if (blocksError) {
        setHtmlFinal(htmlErro("Erro ao carregar blocos do convite."));
        setLoading(false);
        return;
      }

      htmlDoEvento = renderizarTemplateVisual(
        template as Template,
        (blocksData || []) as VisualBlock[],
        evento as Evento,
      );

      htmlDoEvento = injetarConvidadosNoConvite(
        htmlDoEvento,
        nomesDoConvite.length ? nomesDoConvite : ["Convidado"],
      );
    } else if (template.html_template?.trim()) {
      htmlDoEvento = preencherTemplate(
        template.html_template,
        evento as Evento,
      );

      htmlDoEvento = injetarConvidadosNoConvite(
        htmlDoEvento,
        nomesDoConvite.length ? nomesDoConvite : ["Convidado"],
      );
    } else {
      setHtmlFinal(htmlErro("Modelo de convite não encontrado."));
      setLoading(false);
      return;
    }

    setHtmlFinal(htmlDoEvento);
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
        <h1>${escapeHtml(message)}</h1>
      </div>
    </main>
  `;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function escapeCssValue(value: string) {
  return String(value || "").replace(/[<>]/g, "");
}

function safeCssUrl(value: string) {
  return String(value || "").replace(/["'()<>]/g, "");
}
