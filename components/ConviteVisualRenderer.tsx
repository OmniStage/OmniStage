"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export type ConviteBlock = {
  id: string;
  type: string;
  content: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font_family: string;
  color: string;
  background: string | null;
  border_radius: number;
  z_index: number;
  visible: boolean;
  label?: string | null;
  template_id?: string;
};

type EventoPreview = {
  nome_evento?: string;
  nome_convidado?: string;
  data_evento?: string;
  hora_evento?: string;
  horario_evento?: string;
  horario?: string;
  hora?: string;
  local_evento?: string;
  endereco_evento?: string;
  total_convidados?: string | number;
};

type Props = {
  blocks: ConviteBlock[];
  backgroundUrl?: string;
  logoUrl?: string;
  width?: number;
  height?: number;
  scale?: number;
  backgroundX?: number;
  backgroundY?: number;
  backgroundScale?: number;
  backgroundOpacity?: number;
  glassOpacity?: number;
  glassBlur?: number;
  glassTone?: "light" | "dark";
  evento?: EventoPreview;
  showSelectionOutline?: boolean;
  selectedBlockId?: string | null;
  blockEffects?: Record<string, string>;
  childrenForBlock?: (block: ConviteBlock) => ReactNode | null;
  enableConfirmationEffects?: boolean;
  showSoundToggle?: boolean;
  onConfirmPresence?: () => void;
};

const DEFAULT_EVENTO: Required<EventoPreview> = {
  nome_evento: "Valentina XV",
  nome_convidado: "Ursula Tavares",
  data_evento: "16/05/2026",
  hora_evento: "21h",
  horario_evento: "21h",
  horario: "21h",
  hora: "21h",
  local_evento: "Guerrah Hall",
  endereco_evento: "Macaé/RJ",
  total_convidados: "4",
};

function normalizarDataISO(dataEvento: string) {
  const value = String(dataEvento || "").trim();

  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, dia, mes, ano] = brMatch;
    return `${ano}-${mes}-${dia}`;
  }

  return value.slice(0, 10);
}

function normalizarHorario(horarioEvento?: string | null) {
  const value = String(horarioEvento || "00:00")
    .trim()
    .toLowerCase()
    .replace("h", ":")
    .replace(/\s/g, "");

  if (/^\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{1}:\d{2}$/.test(value)) return `0${value}`;
  if (/^\d{2}$/.test(value)) return `${value}:00`;
  if (/^\d{1}$/.test(value)) return `0${value}:00`;

  return "00:00";
}

function getCountdownBrasil(dataEvento?: string | null, horarioEvento?: string | null) {
  const dataISO = normalizarDataISO(String(dataEvento || ""));
  const horario = normalizarHorario(horarioEvento);

  if (!dataISO) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  const target = new Date(`${dataISO}T${horario}:00-03:00`);
  const now = new Date();

  if (Number.isNaN(target.getTime())) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);

  return {
    dias: Math.floor(totalSeconds / 86400),
    horas: Math.floor((totalSeconds % 86400) / 3600),
    minutos: Math.floor((totalSeconds % 3600) / 60),
    segundos: totalSeconds % 60,
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function normalizarTextoHorario(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw || raw.toLowerCase() === "horário" || raw.toLowerCase() === "horario") {
    return "";
  }

  return raw;
}

function aplicarVariaveis(content: string | null, evento?: EventoPreview) {
  const e = { ...DEFAULT_EVENTO, ...(evento || {}) };

  const horaResolvida =
    normalizarTextoHorario(e.hora_evento) ||
    normalizarTextoHorario(e.horario_evento) ||
    normalizarTextoHorario(e.horario) ||
    normalizarTextoHorario(e.hora) ||
    DEFAULT_EVENTO.hora_evento;

  const countdown = getCountdownBrasil(e.data_evento, horaResolvida);
  const total = String(e.total_convidados || "4");
  const textoTotal = Number(total) === 1 ? "Convite para 1 convidado" : `Convite para ${total} convidados`;

  return String(content || "")
    .replaceAll("{{nome_evento}}", e.nome_evento)
    .replaceAll("{{EVENTO_NOME}}", e.nome_evento)
    .replaceAll("{{evento_nome}}", e.nome_evento)
    .replaceAll("{{nome_convidado}}", e.nome_convidado)
    .replaceAll("{{data_evento}}", e.data_evento)
    .replaceAll("{{DATA_EVENTO}}", e.data_evento)
    .replaceAll("{{hora_evento}}", horaResolvida)
    .replaceAll("{{horario_evento}}", horaResolvida)
    .replaceAll("{{horario}}", horaResolvida)
    .replaceAll("{{hora}}", horaResolvida)
    .replaceAll("{{local_evento}}", e.local_evento)
    .replaceAll("{{LOCAL_EVENTO}}", e.local_evento)
    .replaceAll("{{endereco_evento}}", e.endereco_evento)
    .replaceAll("{{dias_para_evento}}", String(countdown.dias))
    .replaceAll("{{contador_evento}}", `${pad2(countdown.dias)} ${pad2(countdown.horas)} ${pad2(countdown.minutos)} ${pad2(countdown.segundos)}`)
    .replaceAll("{{link_rsvp}}", "Confirmar presença")
    .replaceAll("{{google_maps_url}}", "Ver localização")
    .replaceAll("{{waze_url}}", "Abrir no Waze")
    .replaceAll("{{calendario_url}}", "Adicionar ao calendário")
    .replaceAll("{{total_convidados}}", total)
    .replaceAll("{{convidados_quantidade}}", total)
    .replaceAll("{{texto_total_convidados}}", textoTotal)
    .replaceAll("{{qr_code}}", "QR")
    .replaceAll("{{logo_evento}}", "");
}

function detectarAcaoBotao(content: string | null) {
  const texto = String(content || "").toLowerCase();

  if (
    texto.includes("confirmar") ||
    texto.includes("presença") ||
    texto.includes("presenca") ||
    texto.includes("rsvp")
  ) {
    return "rsvp";
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

  if (texto.includes("waze") || texto.includes("trânsito") || texto.includes("transito")) {
    return "waze";
  }

  if (texto.includes("calendário") || texto.includes("calendario") || texto.includes("agenda")) {
    return "calendar";
  }

  return "none";
}

function tocarSomConfirmacao() {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    990,
    audioContext.currentTime + 0.12,
  );

  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.32);
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

function getEffectStyle(effect?: string): CSSProperties {
  if (effect === "glow") {
    return {
      boxShadow: "0 0 22px rgba(247,212,119,.58), 0 0 48px rgba(124,58,237,.22)",
      filter: "drop-shadow(0 0 10px rgba(247,212,119,.36))",
    };
  }

  if (effect === "float") {
    return {
      transform: "translateY(-3px)",
      boxShadow: "0 14px 32px rgba(15,23,42,.24)",
    };
  }

  if (effect === "pulse") {
    return {
      transform: "scale(1.015)",
      boxShadow: "0 0 0 5px rgba(255,255,255,.08)",
    };
  }

  if (effect === "shine") {
    return {
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18), 0 14px 32px rgba(255,255,255,.10)",
      backgroundImage: "linear-gradient(110deg, transparent 0%, rgba(255,255,255,.22) 48%, transparent 56%)",
      backgroundBlendMode: "screen",
    };
  }

  return {};
}

function CountdownBlock({ block, evento }: { block: ConviteBlock; evento?: EventoPreview }) {
  const e = { ...DEFAULT_EVENTO, ...(evento || {}) };
  const horaResolvida =
    normalizarTextoHorario(e.hora_evento) ||
    normalizarTextoHorario(e.horario_evento) ||
    normalizarTextoHorario(e.horario) ||
    normalizarTextoHorario(e.hora) ||
    DEFAULT_EVENTO.hora_evento;
  const countdown = getCountdownBrasil(e.data_evento, horaResolvida);

  const itemStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  };

  const numberStyle: CSSProperties = {
    display: "block",
    fontSize: Math.max(block.font_size || 28, 28),
    lineHeight: 0.9,
    fontWeight: 950,
    color: block.color || "#f7d477",
    letterSpacing: "0.02em",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    marginTop: 7,
    fontSize: Math.max(8, Math.round((block.font_size || 28) * 0.28)),
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: "0.16em",
    color: "#ffffff",
    opacity: 0.86,
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <div style={itemStyle}>
        <strong style={numberStyle}>{pad2(countdown.dias)}</strong>
        <span style={labelStyle}>DIAS</span>
      </div>
      <div style={itemStyle}>
        <strong style={numberStyle}>{pad2(countdown.horas)}</strong>
        <span style={labelStyle}>HORAS</span>
      </div>
      <div style={itemStyle}>
        <strong style={numberStyle}>{pad2(countdown.minutos)}</strong>
        <span style={labelStyle}>MIN</span>
      </div>
      <div style={itemStyle}>
        <strong style={numberStyle}>{pad2(countdown.segundos)}</strong>
        <span style={labelStyle}>SEG</span>
      </div>


    </div>
  );
}

function GuestPickerBlock({ block }: { block: ConviteBlock }) {
  const nomesDemo = ["URSULA JOSÉ", "VITOR JOSÉ"];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: 14,
        padding: 10,
        boxSizing: "border-box",
      }}
    >
      {nomesDemo.map((nome) => (
        <label
          key={nome}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: block.color || "#ffffff",
            fontFamily: block.font_family || "Inter",
            fontSize: block.font_size,
            fontWeight: 900,
            lineHeight: 1.15,
          }}
        >
          <input
            type="checkbox"
            checked
            readOnly
            style={{
              width: Math.max(18, Math.round((block.font_size || 18) * 1.15)),
              height: Math.max(18, Math.round((block.font_size || 18) * 1.15)),
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

export default function ConviteVisualRenderer({
  blocks,
  backgroundUrl = "",
  logoUrl = "",
  width = 430,
  height = 920,
  scale = 1,
  backgroundX = 0,
  backgroundY = 0,
  backgroundScale = 1,
  backgroundOpacity = 1,
  glassOpacity = 0.18,
  glassBlur = 0,
  glassTone = "dark",
  evento,
  showSelectionOutline = false,
  selectedBlockId = null,
  blockEffects = {},
  childrenForBlock,
  enableConfirmationEffects = false,
  showSoundToggle = false,
  onConfirmPresence,
}: Props) {
  const [, setTick] = useState(0);
  const [somAtivo, setSomAtivo] = useState(true);
  const [somLiberado, setSomLiberado] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [backgroundPronto, setBackgroundPronto] = useState(!backgroundUrl);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!backgroundUrl) {
      setBackgroundPronto(true);
      return;
    }

    let cancelado = false;
    setBackgroundPronto(false);

    const image = new Image();

    image.onload = () => {
      if (!cancelado) {
        setBackgroundPronto(true);
      }
    };

    image.onerror = () => {
      if (!cancelado) {
        setBackgroundPronto(true);
      }
    };

    image.src = backgroundUrl;

    return () => {
      cancelado = true;
    };
  }, [backgroundUrl]);

  useEffect(() => {
    if (!enableConfirmationEffects || !showSoundToggle || !somAtivo || somLiberado) {
      return;
    }

    function liberarSom() {
      if (!somAtivo || somLiberado) return;

      try {
        tentarLiberarSomSilencioso();
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
  }, [enableConfirmationEffects, showSoundToggle, somAtivo, somLiberado]);

  function executarSomConfirmacao() {
    if (!enableConfirmationEffects || !somAtivo) return;

    try {
      tocarSomConfirmacao();
      setSomLiberado(true);
    } catch {
      // Sem bloqueio visual caso o navegador não libere o áudio.
    }
  }

  function abrirConfirmacaoVisual() {
    if (!enableConfirmationEffects) return;

    executarSomConfirmacao();
    setConfirmacaoAberta(true);
    onConfirmPresence?.();

    window.setTimeout(() => {
      setConfirmacaoAberta(false);
    }, 3200);
  }

  return (
    <div
      style={{
        width: width * scale,
        height: height * scale,
        overflow: "hidden",
        position: "relative",
        borderRadius: Math.max(0, 24 * scale),
        background: "#000000",
      }}
    >
      <style jsx global>{`
        @keyframes omniInviteSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {!backgroundPronto && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9997,
            display: "grid",
            placeItems: "center",
            background: "#000000",
          }}
        >
          <div
            style={{
              width: Math.max(28, 42 * scale),
              height: Math.max(28, 42 * scale),
              borderRadius: "50%",
              border: `${Math.max(2, 3 * scale)}px solid rgba(255,255,255,0.14)`,
              borderTop: `${Math.max(2, 3 * scale)}px solid rgba(167,139,250,0.95)`,
              animation: "omniInviteSpin .8s linear infinite",
              boxShadow: "0 0 30px rgba(124,58,237,0.24)",
            }}
          />
        </div>
      )}

      {enableConfirmationEffects && (
        <style jsx global>{`
          @keyframes omniConfirmPop {
            0% {
              opacity: 0;
              transform: translateY(16px) scale(.92);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes omniButtonGlow {
            0%, 100% {
              filter: drop-shadow(0 0 0 rgba(247,212,119,0));
            }
            50% {
              filter: drop-shadow(0 0 14px rgba(247,212,119,.72));
            }
          }
        `}</style>
      )}

      {enableConfirmationEffects && showSoundToggle && (
        <button
          type="button"
          onClick={() => {
            setSomAtivo((current) => {
              const next = !current;

              if (next) {
                window.setTimeout(() => {
                  try {
                    tocarSomConfirmacao();
                    setSomLiberado(true);
                  } catch {
                    // Pode depender da próxima interação do usuário.
                  }
                }, 0);
              }

              return next;
            });
          }}
          style={{
            position: "absolute",
            top: 10 * scale,
            right: 10 * scale,
            zIndex: 9999,
            border: "1px solid rgba(255,255,255,.24)",
            borderRadius: 999,
            padding: `${8 * scale}px ${12 * scale}px`,
            background: "rgba(2,6,23,.72)",
            color: "#ffffff",
            fontSize: Math.max(10, 12 * scale),
            fontWeight: 900,
            boxShadow: "0 12px 34px rgba(0,0,0,.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            cursor: "pointer",
          }}
        >
          {somAtivo ? "🔊 Som" : "🔇 Som"}
        </button>
      )}
      <div
        style={{
          width,
          height,
          position: "absolute",
          left: 0,
          top: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          background: "#000000",
          opacity: backgroundPronto ? 1 : 0,
          transition: "opacity .42s ease",
        }}
      >
        {backgroundUrl && (
          <img
            src={backgroundUrl}
            alt=""
            loading="eager"
            decoding="async"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width,
              height,
              objectFit: "cover",
              transform: `translate(calc(-50% + ${backgroundX}px), calc(-50% + ${backgroundY}px)) scale(${backgroundScale})`,
              opacity: backgroundOpacity,
              zIndex: 0,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              glassTone === "light"
                ? `rgba(255,255,255,${glassOpacity})`
                : `rgba(2,6,23,${glassOpacity})`,
            backdropFilter: glassBlur ? `blur(${glassBlur}px)` : "none",
            WebkitBackdropFilter: glassBlur ? `blur(${glassBlur}px)` : "none",
          }}
        />

        {blocks
          .filter((b) => b.visible !== false)
          .sort((a, b) => (a.z_index || 1) - (b.z_index || 1))
          .map((block) => {
            const isSelected = selectedBlockId === block.id;
            const isLogo = block.type === "logo";
            const isDivider = block.type === "divider";
            const effectStyle = getEffectStyle(blockEffects[block.id]);

            const shared: CSSProperties = {
              position: "absolute",
              left: block.x,
              top: block.y,
              width: block.width,
              height: block.height,
              zIndex: (block.z_index || 1) + 10,
              boxSizing: "border-box",
              borderRadius: isLogo ? 0 : block.border_radius,
              color: block.color || "#ffffff",
              background: isLogo ? "transparent" : block.background || "transparent",
              fontFamily: `${block.font_family || "Inter"}, Arial, sans-serif`,
              fontSize: block.font_size,
              fontWeight: 900,
              display: "flex",
              alignItems: block.type === "guest_picker" ? "stretch" : "center",
              justifyContent: block.type === "guest_picker" ? "flex-start" : "center",
              textAlign: "center",
              lineHeight: 1.12,
              padding: isDivider || isLogo ? 0 : 8,
              whiteSpace: "pre-wrap",
              overflow: isLogo ? "visible" : "hidden",
              outline: showSelectionOutline
                ? isSelected
                  ? "2px solid #a78bfa"
                  : "1px dashed rgba(255,255,255,.36)"
                : "none",
              boxShadow: showSelectionOutline && isSelected ? "0 0 0 4px rgba(124,58,237,.18)" : undefined,
              userSelect: showSelectionOutline ? "none" : undefined,
              ...effectStyle,
            };

            const customChildren = childrenForBlock?.(block);
            if (customChildren) {
              return (
                <div key={block.id} style={shared}>
                  {customChildren}
                </div>
              );
            }

            if (block.type === "logo") {
              return (
                <div key={block.id} style={shared}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo do evento"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        boxShadow: "none",
                        borderRadius: 0,
                        pointerEvents: "none",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        background: "transparent",
                      }}
                    >
                      <div style={{ fontSize: Math.max(12, block.font_size || 12), opacity: 0.92 }}>
                        LOGO
                        <br />
                        EVENTO
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (block.type === "divider") {
              return <div key={block.id} style={shared} />;
            }

            if (block.type === "qr") {
              return (
                <div key={block.id} style={shared}>
                  <div
                    style={{
                      width: "78%",
                      height: "78%",
                      borderRadius: 8,
                      background:
                        "linear-gradient(90deg,#111 10px,transparent 10px) 0 0/22px 22px, linear-gradient(#111 10px,transparent 10px) 0 0/22px 22px, #fff",
                      opacity: 0.92,
                    }}
                  />
                </div>
              );
            }

            if (block.type === "countdown") {
              return (
                <div key={block.id} style={shared}>
                  <CountdownBlock block={block} evento={evento} />
                </div>
              );
            }

            if (block.type === "guest_picker") {
              return (
                <div key={block.id} style={shared}>
                  <GuestPickerBlock block={block} />
                </div>
              );
            }

            if (
              enableConfirmationEffects &&
              (block.type === "button" || detectarAcaoBotao(block.content) === "rsvp")
            ) {
              const acao = detectarAcaoBotao(block.content);
              const isConfirmacao = acao === "rsvp";
              const label = aplicarVariaveis(block.content, evento);

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => {
                    if (isConfirmacao) {
                      abrirConfirmacaoVisual();
                    } else {
                      executarSomConfirmacao();
                    }
                  }}
                  style={{
                    ...shared,
                    border: "none",
                    cursor: "pointer",
                    animation: isConfirmacao
                      ? "omniButtonGlow 2.2s ease-in-out infinite"
                      : undefined,
                  }}
                >
                  {label}
                </button>
              );
            }

            return (
              <div key={block.id} style={shared}>
                {aplicarVariaveis(block.content, evento)}
              </div>
            );
          })}
      </div>

      {enableConfirmationEffects && confirmacaoAberta && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9998,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            background:
              "radial-gradient(circle at center, rgba(124,58,237,.28), transparent 44%)",
          }}
        >
          <div
            style={{
              width: "min(340px, calc(100% - 42px))",
              borderRadius: 28,
              padding: "26px 22px",
              display: "grid",
              justifyItems: "center",
              gap: 10,
              textAlign: "center",
              color: "#ffffff",
              background:
                "linear-gradient(135deg, rgba(124,58,237,.94), rgba(20,184,166,.9))",
              border: "1px solid rgba(255,255,255,.28)",
              boxShadow:
                "0 24px 90px rgba(124,58,237,.38), 0 0 0 8px rgba(255,255,255,.08)",
              animation: "omniConfirmPop .34s ease-out",
            }}
          >
            <div
              style={{
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
              }}
            >
              ✓
            </div>

            <strong
              style={{
                fontSize: 24,
                lineHeight: 1.05,
                fontWeight: 950,
              }}
            >
              Presença confirmada
            </strong>

            <span
              style={{
                fontSize: 14,
                lineHeight: 1.35,
                fontWeight: 800,
                opacity: 0.92,
              }}
            >
              Sua confirmação foi registrada no convite.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
