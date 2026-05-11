"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  preencherTemplate,
  injetarConvidadosNoConvite,
  formatarData,
  formatarHorario,
  criarDataEvento,
  type EventoConvite,
  type VisualBlock,
} from "@/lib/convite-render";
import ConviteVisualRenderer from "@/components/ConviteVisualRenderer";

const CANVAS_W = 430;
const CANVAS_H = 920;

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

type RenderState =
  | {
      kind: "html";
      html: string;
    }
  | {
      kind: "visual";
      evento: Evento;
      template: Template;
      blocks: VisualBlock[];
      nomes: string[];
    };

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizarBlock(raw: any): VisualBlock {
  return {
    id: String(raw.id),
    template_id: String(raw.template_id),
    type: raw.type || "text",
    label: raw.label || null,
    content: raw.content || "",
    x: toNumber(raw.x, 0),
    y: toNumber(raw.y, 0),
    width: toNumber(raw.width, 200),
    height: toNumber(raw.height, 60),
    font_size: toNumber(raw.font_size, 24),
    font_family: raw.font_family || "Inter",
    color: raw.color || "#ffffff",
    background: raw.background || null,
    border_radius: toNumber(raw.border_radius, 0),
    z_index: toNumber(raw.z_index, 1),
    visible: raw.visible !== false,
  };
}

function getVisualConfig(template: Template | null) {
  return (template?.visual_config || {}) as Record<string, any>;
}

function getBackgroundUrl(template: Template | null, evento: Evento | null) {
  const visualConfig = getVisualConfig(template);

  return (
    evento?.background_url ||
    evento?.background_image ||
    visualConfig.backgroundPreviewUrl ||
    template?.background_image ||
    template?.preview_image ||
    ""
  );
}

function getLogoUrl(template: Template | null, evento: Evento | null) {
  const visualConfig = getVisualConfig(template);

  return (
    evento?.logo_url ||
    evento?.logo_image ||
    visualConfig.logoPreviewUrl ||
    template?.logo_image ||
    ""
  );
}

function criarTextoBuscaLocal(evento: Evento | null) {
  if (!evento) return "";
  return [evento.local, evento.endereco].filter(Boolean).join(" ").trim();
}

function criarMapsUrl(evento: Evento | null) {
  if (!evento) return "";
  if (evento.mapa_url) return evento.mapa_url;

  const query = criarTextoBuscaLocal(evento);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
}

function criarWazeUrl(evento: Evento | null) {
  if (!evento) return "";

  const query = criarTextoBuscaLocal(evento);
  return query ? `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes` : "";
}

function criarCalendarUrl(evento: Evento | null) {
  const dataEvento = criarDataEvento(evento);
  if (!evento || !dataEvento) return "";

  const end = new Date(dataEvento.getTime() + 4 * 60 * 60 * 1000);

  function toGoogleDate(date: Date) {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  const local = evento.local || evento.endereco || "";
  const details = "Convite digital OmniStage";

  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" +
    encodeURIComponent(evento.nome || "Evento") +
    "&dates=" +
    toGoogleDate(dataEvento) +
    "/" +
    toGoogleDate(end) +
    "&location=" +
    encodeURIComponent(local) +
    "&details=" +
    encodeURIComponent(details)
  );
}

function detectarAcaoBotao(content: string | null) {
  const texto = String(content || "").toLowerCase();

  if (texto.includes("waze") || texto.includes("trânsito") || texto.includes("transito")) {
    return "waze";
  }

  if (
    texto.includes("localização") ||
    texto.includes("localizacao") ||
    texto.includes("mapa") ||
    texto.includes("google maps") ||
    texto.includes("ver local")
  ) {
    return "maps";
  }

  if (texto.includes("calendário") || texto.includes("calendario") || texto.includes("agenda")) {
    return "calendar";
  }

  if (texto.includes("confirmar") || texto.includes("presença") || texto.includes("presenca") || texto.includes("rsvp")) {
    return "rsvp";
  }

  return "none";
}

function aplicarVariaveisPublicas(content: string | null, evento: Evento, nomes: string[]) {
  const nomePrincipal = nomes[0] || "Convidado";
  const total = nomes.length || 1;
  const dataFormatada = formatarData(evento.data_evento || null);
  const horarioFormatado = formatarHorario(evento.horario);
  const textoTotal = total === 1 ? "Convite para 1 convidado" : `Convite para ${total} convidados`;

  return String(content || "")
    .replaceAll("{{nome_evento}}", evento.nome || "Evento")
    .replaceAll("{{EVENTO_NOME}}", evento.nome || "Evento")
    .replaceAll("{{evento_nome}}", evento.nome || "Evento")
    .replaceAll("{{nome_convidado}}", nomePrincipal)
    .replaceAll("{{data_evento}}", dataFormatada || "")
    .replaceAll("{{DATA_EVENTO}}", dataFormatada || "")
    .replaceAll("{{hora_evento}}", horarioFormatado || "")
    .replaceAll("{{horario_evento}}", horarioFormatado || "")
    .replaceAll("{{horario}}", horarioFormatado || "")
    .replaceAll("{{hora}}", horarioFormatado || "")
    .replaceAll("{{local_evento}}", evento.local || "")
    .replaceAll("{{LOCAL_EVENTO}}", evento.local || "")
    .replaceAll("{{endereco_evento}}", evento.endereco || "")
    .replaceAll("{{total_convidados}}", String(total))
    .replaceAll("{{convidados_quantidade}}", String(total))
    .replaceAll("{{texto_total_convidados}}", textoTotal)
    .replaceAll("{{link_rsvp}}", "Confirmar presença")
    .replaceAll("{{google_maps_url}}", "Ver localização")
    .replaceAll("{{waze_url}}", "Abrir no Waze")
    .replaceAll("{{calendario_url}}", "Adicionar ao calendário")
    .replaceAll("{{qr_code}}", "QR")
    .replaceAll("{{logo_evento}}", "");
}

function getEventoPreview(evento: Evento, nomes: string[]) {
  const nomePrincipal = nomes[0] || "Convidado";
  const dataFormatada = formatarData(evento.data_evento || null);
  const horaFormatada = formatarHorario(evento.horario);

  return {
    nome_evento: evento.nome || "Evento",
    nome_convidado: nomePrincipal,
    data_evento: dataFormatada || "",
    hora_evento: horaFormatada || "",
    horario_evento: horaFormatada || "",
    horario: horaFormatada || "",
    hora: horaFormatada || "",
    local_evento: evento.local || "",
    endereco_evento: evento.endereco || "",
    total_convidados: String(nomes.length || 1),
  };
}

function renderGuestPicker(block: VisualBlock, nomes: string[]) {
  const nomesLimpos = nomes.length ? nomes : ["Convidado"];
  const isGrupo = nomesLimpos.length > 1;

  if (!isGrupo) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 10px",
          boxSizing: "border-box",
          color: block.color || "#ffffff",
          fontFamily: block.font_family || "Inter",
          fontSize: block.font_size,
          fontWeight: 900,
          lineHeight: 1.05,
          textAlign: "center",
        }}
      >
        <span>{nomesLimpos[0]}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: 6,
        padding: "8px 10px",
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {nomesLimpos.map((nome) => (
        <label
          key={nome}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: block.color || "#ffffff",
            fontFamily: block.font_family || "Inter",
            fontSize: block.font_size,
            fontWeight: 900,
            lineHeight: 1.05,
            minHeight: 26,
          }}
        >
          <input
            type="checkbox"
            defaultChecked
            name="guest-confirmation"
            style={{
              width: 17,
              height: 17,
              accentColor: "#f7d477",
              flexShrink: 0,
            }}
          />
          <span>{nome}</span>
        </label>
      ))}
    </div>
  );
}

function renderBotaoVisual(block: VisualBlock, evento: Evento, nomes: string[]) {
  const acao = detectarAcaoBotao(block.content);
  const label = aplicarVariaveisPublicas(block.content || "", evento, nomes).trim();

  const fallbackLabel =
    acao === "maps"
      ? "Ver localização"
      : acao === "waze"
        ? "Abrir no Waze"
        : acao === "calendar"
          ? "Adicionar ao calendário"
          : "Confirmar presença";

  const href =
    acao === "waze"
      ? criarWazeUrl(evento)
      : acao === "maps"
        ? criarMapsUrl(evento)
        : acao === "calendar"
          ? criarCalendarUrl(evento)
          : acao === "rsvp"
            ? "#confirmar-presenca"
            : "";

  const finalLabel = label || fallbackLabel;

  if (href) {
    return (
      <a
        href={href}
        target={acao === "rsvp" ? "_self" : "_blank"}
        rel="noopener noreferrer"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          textDecoration: "none",
          color: "inherit",
          font: "inherit",
          fontWeight: "inherit",
          borderRadius: "inherit",
        }}
      >
        {finalLabel}
      </a>
    );
  }

  return <span>{finalLabel}</span>;
}

function getChildrenForVisualBlock(evento: Evento, nomes: string[]) {
  return (block: any): ReactNode | null => {
    if (block.type === "guest_picker") {
      return renderGuestPicker(block, nomes);
    }

    if (block.type === "guest_name") {
      return nomes.length > 1 ? <span /> : <span>{nomes[0] || "Convidado"}</span>;
    }

    if (block.type === "button") {
      return renderBotaoVisual(block, evento, nomes);
    }

    return null;
  };
}


function useViewportScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const width = window.innerWidth || CANVAS_W;
      setScale(Math.min(1, width / CANVAS_W));
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return scale;
}

export default function ConvitePublicoPage() {
  const params = useParams();
  const token = String(params.token || "");
  const visualScale = useViewportScale();

  const [renderState, setRenderState] = useState<RenderState | null>(null);
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
      .map((item) =>
        String(item || "")
          .trim()
          .replace(/\s/g, ""),
      )
      .filter(Boolean);

    if (!tokens.length) {
      setRenderState({ kind: "html", html: htmlErro("Convite inválido.") });
      setLoading(false);
      return;
    }

    const { data: convidadosPorToken, error: convidadosError } = await supabase
      .from("convidados")
      .select(
        `
        id,
        nome,
        token,
        evento_id,
        grupo,
        tipo_convite
      `,
      )
      .in("token", tokens)
      .order("nome", { ascending: true });

    if (convidadosError || !convidadosPorToken?.length) {
      console.error("Erro ao buscar convidados:", convidadosError);
      setRenderState({ kind: "html", html: htmlErro("Convite não encontrado.") });
      setLoading(false);
      return;
    }

    const convidadosOrdenados = tokens
      .map((tokenItem) =>
        convidadosPorToken.find((convidado) => convidado.token === tokenItem),
      )
      .filter(Boolean) as Convidado[];

    const convidadoBase =
      convidadosOrdenados[0] || (convidadosPorToken[0] as Convidado);

    let convidadosDoConvite: Convidado[] = convidadosOrdenados.length
      ? convidadosOrdenados
      : (convidadosPorToken as Convidado[]);

    if (tokens.length === 1 && convidadoBase?.grupo) {
      const grupoBase = String(convidadoBase.grupo || "").trim();

      const { data: convidadosGrupo, error: grupoError } = await supabase
        .from("convidados")
        .select(
          `
          id,
          nome,
          token,
          evento_id,
          grupo,
          tipo_convite
        `,
        )
        .eq("evento_id", convidadoBase.evento_id)
        .eq("grupo", grupoBase)
        .order("nome", { ascending: true });

      if (grupoError) {
        console.error("Erro ao buscar grupo:", grupoError);
      }

      if (convidadosGrupo?.length) {
        convidadosDoConvite = convidadosGrupo as Convidado[];
      }
    }

    if (!convidadoBase?.evento_id) {
      setRenderState({ kind: "html", html: htmlErro("Convite inválido.") });
      setLoading(false);
      return;
    }

    const { data: evento, error: eventoError } = await supabase
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

    if (eventoError || !evento) {
      console.error("Erro ao buscar evento do convite:", {
        evento_id: convidadoBase.evento_id,
        erro: eventoError,
      });

      setRenderState({ kind: "html", html: htmlErro("Evento do convite não encontrado.") });
      setLoading(false);
      return;
    }

    let templateId = evento?.invite_template_id || null;

    /*
      Compatibilidade:
      - Alguns eventos salvam o modelo direto em eventos.invite_template_id.
      - Outros ficam vinculados pela tabela event_invite_templates.
      - No restante do app esta tabela usa a coluna evento_id.
    */
    if (!templateId && evento.id) {
      const { data: vinculosPorEventoId, error: vinculoEventoIdError } = await supabase
        .from("event_invite_templates")
        .select("template_id")
        .eq("evento_id", evento.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (vinculoEventoIdError) {
        console.error("Erro ao buscar vínculo por evento_id:", vinculoEventoIdError);
      }

      const primeiroVinculo = vinculosPorEventoId?.[0];

      if (primeiroVinculo?.template_id) {
        templateId = primeiroVinculo.template_id;
      }
    }

    if (!templateId) {
      console.error("Evento sem modelo aplicado:", {
        evento_id: evento?.id,
        invite_template_id: evento?.invite_template_id,
      });

      setRenderState({
        kind: "html",
        html: htmlErro(`Evento sem convite aplicado. Evento: ${evento.id}`),
      });
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
      .eq("id", templateId)
      .maybeSingle();

    if (!template) {
      setRenderState({ kind: "html", html: htmlErro("Modelo de convite não encontrado.") });
      setLoading(false);
      return;
    }

    const nomesDoConvite = convidadosDoConvite
      .map((item) => item.nome)
      .filter(Boolean);

    const nomesFinais = nomesDoConvite.length
      ? nomesDoConvite
      : [convidadoBase.nome || "Convidado"];

    const isVisual = template.editor_mode === "visual";

    if (isVisual) {
      const { data: blocksData, error: blocksError } = await supabase
        .from("invite_template_blocks")
        .select("*")
        .eq("template_id", template.id)
        .order("z_index", { ascending: true });

      if (blocksError) {
        setRenderState({ kind: "html", html: htmlErro("Erro ao carregar blocos do convite.") });
        setLoading(false);
        return;
      }

      setRenderState({
        kind: "visual",
        evento: evento as Evento,
        template: template as Template,
        blocks: (blocksData || []).map(normalizarBlock),
        nomes: nomesFinais,
      });
      setLoading(false);
      return;
    }

    if (template.html_template?.trim()) {
      let htmlDoEvento = preencherTemplate(
        template.html_template,
        evento as Evento,
      );

      htmlDoEvento = injetarConvidadosNoConvite(
        htmlDoEvento,
        nomesFinais,
      );

      setRenderState({ kind: "html", html: htmlDoEvento });
      setLoading(false);
      return;
    }

    setRenderState({ kind: "html", html: htmlErro("Modelo de convite não encontrado.") });
    setLoading(false);
  }

  const visualConfig = renderState?.kind === "visual" ? getVisualConfig(renderState.template) : {};

  const visualContent = useMemo(() => {
    if (renderState?.kind !== "visual") return null;

    return (
      <ConviteVisualRenderer
        blocks={renderState.blocks}
        backgroundUrl={getBackgroundUrl(renderState.template, renderState.evento)}
        logoUrl={getLogoUrl(renderState.template, renderState.evento)}
        width={CANVAS_W}
        height={CANVAS_H}
        scale={visualScale}
        backgroundX={toNumber(visualConfig.backgroundX, 0)}
        backgroundY={toNumber(visualConfig.backgroundY, 0)}
        backgroundScale={toNumber(visualConfig.backgroundScale, 1)}
        backgroundOpacity={toNumber(visualConfig.backgroundOpacity, 1)}
        glassOpacity={toNumber(visualConfig.glassOpacity, 0.18)}
        glassBlur={toNumber(visualConfig.glassBlur, 0)}
        glassTone={visualConfig.glassTone === "light" ? "light" : "dark"}
        blockEffects={visualConfig.blockEffects || {}}
        evento={getEventoPreview(renderState.evento, renderState.nomes)}
        childrenForBlock={getChildrenForVisualBlock(renderState.evento, renderState.nomes)}
      />
    );
  }, [renderState, visualConfig, visualScale]);

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

  if (renderState?.kind === "visual") {
    return (
      <main style={visualPageStyle}>
        <div style={{ ...visualShellStyle, width: CANVAS_W * visualScale, minHeight: CANVAS_H * visualScale }}>{visualContent}</div>
      </main>
    );
  }

  return (
    <iframe
      title="Convite digital"
      srcDoc={renderState?.kind === "html" ? renderState.html : htmlErro("Convite não encontrado.")}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        background: "#020617",
      }}
    />
  );
}

const visualPageStyle: CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  margin: 0,
  background: "#020617",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  overflowX: "hidden",
  overflowY: "auto",
};

const visualShellStyle: CSSProperties = {
  width: CANVAS_W,
  minHeight: CANVAS_H,
  maxWidth: "100%",
  overflow: "hidden",
  background: "#020617",
};

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
