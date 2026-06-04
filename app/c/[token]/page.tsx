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
import EffectRenderer from "@/components/confirmation-effects/EffectRenderer";
import { playConfirmationSound, unlockSilentConfirmationAudio } from "@/components/confirmation-effects/sounds";

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
  data_inicio?: string | null;
  hora_inicio?: string | null;
  data_termino?: string | null;
  hora_termino?: string | null;
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

type ConfirmationEffect =
  | "padrao"
  | "futebol"
  | "copa2026"
  | "princesa"
  | "luxo"
  | "infantil"
  | "nenhum";

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
      convidadoIds: string[];
    };

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getHoraEvento(evento: Evento | null) {
  return evento?.hora_inicio || evento?.horario || null;
}

function getHoraTerminoEvento(evento: Evento | null) {
  return evento?.hora_termino || null;
}

function criarDataTerminoEvento(evento: Evento | null) {
  const dataInicio = criarDataEvento(evento);
  if (!evento || !dataInicio) return null;

  const horaTermino = getHoraTerminoEvento(evento);

  if (horaTermino) {
    const dataFim = evento.data_termino || evento.data_evento;
    const horarioFim = String(horaTermino || "").trim();
    const horarioNormalizado = horarioFim.match(/^(\d{1,2})(?::|h)?(\d{2})?/i);

    if (dataFim && horarioNormalizado) {
      const horas = horarioNormalizado[1].padStart(2, "0");
      const minutos = (horarioNormalizado[2] || "00").padStart(2, "0");
      const date = new Date(`${dataFim}T${horas}:${minutos}:00`);

      if (!Number.isNaN(date.getTime())) {
        const dataTerminoInformada = Boolean(evento.data_termino);

        if (!dataTerminoInformada && date.getTime() <= dataInicio.getTime()) {
          date.setDate(date.getDate() + 1);
        }

        return date;
      }
    }
  }

  return new Date(dataInicio.getTime() + 4 * 60 * 60 * 1000);
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

function normalizarEfeitoConfirmacao(value: unknown): ConfirmationEffect {
  const efeito = String(value || "padrao").trim().toLowerCase();

  if (efeito === "copa") {
    return "futebol";
  }

  if (
    efeito === "futebol" ||
    efeito === "copa2026" ||
    efeito === "princesa" ||
    efeito === "luxo" ||
    efeito === "infantil" ||
    efeito === "nenhum"
  ) {
    return efeito;
  }

  return "padrao";
}

function getConfirmationEffect(template: Template | null): ConfirmationEffect {
  const visualConfig = getVisualConfig(template);

  return normalizarEfeitoConfirmacao(
    visualConfig.confirmationEffect ||
      visualConfig.efeitoConfirmacao ||
      visualConfig.confirmation_effect,
  );
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

  const end = criarDataTerminoEvento(evento) || new Date(dataEvento.getTime() + 4 * 60 * 60 * 1000);

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

function tocarSomConfirmacao(effect: ConfirmationEffect = "padrao") {
  if (typeof window === "undefined" || effect === "nenhum") return;

  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();

  function tocarNota(
    frequency: number,
    start: number,
    duration: number,
    volume = 0.16,
    type: OscillatorType = "sine",
  ) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      audioContext.currentTime + start + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + start + duration,
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + start);
    oscillator.stop(audioContext.currentTime + start + duration + 0.03);
  }

  if (effect === "futebol") {
    tocarNota(1320, 0, 0.1, 0.09, "sine");
    tocarNota(1760, 0.08, 0.16, 0.08, "sine");
    tocarNota(523, 0.26, 0.13, 0.15, "square");
    tocarNota(659, 0.38, 0.13, 0.14, "square");
    tocarNota(784, 0.5, 0.24, 0.18, "triangle");
    tocarNota(1046, 0.74, 0.2, 0.1, "sine");
    return;
  }

  if (effect === "princesa") {
    tocarNota(880, 0, 0.16, 0.11, "sine");
    tocarNota(1175, 0.13, 0.18, 0.1, "sine");
    tocarNota(1568, 0.28, 0.28, 0.09, "triangle");
    return;
  }

  if (effect === "luxo") {
    tocarNota(392, 0, 0.2, 0.12, "triangle");
    tocarNota(523, 0.18, 0.22, 0.11, "triangle");
    tocarNota(784, 0.4, 0.28, 0.1, "sine");
    return;
  }

  if (effect === "infantil") {
    tocarNota(660, 0, 0.11, 0.14, "sine");
    tocarNota(880, 0.11, 0.11, 0.14, "sine");
    tocarNota(990, 0.22, 0.12, 0.14, "sine");
    tocarNota(1320, 0.35, 0.2, 0.12, "triangle");
    return;
  }

  tocarNota(660, 0, 0.32, 0.18, "sine");
  tocarNota(990, 0.12, 0.2, 0.12, "sine");
}

function tentarLiberarSomSilencioso() {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1, audioContext.currentTime);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.04);
}

function aplicarVariaveisPublicas(content: string | null, evento: Evento, nomes: string[]) {
  const nomePrincipal = nomes[0] || "Convidado";
  const total = nomes.length || 1;
  const dataFormatada = formatarData(evento.data_evento || null);
  const horarioFormatado = formatarHorario(getHoraEvento(evento));
  const horarioTerminoFormatado = getHoraTerminoEvento(evento)
    ? formatarHorario(getHoraTerminoEvento(evento))
    : "";
  const dataTerminoFormatada = evento.data_termino
    ? formatarData(evento.data_termino)
    : "";
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
    .replaceAll("{{hora_termino}}", horarioTerminoFormatado || "")
    .replaceAll("{{horario_termino}}", horarioTerminoFormatado || "")
    .replaceAll("{{hora_termino_evento}}", horarioTerminoFormatado || "")
    .replaceAll("{{horario_termino_evento}}", horarioTerminoFormatado || "")
    .replaceAll("{{data_termino}}", dataTerminoFormatada || "")
    .replaceAll("{{data_termino_evento}}", dataTerminoFormatada || "")
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
  const dataTerminoFormatada = evento.data_termino
    ? formatarData(evento.data_termino)
    : "";
  const horaFormatada = formatarHorario(getHoraEvento(evento));
  const horaTerminoFormatada = getHoraTerminoEvento(evento)
    ? formatarHorario(getHoraTerminoEvento(evento))
    : "";

  return {
    nome_evento: evento.nome || "Evento",
    nome_convidado: nomePrincipal,
    data_evento: dataFormatada || "",
    hora_evento: horaFormatada || "",
    horario_evento: horaFormatada || "",
    horario: horaFormatada || "",
    hora: horaFormatada || "",
    hora_termino: horaTerminoFormatada || "",
    horario_termino: horaTerminoFormatada || "",
    hora_termino_evento: horaTerminoFormatada || "",
    horario_termino_evento: horaTerminoFormatada || "",
    data_termino: dataTerminoFormatada || "",
    data_termino_evento: dataTerminoFormatada || "",
    local_evento: evento.local || "",
    endereco_evento: evento.endereco || "",
    total_convidados: String(Math.max(1, nomes.length || 1)),
    convidados_quantidade: String(Math.max(1, nomes.length || 1)),
    texto_total_convidados:
      Math.max(1, nomes.length || 1) === 1
        ? "Convite para 1 convidado"
        : `Convite para ${Math.max(1, nomes.length || 1)} convidados`,
  };
}

function ajustarBlocosParaConvidados(
  blocks: VisualBlock[],
  nomes: string[],
): VisualBlock[] {
  const total = Math.max(1, nomes.length || 1);

  return blocks.map((block) => {
    if (block.type !== "guest_picker") return block;

    const itemHeight = Math.max(28, Math.round((block.font_size || 18) * 1.65));
    const paddingVertical = 22;
    const gapTotal = Math.max(0, total - 1) * 6;
    const alturaNecessaria = paddingVertical + total * itemHeight + gapTotal;

    return {
      ...block,
      height: Math.max(block.height || 0, alturaNecessaria),
    };
  });
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
        overflowY: "visible",
        overflowX: "visible",
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

function renderBotaoVisual(
  block: VisualBlock,
  evento: Evento,
  nomes: string[],
  onConfirmarPresenca?: () => void,
  onAcaoBotao?: () => void,
) {
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
        onClick={(event) => {
          onAcaoBotao?.();

          if (acao === "rsvp") {
            event.preventDefault();
            onConfirmarPresenca?.();
          }
        }}
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

function getChildrenForVisualBlock(
  evento: Evento,
  nomes: string[],
  onConfirmarPresenca?: () => void,
  onAcaoBotao?: () => void,
) {
  return (block: any): ReactNode | null => {
    if (block.type === "guest_picker") {
      return renderGuestPicker(block, nomes);
    }

    if (block.type === "guest_name") {
      return nomes.length > 1 ? <span /> : <span>{nomes[0] || "Convidado"}</span>;
    }

    if (block.type === "button") {
      return renderBotaoVisual(
        block,
        evento,
        nomes,
        onConfirmarPresenca,
        onAcaoBotao,
      );
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
  const [somAtivo, setSomAtivo] = useState(true);
  const [somLiberado, setSomLiberado] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [efeitoConfirmacaoAtivo, setEfeitoConfirmacaoAtivo] =
    useState<ConfirmationEffect>("padrao");
  const [confirmandoPresenca, setConfirmandoPresenca] = useState(false);

  useEffect(() => {
    if (token) carregarConvite(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!somAtivo || somLiberado) return;

    function liberarSom() {
      if (!somAtivo || somLiberado) return;

      try {
        unlockSilentConfirmationAudio();
        setSomLiberado(true);
      } catch {
        // O navegador pode manter o áudio bloqueado até uma interação mais explícita.
      }
    }

    window.addEventListener("pointerdown", liberarSom, { passive: true });
    window.addEventListener("touchstart", liberarSom, { passive: true });
    window.addEventListener("keydown", liberarSom);
    window.addEventListener("scroll", liberarSom, { passive: true });
    window.addEventListener("mousemove", liberarSom, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", liberarSom);
      window.removeEventListener("touchstart", liberarSom);
      window.removeEventListener("keydown", liberarSom);
      window.removeEventListener("scroll", liberarSom);
      window.removeEventListener("mousemove", liberarSom);
    };
  }, [somAtivo, somLiberado]);

  function executarSomAcao(effect: ConfirmationEffect = "padrao") {
    if (!somAtivo || effect === "nenhum") return;

    playConfirmationSound(effect)
      .then(() => setSomLiberado(true))
      .catch(() => {
        // Sem bloqueio visual caso o navegador não libere o áudio.
      });
  }

  async function confirmarPresenca() {
    if (renderState?.kind !== "visual" || confirmandoPresenca) return;

    const efeitoConfirmacao = getConfirmationEffect(renderState.template);

    executarSomAcao(efeitoConfirmacao);
    setEfeitoConfirmacaoAtivo(efeitoConfirmacao);
    setConfirmacaoAberta(efeitoConfirmacao !== "nenhum");
    setConfirmandoPresenca(true);

    if (typeof navigator !== "undefined" && efeitoConfirmacao !== "nenhum") {
      navigator.vibrate?.(
        (efeitoConfirmacao === "futebol" || efeitoConfirmacao === "copa2026")
          ? [90, 35, 90, 35, 180]
          : [80, 40, 120],
      );
    }

    const ids = renderState.convidadoIds.filter(Boolean);

    if (ids.length) {
      const { error } = await supabase
        .from("convidados")
        .update({
          status_rsvp: "confirmado",
          data_resposta: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) {
        console.error("Erro ao confirmar presença:", error);
      }
    }

    setConfirmandoPresenca(false);

    window.setTimeout(() => {
      setConfirmacaoAberta(false);
    }, 3200);
  }

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

    const conviteEhNucleo = ["grupo", "nucleo"].includes(
      String(convidadoBase?.tipo_convite || "").trim().toLowerCase(),
    );

    if (tokens.length === 1 && convidadoBase?.grupo && conviteEhNucleo) {
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
        data_inicio,
        hora_inicio,
        data_termino,
        hora_termino,
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

    const eventoNormalizado = {
      ...(evento as Evento),
      horario: getHoraEvento(evento as Evento),
    } as Evento;

    let templateId = eventoNormalizado?.invite_template_id || null;

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
        evento: eventoNormalizado,
        template: template as Template,
        blocks: (blocksData || []).map(normalizarBlock),
        nomes: nomesFinais,
        convidadoIds: convidadosDoConvite.map((item) => item.id).filter(Boolean),
      });
      setLoading(false);
      return;
    }

    if (template.html_template?.trim()) {
      let htmlDoEvento = preencherTemplate(
        template.html_template,
        eventoNormalizado,
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
  const confirmationEffect =
    renderState?.kind === "visual"
      ? getConfirmationEffect(renderState.template)
      : "padrao";

  const visualContent = useMemo(() => {
    if (renderState?.kind !== "visual") return null;

    return (
      <ConviteVisualRenderer
        blocks={ajustarBlocosParaConvidados(renderState.blocks, renderState.nomes)}
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
        childrenForBlock={getChildrenForVisualBlock(
          renderState.evento,
          renderState.nomes,
          confirmarPresenca,
          executarSomAcao,
        )}
        enableConfirmationEffects
        showSoundToggle={false}
        onConfirmPresence={confirmarPresenca}
      />
    );
  }, [renderState, visualConfig, visualScale, confirmandoPresenca, somAtivo, somLiberado]);

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
        <style jsx global>{`
          @keyframes omniConfirmPop {
            0% {
              opacity: 0;
              transform: translateY(16px) scale(.92);
              filter: brightness(.88);
            }
            62% {
              opacity: 1;
              transform: translateY(-3px) scale(1.025);
              filter: brightness(1.08);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: brightness(1);
            }
          }

          @keyframes omniFutebolCardShine {
            0%, 100% {
              box-shadow:
                0 26px 92px rgba(0,0,0,.34),
                0 0 0 1px rgba(255,255,255,.56),
                0 0 28px rgba(255,255,255,.18),
                inset 0 1px 0 rgba(255,255,255,.56);
            }
            50% {
              box-shadow:
                0 30px 110px rgba(0,0,0,.42),
                0 0 0 2px rgba(255,255,255,.9),
                0 0 44px rgba(254,221,0,.72),
                0 0 92px rgba(0,156,59,.36),
                inset 0 1px 0 rgba(255,255,255,.78);
            }
          }

          @keyframes omniFutebolBall {
            0% { transform: rotate(-28deg) scale(.76); opacity: 0; }
            36% { transform: rotate(18deg) scale(1.15); opacity: 1; }
            68% { transform: rotate(370deg) scale(1.03); opacity: 1; }
            100% { transform: rotate(360deg) scale(1); opacity: 1; }
          }

          @keyframes omniFutebolBallGlow {
            0%, 100% { transform: scale(.92); opacity: .62; }
            50% { transform: scale(1.18); opacity: 1; }
          }

          @keyframes omniFutebolTitlePop {
            0% { transform: scale(.72); opacity: 0; letter-spacing: -.08em; }
            58% { transform: scale(1.12); opacity: 1; letter-spacing: -.035em; }
            100% { transform: scale(1); opacity: 1; letter-spacing: -.04em; }
          }

          @keyframes omniConfettiFall {
            0% { transform: translate3d(0, -90px, 0) rotate(0deg); opacity: 0; }
            14% { opacity: 1; }
            100% { transform: translate3d(var(--x), 78vh, 0) rotate(680deg); opacity: 0; }
          }

          @keyframes omniSparklePulse {
            0%, 100% { transform: scale(.7); opacity: .48; }
            50% { transform: scale(1.18); opacity: 1; }
          }

          @keyframes omniFutebolGlowPulse {
            0%, 100% { opacity: .72; transform: scale(.96); }
            50% { opacity: 1; transform: scale(1.08); }
          }

          @keyframes omniFutebolFlagWave {
            0%, 100% { transform: rotate(-8deg) translateY(0); }
            50% { transform: rotate(7deg) translateY(-4px); }
          }

          @keyframes omniFutebolCrowdJump {
            0%, 100% { transform: translateY(0); opacity: .82; }
            50% { transform: translateY(-5px); opacity: 1; }
          }

          @keyframes omniFutebolTitleShine {
            0% { background-position: 0% 50%; }
            100% { background-position: 220% 50%; }
          }
        `}</style>

        <button
          type="button"
          onClick={() => {
            setSomAtivo((current) => {
              const next = !current;

              if (next) {
                window.setTimeout(() => {
                  try {
                    tocarSomConfirmacao(
                      renderState?.kind === "visual"
                        ? getConfirmationEffect(renderState.template)
                        : "padrao",
                    );
                    setSomLiberado(true);
                  } catch {
                    // Pode depender da próxima interação do usuário.
                  }
                }, 0);
              }

              return next;
            });
          }}
          style={soundToggleStyle}
        >
          {somAtivo ? "🔊 Som ligado" : "🔇 Som desligado"}
        </button>

        <div
          style={{
            ...visualShellStyle,
            width: CANVAS_W * visualScale,
            minHeight: CANVAS_H * visualScale,
          }}
        >
          {visualContent}

          <EffectRenderer
            open={confirmacaoAberta}
            effect={efeitoConfirmacaoAtivo}
            confirming={confirmandoPresenca}
            soundEnabled={false}
            contained
          />
        </div>
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

function getConfirmationIcon(effect: ConfirmationEffect) {
  if (effect === "futebol" || effect === "copa2026") return "⚽";
  if (effect === "princesa") return "👑";
  if (effect === "luxo") return "✨";
  if (effect === "infantil") return "🎉";

  return "✓";
}

function getConfirmationTitle(effect: ConfirmationEffect) {
  if (effect === "futebol" || effect === "copa2026") return "GOOOOOOL!";
  if (effect === "princesa") return "Presença confirmada!";
  if (effect === "luxo") return "Confirmação registrada";
  if (effect === "infantil") return "Oba, presença confirmada!";

  return "Presença confirmada";
}

function getConfirmationText(effect: ConfirmationEffect) {
  if (effect === "futebol") {
    return "Sua presença está confirmada. Você foi convocado para essa festa!";
  }

  if (effect === "copa2026") {
    return "Sua presença está confirmada para essa festa campeã.";
  }

  if (effect === "princesa") {
    return "Sua presença foi confirmada com brilho especial.";
  }

  if (effect === "luxo") {
    return "Sua confirmação foi registrada com sucesso.";
  }

  if (effect === "infantil") {
    return "Agora é só esperar a diversão começar.";
  }

  return "Sua confirmação foi registrada no convite.";
}

function getConfirmationOverlayTheme(effect: ConfirmationEffect): CSSProperties {
  if (effect === "futebol") {
    return {
      background:
        "radial-gradient(circle at 50% 38%, rgba(254,221,0,.18), transparent 30%), radial-gradient(circle at 24% 22%, rgba(0,156,59,.2), transparent 32%), radial-gradient(circle at 78% 72%, rgba(0,39,118,.2), transparent 34%), rgba(2,6,23,.24)",
      backdropFilter: "blur(.8px)",
      WebkitBackdropFilter: "blur(.8px)",
    };
  }

  if (effect === "princesa") {
    return {
      background:
        "radial-gradient(circle at center, rgba(251,191,36,.28), transparent 42%), linear-gradient(135deg, rgba(190,24,93,.22), rgba(88,28,135,.22))",
    };
  }

  if (effect === "luxo") {
    return {
      background:
        "radial-gradient(circle at center, rgba(212,175,55,.24), transparent 42%), linear-gradient(135deg, rgba(2,6,23,.42), rgba(120,113,108,.18))",
    };
  }

  if (effect === "infantil") {
    return {
      background:
        "radial-gradient(circle at center, rgba(251,146,60,.28), transparent 42%), linear-gradient(135deg, rgba(14,165,233,.22), rgba(236,72,153,.22))",
    };
  }

  return {};
}

function getConfirmationCardTheme(effect: ConfirmationEffect): CSSProperties {
  if (effect === "futebol") {
    return {
      width: "min(360px, calc(100% - 34px))",
      minHeight: 224,
      padding: "68px 18px 22px",
      overflow: "visible",
      position: "relative",
      background: "rgba(255,255,255,.14)",
      backdropFilter: "blur(18px) saturate(1.55)",
      WebkitBackdropFilter: "blur(18px) saturate(1.55)",
      border: "2px solid rgba(255,255,255,.72)",
      boxShadow:
        "0 26px 92px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.56), 0 0 28px rgba(255,255,255,.18), inset 0 1px 0 rgba(255,255,255,.56)",
      animation:
        "omniConfirmPop .36s cubic-bezier(.2,.9,.2,1), omniFutebolCardShine 1.05s ease-in-out .12s 3",
    };
  }

  if (effect === "princesa") {
    return {
      background:
        "linear-gradient(135deg, rgba(190,24,93,.94), rgba(251,191,36,.9))",
      boxShadow:
        "0 24px 90px rgba(190,24,93,.34), 0 0 0 8px rgba(251,191,36,.12)",
    };
  }

  if (effect === "luxo") {
    return {
      background:
        "linear-gradient(135deg, rgba(15,23,42,.96), rgba(180,142,58,.92))",
      boxShadow:
        "0 24px 90px rgba(2,6,23,.46), 0 0 0 8px rgba(212,175,55,.12)",
    };
  }

  if (effect === "infantil") {
    return {
      background:
        "linear-gradient(135deg, rgba(14,165,233,.94), rgba(236,72,153,.9), rgba(251,146,60,.92))",
      boxShadow:
        "0 24px 90px rgba(14,165,233,.3), 0 0 0 8px rgba(255,255,255,.1)",
    };
  }

  return {};
}

function getConfirmationIconTheme(effect: ConfirmationEffect): CSSProperties {
  if (effect === "futebol") {
    return {
      width: 82,
      height: 82,
      fontSize: 48,
      color: "#0f172a",
      background:
        "radial-gradient(circle at 34% 28%, #ffffff, #f8fafc 42%, #d1d5db 100%)",
      position: "absolute",
      top: -44,
      right: 24,
      zIndex: 4,
      border: "5px solid rgba(255,255,255,.96)",
      outline: "5px solid rgba(0,39,118,.8)",
      boxShadow:
        "0 0 0 10px rgba(254,221,0,.24), 0 0 38px rgba(254,221,0,.92), 0 18px 42px rgba(0,0,0,.32)",
      animation:
        "omniFutebolBall .86s cubic-bezier(.2,.9,.2,1), omniFutebolBallGlow 1s ease-in-out .2s 3",
    };
  }

  if (effect === "princesa") {
    return { color: "#be185d" };
  }

  if (effect === "luxo") {
    return { color: "#92400e" };
  }

  if (effect === "infantil") {
    return { color: "#ec4899" };
  }

  return {};
}

function getConfirmationTitleTheme(effect: ConfirmationEffect): CSSProperties {
  if (effect === "futebol") {
    return {
      position: "relative",
      zIndex: 3,
      fontSize: "clamp(38px, 13vw, 52px)",
      letterSpacing: "-.04em",
      color: "#ffffff",
      textTransform: "uppercase",
      textShadow:
        "0 3px 0 rgba(0,39,118,.72), 0 8px 20px rgba(0,0,0,.44), 0 0 22px rgba(255,255,255,.55)",
      WebkitTextStroke: "1px rgba(2,6,23,.38)",
      animation: "omniFutebolTitlePop .52s cubic-bezier(.2,.9,.2,1) both",
    };
  }

  return {};
}

function getConfirmationTextTheme(effect: ConfirmationEffect): CSSProperties {
  if (effect === "futebol") {
    return {
      position: "relative",
      zIndex: 3,
      maxWidth: 310,
      padding: "0 8px",
      color: "#ffffff",
      fontSize: "clamp(17px, 5vw, 20px)",
      lineHeight: 1.2,
      fontWeight: 950,
      textShadow: "0 3px 12px rgba(0,0,0,.56), 0 0 16px rgba(255,255,255,.28)",
    };
  }

  return {};
}

function renderFutebolBrazilCardBackdrop(effect: ConfirmationEffect) {
  if (effect !== "futebol") return null;

  return <div style={futebolBrazilGlowStyle} />;
}

function renderConfirmationParticles(effect: ConfirmationEffect) {
  if (effect === "nenhum") return null;

  const colors =
    effect === "futebol"
      ? ["#009c3b", "#ffdf00", "#002776", "#ffffff"]
      : effect === "princesa"
        ? ["#f9a8d4", "#fbbf24", "#ffffff", "#c084fc"]
        : effect === "luxo"
          ? ["#d4af37", "#ffffff", "#0f172a", "#a16207"]
          : effect === "infantil"
            ? ["#38bdf8", "#fb7185", "#facc15", "#ffffff"]
            : ["#7c3aed", "#14b8a6", "#ffffff", "#f8fafc"];

  return (
    <div style={particlesLayerStyle} aria-hidden="true">
      {Array.from({ length: effect === "futebol" ? 56 : effect === "padrao" ? 18 : 30 }).map((_, index) => {
        const left = (index * 37) % 100;
        const delay = (index % 10) * 0.055;
        const x = ((index % 9) - 4) * (effect === "futebol" ? 34 : 28);
        const size = effect === "futebol" ? 8 + (index % 5) * 4 : 7 + (index % 4) * 3;
        const color = colors[index % colors.length];

        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: -24,
              width: size,
              height: effect === "futebol" && index % 5 === 0 ? size : Math.max(5, size - 2),
              borderRadius: effect === "futebol" && index % 5 === 0 ? 999 : 3,
              background: effect === "futebol" && index % 5 === 0 ? "#ffffff" : color,
              color,
              boxShadow:
                effect === "futebol" && index % 5 === 0
                  ? "inset 0 0 0 2px #111827"
                  : "0 6px 18px rgba(0,0,0,.16)",
              animation: `omniConfettiFall ${1.35 + (index % 5) * 0.12}s ease-in ${delay}s both`,
              ["--x" as any]: `${x}px`,
            }}
          />
        );
      })}

      {effect !== "padrao" &&
        Array.from({ length: 10 }).map((_, index) => (
          <span
            key={`sparkle-${index}`}
            style={{
              position: "absolute",
              left: `${8 + ((index * 19) % 84)}%`,
              top: `${12 + ((index * 23) % 70)}%`,
              color: colors[(index + 1) % colors.length],
              fontSize: 16 + (index % 3) * 6,
              animation: `omniSparklePulse ${0.9 + (index % 4) * 0.12}s ease-in-out ${index * 0.08}s infinite`,
            }}
          >
            {effect === "futebol" ? "★" : "✦"}
          </span>
        ))}
    </div>
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
  position: "relative",
};

const soundToggleStyle: CSSProperties = {
  position: "fixed",
  top: 14,
  right: 14,
  zIndex: 9999,
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 999,
  padding: "10px 14px",
  background: "rgba(2,6,23,.72)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 12px 34px rgba(0,0,0,.25)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  cursor: "pointer",
};


const particlesLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

const confirmationOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 80,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  overflow: "hidden",
  background:
    "radial-gradient(circle at center, rgba(124,58,237,.28), transparent 44%)",
};

const confirmationCardStyle: CSSProperties = {
  width: "min(340px, calc(100vw - 42px))",
  borderRadius: 28,
  padding: "26px 22px",
  display: "grid",
  justifyItems: "center",
  gap: 10,
  textAlign: "center",
  color: "#ffffff",
  background:
    "linear-gradient(135deg, rgba(124,58,237,.92), rgba(20,184,166,.88))",
  border: "1px solid rgba(255,255,255,.28)",
  boxShadow:
    "0 24px 90px rgba(124,58,237,.38), 0 0 0 8px rgba(255,255,255,.08)",
  animation: "omniConfirmPop .34s ease-out",
  position: "relative",
};

const confirmationIconStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,.96)",
  color: "#16a34a",
  fontSize: 34,
  fontWeight: 950,
  boxShadow: "0 12px 34px rgba(0,0,0,.2)",
};

const confirmationTitleStyle: CSSProperties = {
  fontSize: 24,
  lineHeight: 1.05,
  fontWeight: 950,
};

const confirmationTextStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 800,
  opacity: 0.92,
};

const futebolBrazilBrushStyle: CSSProperties = {
  position: "absolute",
  left: "-7%",
  right: "-7%",
  top: "26%",
  height: "44%",
  background:
    "linear-gradient(110deg, transparent 0%, rgba(0,156,59,.24) 8%, rgba(254,221,0,.86) 24%, rgba(254,221,0,.92) 42%, rgba(0,156,59,.72) 59%, rgba(0,39,118,.66) 78%, transparent 100%)",
  transform: "rotate(-4deg)",
  filter: "blur(.2px)",
  opacity: .96,
  pointerEvents: "none",
};

const futebolBrazilGlowStyle: CSSProperties = {
  position: "absolute",
  inset: -2,
  borderRadius: 28,
  background:
    "radial-gradient(circle at 78% 0%, rgba(254,221,0,.38), transparent 24%), radial-gradient(circle at 10% 90%, rgba(0,156,59,.26), transparent 30%), linear-gradient(120deg, transparent 0%, rgba(255,255,255,.20) 42%, rgba(255,255,255,.08) 52%, transparent 64%)",
  opacity: .94,
  filter: "blur(.2px)",
  animation: "omniFutebolGlowPulse 1.2s ease-in-out 3",
  pointerEvents: "none",
};

const futebolBrazilDiamondStyle: CSSProperties = {
  position: "absolute",
  top: 72,
  left: "50%",
  width: 230,
  height: 138,
  transform: "translateX(-50%) rotate(-4deg)",
  background:
    "linear-gradient(135deg, transparent 18%, rgba(254,221,0,.8) 18% 82%, transparent 82%), radial-gradient(circle at center, rgba(0,39,118,.9) 0 28%, transparent 29%)",
  opacity: .5,
  mixBlendMode: "screen",
  pointerEvents: "none",
};

const futebolCrowdStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 74,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-around",
  padding: "0 16px",
  background:
    "linear-gradient(180deg, transparent, rgba(0,38,25,.7) 54%, rgba(0,16,10,.94))",
  pointerEvents: "none",
};

const futebolFlagStyle: CSSProperties = {
  position: "absolute",
  bottom: -18,
  zIndex: 2,
  fontSize: 42,
  filter: "drop-shadow(0 8px 16px rgba(0,0,0,.34))",
  animation: "omniFutebolFlagWave .9s ease-in-out infinite",
  pointerEvents: "none",
};

const futebolStarsStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
  marginTop: 8,
  color: "#ffffff",
  fontSize: 31,
  lineHeight: 1,
  textShadow: "0 3px 12px rgba(0,0,0,.55), 0 0 18px rgba(254,221,0,.62)",
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
