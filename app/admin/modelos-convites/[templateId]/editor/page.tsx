"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Rnd } from "react-rnd";
import { supabase } from "@/lib/supabase";
import ConviteVisualRenderer from "@/components/ConviteVisualRenderer";

type EffectType = "none" | "glow" | "float" | "pulse" | "shine";

type BackgroundEffectType = "none" | "cinema_zoom" | "parallax";

type ConfirmationEffectType =
  | "padrao"
  | "copa"
  | "princesa"
  | "luxo"
  | "infantil"
  | "nenhum";

type BlockType =
  | "text"
  | "event_name"
  | "guest_name"
  | "date_time"
  | "location"
  | "countdown"
  | "logo"
  | "button"
  | "divider"
  | "qr"
  | "guest_picker";

type ConviteBlock = {
  id: string;
  template_id: string;
  type: BlockType;
  label: string | null;
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
};

type TemplateData = {
  id: string;
  nome: string | null;
  name: string | null;
  html_template: string | null;
  preview_image: string | null;
  visual_config?: any;
};

const CANVAS_W = 430;
const CANVAS_H = 920;

const buttonBase: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #dbe3ef",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  ...buttonBase,
  border: "none",
  background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
  color: "#fff",
  boxShadow: "0 12px 26px rgba(124,58,237,.22)",
};

const smallButton: CSSProperties = {
  ...buttonBase,
  minHeight: 34,
  padding: "0 10px",
  borderRadius: 10,
  fontSize: 12,
};

function toNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

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

function getCountdownBrasil(
  dataEvento?: string | null,
  horarioEvento?: string | null,
) {
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

function getDiasRestantesBrasil(
  dataEvento?: string | null,
  horarioEvento?: string | null,
) {
  return getCountdownBrasil(dataEvento, horarioEvento).dias;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function numberToHex(value: number) {
  return clampNumber(Math.round(value), 0, 255)
    .toString(16)
    .padStart(2, "0");
}

function normalizeHexColor(value?: string | null) {
  const text = String(value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();

  if (/^#[0-9a-fA-F]{3}$/.test(text)) {
    const [, r, g, b] = text;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return "#0f172a";
}

function hexToRgba(hex: string, opacityPercent: number) {
  const normalized = normalizeHexColor(hex);
  const alpha = clampNumber(opacityPercent, 0, 100) / 100;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r},${g},${b},${Number(alpha.toFixed(2))})`;
}

function parseBackgroundColor(background?: string | null) {
  const fallback = {
    hex: "#0f172a",
    opacity: 0,
    enabled: false,
  };

  const text = String(background || "").trim();

  if (!text || text === "transparent") return fallback;

  const hexMatch = text.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    return {
      hex: normalizeHexColor(text),
      opacity: 100,
      enabled: true,
    };
  }

  const rgbaMatch = text.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i,
  );

  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const alpha = rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]);

    return {
      hex: `#${numberToHex(r)}${numberToHex(g)}${numberToHex(b)}`,
      opacity: Math.round(clampNumber(alpha, 0, 1) * 100),
      enabled: true,
    };
  }

  return {
    hex: "#0f172a",
    opacity: 100,
    enabled: true,
  };
}

function normalizeConfirmationEffect(value: unknown): ConfirmationEffectType {
  if (
    value === "copa" ||
    value === "princesa" ||
    value === "luxo" ||
    value === "infantil" ||
    value === "nenhum"
  ) {
    return value;
  }

  return "padrao";
}

async function cropTransparentImageFile(file: File): Promise<{
  file: File;
  width: number;
  height: number;
}> {
  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    return { file, width: 1, height: 1 };
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!sourceCtx || !image.naturalWidth || !image.naturalHeight) {
      return {
        file,
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      };
    }

    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    sourceCtx.drawImage(image, 0, 0);

    const imageData = sourceCtx.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );

    const { data, width, height } = imageData;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];

        if (alpha > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return { file, width, height };
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropIsSameSize = cropW === width && cropH === height;

    if (cropIsSameSize) {
      return { file, width, height };
    }

    const outputCanvas = document.createElement("canvas");
    const outputCtx = outputCanvas.getContext("2d");

    if (!outputCtx) {
      return { file, width: cropW, height: cropH };
    }

    outputCanvas.width = cropW;
    outputCanvas.height = cropH;
    outputCtx.drawImage(
      sourceCanvas,
      minX,
      minY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      outputCanvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      return { file, width: cropW, height: cropH };
    }

    const croppedFile = new File(
      [blob],
      file.name.replace(/\.[^/.]+$/, "") + "-crop.png",
      { type: "image/png" },
    );

    return { file: croppedFile, width: cropW, height: cropH };
  } catch {
    return { file, width: 1, height: 1 };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

const DEMO_EVENTO = {
  nome_evento: "Valentina XV",
  nome_convidado: "Ursula Tavares",
  data_evento_iso: "2026-05-16",
  data_evento: "16/05/2026",
  hora_evento: "21h",
  horario_evento: "21:00",
  hora_termino: "03h",
  horario_termino: "03:00",
  hora_termino_evento: "03h",
  data_termino: "17/05/2026",
  data_termino_iso: "2026-05-17",
  local_evento: "Guerrah Hall",
  endereco_evento: "Macaé/RJ",
};

const EFFECT_OPTIONS: { value: EffectType; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "glow", label: "Glow" },
  { value: "float", label: "Flutuar" },
  { value: "pulse", label: "Pulse" },
  { value: "shine", label: "Shine" },
];

const BACKGROUND_EFFECT_OPTIONS: {
  value: BackgroundEffectType;
  label: string;
}[] = [
  { value: "none", label: "Nenhum" },
  { value: "cinema_zoom", label: "Zoom cinema" },
  { value: "parallax", label: "Parallax leve" },
];

const CONFIRMATION_EFFECT_OPTIONS: {
  value: ConfirmationEffectType;
  label: string;
  description: string;
}[] = [
  {
    value: "padrao",
    label: "Padrão OmniStage",
    description: "Confirmação limpa e neutra para qualquer evento.",
  },
  {
    value: "copa",
    label: "Copa / Futebol",
    description: "Gol, comemoração, confete verde e amarelo.",
  },
  {
    value: "princesa",
    label: "Princesa / XV anos",
    description: "Brilhos, dourado e clima elegante.",
  },
  {
    value: "luxo",
    label: "Luxo / Premium",
    description: "Animação discreta, sofisticada e minimalista.",
  },
  {
    value: "infantil",
    label: "Infantil",
    description: "Efeito alegre e lúdico para festas infantis.",
  },
  {
    value: "nenhum",
    label: "Nenhum",
    description: "Não dispara efeito especial após confirmar.",
  },
];

function getEditorEffectStyle(effect: EffectType): CSSProperties {
  if (effect === "glow") {
    return {
      boxShadow:
        "0 0 22px rgba(247,212,119,.58), 0 0 48px rgba(124,58,237,.22)",
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
      boxShadow:
        "inset 0 0 0 1px rgba(255,255,255,.18), 0 14px 32px rgba(255,255,255,.10)",
      backgroundImage:
        "linear-gradient(110deg, transparent 0%, rgba(255,255,255,.22) 48%, transparent 56%)",
      backgroundBlendMode: "screen",
    };
  }

  return {};
}

function renderDynamicContent(content: string | null) {
  const diasParaEvento = getDiasRestantesBrasil(
    DEMO_EVENTO.data_evento_iso,
    DEMO_EVENTO.horario_evento,
  );

  return String(content || "")
    .replaceAll("{{nome_evento}}", DEMO_EVENTO.nome_evento)
    .replaceAll("{{nome_convidado}}", DEMO_EVENTO.nome_convidado)
    .replaceAll("{{data_evento}}", DEMO_EVENTO.data_evento)
    .replaceAll("{{hora_evento}}", DEMO_EVENTO.hora_evento)
    .replaceAll("{{horario_evento}}", DEMO_EVENTO.hora_evento)
    .replaceAll("{{hora_termino}}", DEMO_EVENTO.hora_termino)
    .replaceAll("{{horario_termino}}", DEMO_EVENTO.horario_termino)
    .replaceAll("{{hora_termino_evento}}", DEMO_EVENTO.hora_termino_evento)
    .replaceAll("{{data_termino}}", DEMO_EVENTO.data_termino)
    .replaceAll("{{DATA_TERMINO}}", DEMO_EVENTO.data_termino)
    .replaceAll("{{local_evento}}", DEMO_EVENTO.local_evento)
    .replaceAll("{{endereco_evento}}", DEMO_EVENTO.endereco_evento)
    .replaceAll("{{dias_para_evento}}", String(diasParaEvento))
    .replaceAll("{{contador_evento}}", String(diasParaEvento))
    .replaceAll("{{link_rsvp}}", "Confirmar presença")
    .replaceAll("{{total_convidados}}", "4")
    .replaceAll("{{convidados_quantidade}}", "4")
    .replaceAll("{{texto_total_convidados}}", "Convite para 4 convidados")
    .replaceAll("{{google_maps_url}}", "Ver localização")
    .replaceAll("{{waze_url}}", "Abrir no Waze")
    .replaceAll("{{calendario_url}}", "Adicionar ao calendário")
    .replaceAll("{{qr_code}}", "QR")
    .replaceAll("{{logo_evento}}", "Logo Evento");
}

function renderCountdownContent(block: ConviteBlock) {
  const countdown = getCountdownBrasil(
    DEMO_EVENTO.data_evento_iso,
    DEMO_EVENTO.horario_evento,
  );

  const itemStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  };

  const numberStyle: CSSProperties = {
    display: "block",
    fontSize: Math.max(block.font_size, 28),
    lineHeight: 0.9,
    fontWeight: 950,
    color: block.color || "#f7d477",
    letterSpacing: "0.02em",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    marginTop: 7,
    fontSize: Math.max(8, Math.round(block.font_size * 0.28)),
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

function renderGuestPickerContent(block: ConviteBlock) {
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
              width: Math.max(18, Math.round(block.font_size * 1.15)),
              height: Math.max(18, Math.round(block.font_size * 1.15)),
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

function renderPreviewBlock(
  block: ConviteBlock,
  logoPreviewUrl: string,
  effect: EffectType = "none",
) {
  const shared: CSSProperties = {
    position: "absolute",
    left: block.x,
    top: block.y,
    width: block.width,
    height: block.height,
    zIndex: (block.z_index || 1) + 10,
    boxSizing: "border-box",
    borderRadius: block.border_radius,
    color: block.color,
    background: block.background || "transparent",
    fontFamily: block.font_family,
    fontSize: block.font_size,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    lineHeight: 1.12,
    padding: block.type === "divider" ? 0 : 8,
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    ...getEditorEffectStyle(effect),
  };

  if (block.type === "countdown") {
    return (
      <div key={block.id} style={shared}>
        {renderCountdownContent(block)}
      </div>
    );
  }

  if (block.type === "logo") {
    const logoWrapperStyle: CSSProperties = {
      ...shared,
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      padding: 0,
      overflow: "visible",
      borderRadius: 0,
      ...getEditorEffectStyle("none"),
    };

    return (
      <div key={block.id} style={logoWrapperStyle}>
        {logoPreviewUrl ? (
          <img
            src={logoPreviewUrl}
            alt="Logo do evento"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              background: "transparent",
              border: "none",
              boxShadow: "none",
              borderRadius: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              borderRadius: block.border_radius,
              background: "transparent",
            }}
          >
            <div
              style={{
                fontSize: Math.max(12, block.font_size),
                opacity: 0.92,
              }}
            >
              LOGO
              <br />
              EVENTO
            </div>
          </div>
        )}
      </div>
    );
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

  if (block.type === "guest_picker") {
    return (
      <div
        key={block.id}
        style={{
          ...shared,
          alignItems: "stretch",
          justifyContent: "flex-start",
          padding: 8,
        }}
      >
        {renderGuestPickerContent(block)}
      </div>
    );
  }

  if (block.type === "divider") {
    return <div key={block.id} style={shared} />;
  }

  return (
    <div key={block.id} style={shared}>
      {renderDynamicContent(block.content)}
    </div>
  );
}

function defaultBlock(
  templateId: string,
  type: BlockType,
  nextZ: number,
): ConviteBlock {
  const base = {
    id: createLocalId(),
    template_id: templateId,
    type,
    label: null,
    content: "Novo texto",
    x: 80,
    y: 120,
    width: 260,
    height: 70,
    font_size: 24,
    font_family: "Inter",
    color: "#ffffff",
    background: null,
    border_radius: 12,
    z_index: nextZ,
    visible: true,
  };

  if (type === "event_name") {
    return {
      ...base,
      label: "Nome do evento",
      content: "{{nome_evento}}",
      x: 42,
      y: 160,
      width: 346,
      height: 82,
      font_size: 38,
      color: "#f7d477",
    };
  }

  if (type === "guest_name") {
    return {
      ...base,
      label: "Nome do convidado",
      content: "{{nome_convidado}}",
      x: 55,
      y: 260,
      width: 320,
      height: 56,
      font_size: 24,
    };
  }

  if (type === "date_time") {
    return {
      ...base,
      label: "Data e horário",
      content: "{{data_evento}} • {{hora_evento}} até {{hora_termino}}",
      x: 55,
      y: 340,
      width: 320,
      height: 50,
      font_size: 22,
    };
  }

  if (type === "location") {
    return {
      ...base,
      label: "Local",
      content: "{{local_evento}}",
      x: 55,
      y: 400,
      width: 320,
      height: 50,
      font_size: 21,
    };
  }

  if (type === "countdown") {
    return {
      ...base,
      label: "Contador",
      content: "{{contador_evento}}",
      x: 20,
      y: 500,
      width: 390,
      height: 120,
      font_size: 42,
      color: "#f7d477",
      background: "rgba(15,23,42,.48)",
      border_radius: 0,
    };
  }

  if (type === "logo") {
    return {
      ...base,
      label: "Logo do evento",
      content: "{{logo_evento}}",
      x: 145,
      y: 60,
      width: 140,
      height: 140,
      font_size: 16,
      color: "#ffffff",
      background: null,
      border_radius: 0,
    };
  }

  if (type === "button") {
    return {
      ...base,
      label: "Botão",
      content: "CONFIRMAR PRESENÇA",
      x: 55,
      y: 620,
      width: 320,
      height: 58,
      font_size: 17,
      color: "#ffffff",
      background: "rgba(255,255,255,.14)",
      border_radius: 18,
    };
  }

  if (type === "divider") {
    return {
      ...base,
      label: "Linha",
      content: "",
      x: 55,
      y: 560,
      width: 320,
      height: 2,
      font_size: 1,
      background: "rgba(255,255,255,.32)",
      border_radius: 999,
    };
  }

  if (type === "guest_picker") {
    return {
      ...base,
      label: "Lista confirmação",
      content: "Selecione os nomes para confirmar presença",
      x: 28,
      y: 690,
      width: 374,
      height: 130,
      font_size: 18,
      color: "#ffffff",
      background: "rgba(15,23,42,.56)",
      border_radius: 22,
    };
  }

  if (type === "qr") {
    return {
      ...base,
      label: "QR Code",
      content: "{{qr_code}}",
      x: 150,
      y: 710,
      width: 130,
      height: 130,
      font_size: 12,
      color: "#0f172a",
      background: "#ffffff",
      border_radius: 16,
    };
  }

  return base;
}

function defaultActionBlock(
  templateId: string,
  action: "rsvp" | "maps" | "waze" | "calendar" | "guest_total",
  nextZ: number,
): ConviteBlock {
  const buttonBaseBlock = {
    ...defaultBlock(templateId, "button", nextZ),
    x: 55,
    y: 720,
    width: 320,
    height: 58,
    font_size: 17,
    color: "#ffffff",
    background: "rgba(255,255,255,.16)",
    border_radius: 18,
  };

  if (action === "rsvp") {
    return {
      ...buttonBaseBlock,
      label: "RSVP",
      content: "Confirmar presença",
      y: 640,
      background: "rgba(124,58,237,.82)",
    };
  }

  if (action === "maps") {
    return {
      ...buttonBaseBlock,
      label: "Ver localização",
      content: "Ver localização",
      y: 710,
      background: "rgba(15,23,42,.58)",
    };
  }

  if (action === "waze") {
    return {
      ...buttonBaseBlock,
      label: "Abrir no Waze",
      content: "Abrir no Waze",
      y: 780,
      background: "rgba(0,168,232,.78)",
    };
  }

  if (action === "calendar") {
    return {
      ...buttonBaseBlock,
      label: "Adicionar calendário",
      content: "Adicionar ao calendário",
      y: 850,
      background: "rgba(15,23,42,.58)",
    };
  }

  return {
    ...defaultBlock(templateId, "text", nextZ),
    label: "Quantidade convidados",
    content: "{{texto_total_convidados}}",
    x: 55,
    y: 600,
    width: 320,
    height: 42,
    font_size: 16,
    color: "#ffffff",
    background: "rgba(15,23,42,.42)",
    border_radius: 999,
  };
}

function renderBlock(
  block: ConviteBlock,
  selected: boolean,
  updateContent: (content: string) => void,
  logoPreviewUrl: string,
  effect: EffectType = "none",
) {
  const shared: CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    borderRadius: block.border_radius,
    color: block.color,
    background: block.background || "transparent",
    fontFamily: block.font_family,
    fontSize: block.font_size,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    lineHeight: 1.12,
    padding: block.type === "divider" ? 0 : 8,
    outline: selected
      ? "2px solid #a78bfa"
      : "1px dashed rgba(255,255,255,.36)",
    boxShadow: selected ? "0 0 0 4px rgba(124,58,237,.18)" : "none",
    overflow: "hidden",
    userSelect: "none",
    ...getEditorEffectStyle(effect),
  };

  if (block.type === "countdown") {
    return <div style={shared}>{renderCountdownContent(block)}</div>;
  }

  if (block.type === "logo") {
    const logoEditorStyle: CSSProperties = {
      ...shared,
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      padding: 0,
      overflow: "visible",
      borderRadius: 0,
      ...getEditorEffectStyle("none"),
    };

    return (
      <div style={logoEditorStyle}>
        {logoPreviewUrl ? (
          <img
            src={logoPreviewUrl}
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
              borderRadius: 0,
              background: "transparent",
              outline: selected ? "1px dashed rgba(255,255,255,.42)" : "none",
            }}
          >
            <div
              style={{
                fontSize: Math.max(12, block.font_size),
                opacity: 0.92,
              }}
            >
              LOGO
              <br />
              EVENTO
            </div>
          </div>
        )}
      </div>
    );
  }

  if (block.type === "qr") {
    return (
      <div style={shared}>
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

  if (block.type === "guest_picker") {
    return (
      <div
        style={{
          ...shared,
          alignItems: "stretch",
          justifyContent: "flex-start",
          padding: 8,
        }}
      >
        {renderGuestPickerContent(block)}
      </div>
    );
  }

  if (block.type === "divider") {
    return <div style={shared} />;
  }

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => updateContent(e.currentTarget.innerText)}
      style={shared}
    >
      {block.content}
    </div>
  );
}

export default function EditorModeloConvitePage({
  params,
}: {
  params: { templateId: string };
}) {
  const templateId = params.templateId;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [blocks, setBlocks] = useState<ConviteBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewAoVivo, setPreviewAoVivo] = useState(false);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState("");
  const [backgroundX, setBackgroundX] = useState(0);
  const [backgroundY, setBackgroundY] = useState(0);
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundOpacity, setBackgroundOpacity] = useState(1);
  const [glassOpacity, setGlassOpacity] = useState(0.18);
  const [glassBlur, setGlassBlur] = useState(0);
  const [glassTone, setGlassTone] = useState<"light" | "dark">("dark");
  const [backgroundEffect, setBackgroundEffect] =
    useState<BackgroundEffectType>("none");
  const [confirmationEffect, setConfirmationEffect] =
    useState<ConfirmationEffectType>("padrao");
  const [blockEffects, setBlockEffects] = useState<Record<string, EffectType>>(
    {},
  );
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [musicaPreviewUrl, setMusicaPreviewUrl] = useState("");
  const [musicaTocando, setMusicaTocando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) || null,
    [blocks, selectedId],
  );

  const selectedBackground = useMemo(
    () => parseBackgroundColor(selectedBlock?.background),
    [selectedBlock?.background],
  );

  const nextZ = useMemo(() => {
    return Math.max(0, ...blocks.map((b) => b.z_index || 0)) + 1;
  }, [blocks]);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function carregarTudo() {
    setLoading(true);

    const [{ data: templateData }, { data: blockData, error: blocksError }] =
      await Promise.all([
        supabase
          .from("invite_templates")
          .select("id, nome, name, html_template, preview_image, visual_config")
          .eq("id", templateId)
          .single(),
        supabase
          .from("invite_template_blocks")
          .select("*")
          .eq("template_id", templateId)
          .order("z_index", { ascending: true }),
      ]);

    if (templateData) {
      setTemplate(templateData as TemplateData);
      const config = (templateData as any).visual_config || {};
      setBackgroundEffect(
        config.backgroundEffect === "cinema_zoom" ||
          config.backgroundEffect === "parallax"
          ? config.backgroundEffect
          : "none",
      );
      setConfirmationEffect(
        normalizeConfirmationEffect(config.confirmationEffect),
      );
      setBlockEffects(config.blockEffects || {});
    }

    try {
      const savedAssets = JSON.parse(
        localStorage.getItem(`omnistage_invite_editor_assets_${templateId}`) ||
          "{}",
      );
      setBackgroundPreviewUrl(savedAssets.backgroundPreviewUrl || "");
      setBackgroundX(Number(savedAssets.backgroundX || 0));
      setBackgroundY(Number(savedAssets.backgroundY || 0));
      setBackgroundScale(Number(savedAssets.backgroundScale || 1));
      setBackgroundOpacity(Number(savedAssets.backgroundOpacity ?? 1));
      setGlassOpacity(Number(savedAssets.glassOpacity ?? 0.18));
      setGlassBlur(Number(savedAssets.glassBlur || 0));
      setGlassTone(savedAssets.glassTone === "light" ? "light" : "dark");
      setLogoPreviewUrl(savedAssets.logoPreviewUrl || "");
      setMusicaPreviewUrl(savedAssets.musicaPreviewUrl || "");
      if (savedAssets.backgroundEffect) {
        setBackgroundEffect(
          savedAssets.backgroundEffect === "cinema_zoom" ||
            savedAssets.backgroundEffect === "parallax"
            ? savedAssets.backgroundEffect
            : "none",
        );
      }
      if (savedAssets.confirmationEffect) {
        setConfirmationEffect(
          normalizeConfirmationEffect(savedAssets.confirmationEffect),
        );
      }
      if (savedAssets.blockEffects) {
        setBlockEffects(savedAssets.blockEffects || {});
      }
    } catch {}

    if (blocksError) {
      alert(
        "Erro ao carregar blocos. Confirme se a tabela invite_template_blocks foi criada no Supabase: " +
          blocksError.message,
      );
    }

    const loadedBlocks = (blockData || []).map((b: any) => {
      const blockType = (b.type || "text") as BlockType;
      const currentContent = String(b.content || "");
      const content =
        blockType === "date_time" &&
        currentContent.includes("{{hora_evento}}") &&
        !currentContent.includes("{{hora_termino}}")
          ? currentContent.replace(
              "{{hora_evento}}",
              "{{hora_evento}} até {{hora_termino}}",
            )
          : currentContent;

      return {
      id: String(b.id),
      template_id: String(b.template_id),
      type: blockType,
      label: b.label || null,
      content,
      x: toNumber(b.x, 0),
      y: toNumber(b.y, 0),
      width: toNumber(b.width, 200),
      height: toNumber(b.height, 60),
      font_size: toNumber(b.font_size, 24),
      font_family: b.font_family || "Inter",
      color: b.color || "#ffffff",
      background: b.background || null,
      border_radius: toNumber(b.border_radius, 0),
      z_index: toNumber(b.z_index, 1),
      visible: b.visible !== false,
      };
    }) as ConviteBlock[];

    setBlocks(
      loadedBlocks.length
        ? loadedBlocks
        : [
            defaultBlock(templateId, "event_name", 1),
            {
              ...defaultBlock(templateId, "date_time", 2),
              y: 250,
            },
            {
              ...defaultBlock(templateId, "location", 3),
              y: 310,
            },
            {
              ...defaultBlock(templateId, "countdown", 4),
              y: 460,
            },
            {
              ...defaultBlock(templateId, "button", 5),
              y: 640,
            },
          ],
    );

    setLoading(false);
  }

  function updateBlock(id: string, updates: Partial<ConviteBlock>) {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? {
              ...block,
              ...updates,
            }
          : block,
      ),
    );
  }

  function updateSelectedBackground(hex: string, opacity: number) {
    if (!selectedBlock) return;

    updateBlock(selectedBlock.id, {
      background: hexToRgba(hex, opacity),
    });
  }

  function clearSelectedBackground() {
    if (!selectedBlock) return;

    updateBlock(selectedBlock.id, {
      background: null,
    });
  }

  function addBlock(type: BlockType) {
    const block = defaultBlock(templateId, type, nextZ);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }

  function addPresetBlock(
    action: "rsvp" | "maps" | "waze" | "calendar" | "guest_total",
  ) {
    const block = defaultActionBlock(templateId, action, nextZ);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
    setBlockEffects((current) => {
      const next = { ...current };
      delete next[selectedId];
      return next;
    });
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedBlock) return;

    const duplicate: ConviteBlock = {
      ...selectedBlock,
      id: createLocalId(),
      x: selectedBlock.x + 18,
      y: selectedBlock.y + 18,
      z_index: nextZ,
    };

    setBlocks((prev) => [...prev, duplicate]);
    setBlockEffects((current) => ({
      ...current,
      [duplicate.id]: current[selectedBlock.id] || "none",
    }));
    setSelectedId(duplicate.id);
  }

  function bringForward() {
    if (!selectedBlock) return;
    updateBlock(selectedBlock.id, { z_index: nextZ });
  }

  function moverSelecionado(dx: number, dy: number) {
    if (!selectedBlock) return;

    updateBlock(selectedBlock.id, {
      x: Math.max(
        0,
        Math.min(CANVAS_W - selectedBlock.width, selectedBlock.x + dx),
      ),
      y: Math.max(
        0,
        Math.min(CANVAS_H - selectedBlock.height, selectedBlock.y + dy),
      ),
    });
  }

  function redimensionarSelecionado(delta: number) {
    if (!selectedBlock) return;

    updateBlock(selectedBlock.id, {
      width: Math.max(24, Math.min(CANVAS_W, selectedBlock.width + delta)),
      height: Math.max(12, Math.min(CANVAS_H, selectedBlock.height + delta)),
    });
  }

  async function salvarConfiguracaoVisual(overrides?: {
    backgroundPreviewUrl?: string;
    logoPreviewUrl?: string;
    musicaPreviewUrl?: string;
  }) {
    const nextBackground =
      overrides?.backgroundPreviewUrl ?? backgroundPreviewUrl;
    const nextLogo = overrides?.logoPreviewUrl ?? logoPreviewUrl;
    const nextMusica = overrides?.musicaPreviewUrl ?? musicaPreviewUrl;

    const visualConfig = {
      backgroundPreviewUrl: nextBackground || "",
      backgroundX,
      backgroundY,
      backgroundScale,
      backgroundOpacity,
      glassOpacity,
      glassBlur,
      glassTone,
      logoPreviewUrl: nextLogo || "",
      musicaPreviewUrl: nextMusica || "",
      backgroundEffect,
      confirmationEffect,
      blockEffects,
    };

    const { error } = await supabase
      .from("invite_templates")
      .update({
        editor_mode: "visual",
        preview_image: nextBackground || nextLogo || null,
        background_image: nextBackground || null,
        logo_image: nextLogo || null,
        visual_config: visualConfig,
      })
      .eq("id", templateId);

    if (error) {
      alert("Erro ao salvar configuração visual no modelo: " + error.message);
      return false;
    }

    return true;
  }

  async function uploadPreviewAsset(
    file: File,
    tipo: "background" | "logo" | "musica",
  ) {
    const logoCrop =
      tipo === "logo" ? await cropTransparentImageFile(file) : null;
    const fileToUpload = logoCrop?.file || file;

    const ext = fileToUpload.name.split(".").pop() || "asset";
    const safeName = fileToUpload.name
      .replace(/\.[^/.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const filePath = `${templateId}/${tipo}/${Date.now()}-${safeName}.${ext}`;

    const { error } = await supabase.storage
      .from("invite-assets")
      .upload(filePath, fileToUpload, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      alert(`Erro ao subir ${tipo}: ${error.message}`);
      return;
    }

    const { data } = supabase.storage
      .from("invite-assets")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    if (tipo === "background") {
      setBackgroundPreviewUrl(publicUrl);
      await salvarConfiguracaoVisual({ backgroundPreviewUrl: publicUrl });
    }

    if (tipo === "logo") {
      setLogoPreviewUrl(publicUrl);

      if (logoCrop?.width && logoCrop?.height) {
        const ratio = logoCrop.width / logoCrop.height;

        if (Number.isFinite(ratio) && ratio > 0) {
          setBlocks((prev) =>
            prev.map((block) => {
              if (block.type !== "logo") return block;

              const nextWidth = Math.min(CANVAS_W, Math.max(80, block.width));
              const nextHeight = Math.round(nextWidth / ratio);

              if (nextHeight <= CANVAS_H) {
                return {
                  ...block,
                  width: nextWidth,
                  height: Math.max(40, nextHeight),
                };
              }

              return {
                ...block,
                width: Math.max(80, Math.round(CANVAS_H * ratio)),
                height: CANVAS_H,
              };
            }),
          );
        }
      }

      await salvarConfiguracaoVisual({ logoPreviewUrl: publicUrl });
    }

    if (tipo === "musica") {
      setMusicaPreviewUrl(publicUrl);
      setMusicaTocando(false);
      await salvarConfiguracaoVisual({ musicaPreviewUrl: publicUrl });
    }
  }

  async function salvarBlocos() {
    setSaving(true);

    const { error: deleteError } = await supabase
      .from("invite_template_blocks")
      .delete()
      .eq("template_id", templateId);

    if (deleteError) {
      setSaving(false);
      alert("Erro ao limpar blocos antigos: " + deleteError.message);
      return;
    }

    const payload = blocks.map((b, index) => ({
      id: b.id,
      template_id: templateId,
      type: b.type,
      label: b.label,
      content: b.content,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      font_size: b.font_size,
      font_family: b.font_family,
      color: b.color,
      background: b.type === "logo" ? null : b.background,
      border_radius: b.type === "logo" ? 0 : b.border_radius,
      z_index: b.z_index || index + 1,
      visible: b.visible,
    }));

    const { error } = await supabase
      .from("invite_template_blocks")
      .insert(payload);

    setSaving(false);

    if (error) {
      alert("Erro ao salvar blocos: " + error.message);
      return;
    }

    try {
      localStorage.setItem(
        `omnistage_invite_editor_assets_${templateId}`,
        JSON.stringify({
          backgroundPreviewUrl,
          backgroundX,
          backgroundY,
          backgroundScale,
          backgroundOpacity,
          glassOpacity,
          glassBlur,
          glassTone,
          logoPreviewUrl,
          musicaPreviewUrl,
          backgroundEffect,
          confirmationEffect,
          blockEffects,
        }),
      );
    } catch {}

    const configOk = await salvarConfiguracaoVisual();
    if (!configOk) return;

    alert("Layout salvo!");
    await carregarTudo();
  }

  return (
    <main style={page}>
      <section style={topbar}>
        <div>
          <div style={eyebrow}>Editor Visual OmniStage</div>
          <h1 style={title}>
            {template?.nome || template?.name || "Editor de Convite"}
          </h1>
          <p style={subtitle}>
            Arraste, redimensione, altere fonte e posicione os elementos do
            convite.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            style={buttonBase}
            onClick={() => {
              window.location.href = "/admin/modelos-convites";
            }}
          >
            Voltar
          </button>

          <button
            style={previewAoVivo ? primaryButton : buttonBase}
            onClick={() => setPreviewAoVivo((prev) => !prev)}
          >
            {previewAoVivo ? "Editar layout" : "Preview ao vivo"}
          </button>

          <button
            style={primaryButton}
            onClick={salvarBlocos}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar layout"}
          </button>
        </div>
      </section>

      <section style={layout}>
        <aside style={panel}>
          <h2 style={panelTitle}>Componentes</h2>

          <div style={componentHint}>
            Componentes = elementos que você coloca no convite.
          </div>

          <div style={componentGrid}>
            <button style={smallButton} onClick={() => addBlock("text")}>
              + Texto
            </button>
            <button style={smallButton} onClick={() => addBlock("event_name")}>
              + Nome evento
            </button>
            <button style={smallButton} onClick={() => addBlock("guest_name")}>
              + Convidado
            </button>
            <button style={smallButton} onClick={() => addBlock("date_time")}>
              + Data/hora
            </button>
            <button style={smallButton} onClick={() => addBlock("location")}>
              + Local
            </button>
            <button style={smallButton} onClick={() => addBlock("countdown")}>
              + Contador
            </button>
            <button style={smallButton} onClick={() => addBlock("logo")}>
              + Logo evento
            </button>
            <button style={smallButton} onClick={() => addBlock("button")}>
              + Botão livre
            </button>
            <button style={smallButton} onClick={() => addBlock("divider")}>
              + Linha
            </button>
            <button style={smallButton} onClick={() => addBlock("qr")}>
              + QR
            </button>
            <button
              style={smallButton}
              onClick={() => addBlock("guest_picker")}
            >
              + Lista confirmação
            </button>
          </div>

          <div style={divider} />

          <h2 style={panelTitle}>Ações prontas</h2>
          <div style={componentHint}>
            Botões inteligentes: no cliente viram links reais do RSVP, mapa,
            Waze e calendário.
          </div>

          <div style={componentGrid}>
            <button style={smallButton} onClick={() => addPresetBlock("rsvp")}>
              + RSVP
            </button>
            <button style={smallButton} onClick={() => addPresetBlock("maps")}>
              + Ver localização
            </button>
            <button style={smallButton} onClick={() => addPresetBlock("waze")}>
              + Abrir no Waze
            </button>
            <button
              style={smallButton}
              onClick={() => addPresetBlock("calendar")}
            >
              + Calendário
            </button>
            <button
              style={smallButton}
              onClick={() => addPresetBlock("guest_total")}
            >
              + Qtd convidados
            </button>
          </div>

          <div style={divider} />

          <h2 style={panelTitle}>Blocos no convite</h2>
          <div style={blockList}>
            {blocks.length === 0 ? (
              <div style={emptyBox}>Nenhum bloco criado.</div>
            ) : (
              blocks
                .slice()
                .sort((a, b) => a.z_index - b.z_index)
                .map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    style={
                      selectedId === block.id
                        ? blockListItemActive
                        : blockListItem
                    }
                    onClick={() => setSelectedId(block.id)}
                  >
                    <span>{block.label || block.type}</span>
                    <small>
                      {Math.round(block.x)}, {Math.round(block.y)}
                    </small>
                  </button>
                ))
            )}
          </div>

          <div style={divider} />

          <h2 style={panelTitle}>Arquivos do preview</h2>
          <div style={editStack}>
            <label style={field}>
              <span style={label}>Background do convite</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPreviewAsset(file, "background");
                  e.currentTarget.value = "";
                }}
                style={fileInput}
              />
              {backgroundPreviewUrl && (
                <div style={assetPreviewLine}>
                  <span>Background carregado</span>
                  <button
                    type="button"
                    style={linkButton}
                    onClick={() => setBackgroundPreviewUrl("")}
                  >
                    remover
                  </button>
                </div>
              )}
            </label>

            {backgroundPreviewUrl && (
              <div style={assetControlBox}>
                <strong style={{ fontSize: 12 }}>Ajuste do background</strong>

                <label style={field}>
                  <span style={label}>Mover horizontal</span>
                  <input
                    type="range"
                    min={-220}
                    max={220}
                    value={backgroundX}
                    onChange={(e) => setBackgroundX(Number(e.target.value))}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Mover vertical</span>
                  <input
                    type="range"
                    min={-420}
                    max={420}
                    value={backgroundY}
                    onChange={(e) => setBackgroundY(Number(e.target.value))}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Aumentar / diminuir</span>
                  <input
                    type="range"
                    min={0.45}
                    max={2.8}
                    step={0.01}
                    value={backgroundScale}
                    onChange={(e) => setBackgroundScale(Number(e.target.value))}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Opacidade do fundo</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={backgroundOpacity}
                    onChange={(e) =>
                      setBackgroundOpacity(Number(e.target.value))
                    }
                  />
                </label>
              </div>
            )}

            <div style={assetControlBox}>
              <strong style={{ fontSize: 12 }}>Camada tipo vidro</strong>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={glassTone === "dark" ? smallButtonActive : smallButton}
                  onClick={() => setGlassTone("dark")}
                >
                  Escurecer
                </button>
                <button
                  type="button"
                  style={
                    glassTone === "light" ? smallButtonActive : smallButton
                  }
                  onClick={() => setGlassTone("light")}
                >
                  Clarear
                </button>
              </div>

              <label style={field}>
                <span style={label}>Intensidade da camada</span>
                <input
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.01}
                  value={glassOpacity}
                  onChange={(e) => setGlassOpacity(Number(e.target.value))}
                />
              </label>

              <label style={field}>
                <span style={label}>Blur / vidro</span>
                <input
                  type="range"
                  min={0}
                  max={18}
                  step={1}
                  value={glassBlur}
                  onChange={(e) => setGlassBlur(Number(e.target.value))}
                />
              </label>
            </div>

            <div style={assetControlBox}>
              <strong style={{ fontSize: 12 }}>Efeito do background</strong>
              <label style={field}>
                <span style={label}>Opcional e leve para abrir rápido</span>
                <select
                  value={backgroundEffect}
                  onChange={(e) =>
                    setBackgroundEffect(e.target.value as BackgroundEffectType)
                  }
                  style={input}
                >
                  {BACKGROUND_EFFECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={assetControlBox}>
              <strong style={{ fontSize: 12 }}>
                Efeito ao confirmar presença
              </strong>
              <label style={field}>
                <span style={label}>
                  Vinculado ao modelo de convite e usado no RSVP público
                </span>
                <select
                  value={confirmationEffect}
                  onChange={(e) =>
                    setConfirmationEffect(
                      e.target.value as ConfirmationEffectType,
                    )
                  }
                  style={input}
                >
                  {CONFIRMATION_EFFECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={confirmationEffectHint}>
                {
                  CONFIRMATION_EFFECT_OPTIONS.find(
                    (option) => option.value === confirmationEffect,
                  )?.description
                }
              </div>
            </div>

            <label style={field}>
              <span style={label}>Logomarca do evento</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPreviewAsset(file, "logo");
                  e.currentTarget.value = "";
                }}
                style={fileInput}
              />
              {logoPreviewUrl && (
                <div style={assetPreviewLine}>
                  <span>Logo carregada</span>
                  <button
                    type="button"
                    style={linkButton}
                    onClick={() => setLogoPreviewUrl("")}
                  >
                    remover
                  </button>
                </div>
              )}
            </label>

            <label style={field}>
              <span style={label}>Música do convite</span>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPreviewAsset(file, "musica");
                  e.currentTarget.value = "";
                }}
                style={fileInput}
              />
              {musicaPreviewUrl && (
                <div style={assetPreviewLine}>
                  <span>Música carregada</span>
                  <button
                    type="button"
                    style={linkButton}
                    onClick={() => {
                      setMusicaPreviewUrl("");
                      setMusicaTocando(false);
                    }}
                  >
                    remover
                  </button>
                </div>
              )}
            </label>

            {musicaPreviewUrl && (
              <audio
                controls
                loop
                src={musicaPreviewUrl}
                style={{ width: "100%" }}
                onPlay={() => setMusicaTocando(true)}
                onPause={() => setMusicaTocando(false)}
              />
            )}

            <button
              style={smallButton}
              onClick={async () => {
                const ok = await salvarConfiguracaoVisual();
                if (ok) alert("Arquivos e visual salvos no modelo.");
              }}
            >
              Salvar arquivos no modelo
            </button>

            <button
              style={smallButton}
              onClick={() => {
                setBackgroundPreviewUrl("");
                setBackgroundX(0);
                setBackgroundY(0);
                setBackgroundScale(1);
                setBackgroundOpacity(1);
                setGlassOpacity(0.18);
                setGlassBlur(0);
                setGlassTone("dark");
                setLogoPreviewUrl("");
                setMusicaPreviewUrl("");
                setMusicaTocando(false);
                setBackgroundEffect("none");
                setConfirmationEffect("padrao");
                setBlockEffects({});
              }}
            >
              Limpar arquivos
            </button>
          </div>

          <div style={divider} />

          <h2 style={panelTitle}>Bloco selecionado</h2>

          {!selectedBlock ? (
            <div style={emptyBox}>
              Clique em qualquer bloco no convite para editar, mover ou
              redimensionar.
              <br />
              <br />
              Componentes criam blocos novos. Variáveis entram dentro de textos.
            </div>
          ) : (
            <div style={editStack}>
              <div style={selectedSummary}>
                <strong>{selectedBlock.label || selectedBlock.type}</strong>
                <span>
                  {Math.round(selectedBlock.width)}×
                  {Math.round(selectedBlock.height)} px
                </span>
              </div>

              <label style={field}>
                <span style={label}>Efeito opcional do bloco</span>
                <select
                  value={blockEffects[selectedBlock.id] || "none"}
                  onChange={(e) =>
                    setBlockEffects((current) => ({
                      ...current,
                      [selectedBlock.id]: e.target.value as EffectType,
                    }))
                  }
                  style={input}
                >
                  {EFFECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div style={quickControls}>
                <button
                  style={quickButton}
                  onClick={() => moverSelecionado(0, -10)}
                >
                  ↑
                </button>
                <button
                  style={quickButton}
                  onClick={() => moverSelecionado(-10, 0)}
                >
                  ←
                </button>
                <button
                  style={quickButton}
                  onClick={() => moverSelecionado(10, 0)}
                >
                  →
                </button>
                <button
                  style={quickButton}
                  onClick={() => moverSelecionado(0, 10)}
                >
                  ↓
                </button>
                {selectedBlock.type !== "logo" && (
                  <>
                    <button
                      style={quickButton}
                      onClick={() => redimensionarSelecionado(-10)}
                    >
                      Tamanho -
                    </button>
                    <button
                      style={quickButton}
                      onClick={() => redimensionarSelecionado(10)}
                    >
                      Tamanho +
                    </button>
                  </>
                )}
              </div>

              <label style={field}>
                <span style={label}>Conteúdo / variável</span>
                <textarea
                  value={selectedBlock.content || ""}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { content: e.target.value })
                  }
                  style={textarea}
                />
              </label>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>Fonte</span>
                  <input
                    type="number"
                    min={8}
                    max={120}
                    value={selectedBlock.font_size}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        font_size: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Arredondar</span>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={selectedBlock.border_radius}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        border_radius: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={smallButton}
                  onClick={() =>
                    updateBlock(selectedBlock.id, {
                      font_size: Math.max(8, selectedBlock.font_size - 2),
                    })
                  }
                >
                  A-
                </button>
                <button
                  style={smallButton}
                  onClick={() =>
                    updateBlock(selectedBlock.id, {
                      font_size: Math.min(140, selectedBlock.font_size + 2),
                    })
                  }
                >
                  A+
                </button>
                <button style={smallButton} onClick={bringForward}>
                  Frente
                </button>
              </div>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>Cor do texto</span>
                  <input
                    type="color"
                    value={selectedBlock.color || "#ffffff"}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { color: e.target.value })
                    }
                    style={colorInput}
                  />
                </label>

                <div style={field}>
                  <span style={label}>Fundo do box</span>
                  <div style={backgroundPickerBox}>
                    <input
                      type="color"
                      value={selectedBackground.hex}
                      onChange={(e) =>
                        updateSelectedBackground(
                          e.target.value,
                          selectedBackground.enabled
                            ? selectedBackground.opacity
                            : 100,
                        )
                      }
                      style={colorInput}
                    />
                    <div
                      style={{
                        ...backgroundPreviewSwatch,
                        background: selectedBackground.enabled
                          ? hexToRgba(
                              selectedBackground.hex,
                              selectedBackground.opacity,
                            )
                          : "transparent",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={assetControlBox}>
                <div style={opacityHeader}>
                  <strong style={{ fontSize: 12 }}>Transparência do fundo</strong>
                  <span style={opacityBadge}>
                    {selectedBackground.enabled
                      ? `${100 - selectedBackground.opacity}% transparente`
                      : "Sem fundo"}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedBackground.enabled ? selectedBackground.opacity : 0}
                  onChange={(e) =>
                    updateSelectedBackground(
                      selectedBackground.hex,
                      Number(e.target.value),
                    )
                  }
                />

                <div style={backgroundActions}>
                  <span style={backgroundValueText}>
                    {selectedBackground.enabled
                      ? `Opacidade ${selectedBackground.opacity}%`
                      : "Fundo transparente"}
                  </span>
                  <button
                    type="button"
                    style={linkButton}
                    onClick={clearSelectedBackground}
                  >
                    remover fundo
                  </button>
                </div>
              </div>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>X</span>
                  <input
                    type="number"
                    value={selectedBlock.x}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        x: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Y</span>
                  <input
                    type="number"
                    value={selectedBlock.y}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        y: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>
              </div>

              {selectedBlock.type !== "logo" && (
                <div style={twoCols}>
                  <label style={field}>
                    <span style={label}>Largura</span>
                    <input
                      type="number"
                      value={selectedBlock.width}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          width: Number(e.target.value),
                        })
                      }
                      style={input}
                    />
                  </label>

                  <label style={field}>
                    <span style={label}>Altura</span>
                    <input
                      type="number"
                      value={selectedBlock.height}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          height: Number(e.target.value),
                        })
                      }
                      style={input}
                    />
                  </label>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={smallButton} onClick={duplicateSelected}>
                  Duplicar
                </button>
                <button
                  style={{
                    ...smallButton,
                    background: "#fee2e2",
                    color: "#991b1b",
                  }}
                  onClick={deleteSelected}
                >
                  Excluir
                </button>
              </div>
            </div>
          )}

          <div style={divider} />

          <h2 style={panelTitle}>Variáveis dinâmicas</h2>
          <div style={componentHint}>
            Variáveis = textos automáticos que o sistema troca pelos dados reais
            do evento/convidado.
          </div>
          <div style={variables}>
            {[
              "{{nome_evento}}",
              "{{nome_convidado}}",
              "{{data_evento}}",
              "{{hora_evento}}",
              "{{hora_termino}}",
              "{{horario_termino}}",
              "{{data_termino}}",
              "{{dias_para_evento}}",
              "{{contador_evento}}",
              "{{local_evento}}",
              "{{endereco_evento}}",
              "{{logo_evento}}",
              "{{qr_code}}",
              "{{link_rsvp}}",
              "{{google_maps_url}}",
              "{{waze_url}}",
              "{{calendario_url}}",
              "{{total_convidados}}",
              "{{texto_total_convidados}}",
            ].map((v) => (
              <button
                key={v}
                style={variablePill}
                onClick={() => {
                  if (!selectedBlock) return;
                  updateBlock(selectedBlock.id, {
                    content: `${selectedBlock.content || ""}${v}`,
                  });
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </aside>

        <section style={canvasArea}>
          <div style={canvasTip}>
            {previewAoVivo
              ? "Preview ao vivo: visual limpo, sem edição."
              : "Modo edição: clique em um bloco, arraste para mover e puxe as bordas para aumentar/diminuir."}
          </div>

          {loading ? (
            <div style={emptyBox}>Carregando editor...</div>
          ) : (
            <div style={phoneFrame}>
              {previewAoVivo ? (
                <div style={{ width: CANVAS_W, height: CANVAS_H, position: "relative" }}>
                  <ConviteVisualRenderer
                    blocks={blocks}
                    backgroundUrl={backgroundPreviewUrl}
                    logoUrl={logoPreviewUrl}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    scale={1}
                    backgroundX={backgroundX}
                    backgroundY={backgroundY}
                    backgroundScale={backgroundScale}
                    backgroundOpacity={backgroundOpacity}
                    glassOpacity={glassOpacity}
                    glassBlur={glassBlur}
                    glassTone={glassTone}
                    blockEffects={blockEffects}
                    evento={{
                      nome_evento: DEMO_EVENTO.nome_evento,
                      nome_convidado: DEMO_EVENTO.nome_convidado,
                      data_evento: DEMO_EVENTO.data_evento,
                      hora_evento: DEMO_EVENTO.hora_evento,
                      horario_evento: DEMO_EVENTO.hora_evento,
                      hora_termino: DEMO_EVENTO.hora_termino,
                      horario_termino: DEMO_EVENTO.horario_termino,
                      hora_termino_evento: DEMO_EVENTO.hora_termino_evento,
                      data_termino: DEMO_EVENTO.data_termino,
                      local_evento: DEMO_EVENTO.local_evento,
                      endereco_evento: DEMO_EVENTO.endereco_evento,
                      total_convidados: "4",
                      convidados_quantidade: "4",
                      texto_total_convidados: "Convite para 4 convidados",
                    } as any}
                  />

                  {musicaPreviewUrl && (
                    <div style={musicBadge}>
                      {musicaTocando ? "♪ Música tocando" : "♪ Música disponível"}
                    </div>
                  )}
                </div>
              ) : (
                <div style={canvas}>
                  {backgroundPreviewUrl && (
                    <img
                      src={backgroundPreviewUrl}
                      alt="Background do convite"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: CANVAS_W,
                        height: CANVAS_H,
                        objectFit: "cover",
                        transform: `translate(calc(-50% + ${backgroundX}px), calc(-50% + ${backgroundY}px)) scale(${backgroundScale})`,
                        opacity: backgroundOpacity,
                        zIndex: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                        filter:
                          backgroundEffect === "parallax"
                            ? "saturate(1.04) contrast(1.02)"
                            : undefined,
                        transition: "transform 220ms ease, filter 220ms ease",
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
                    }}
                  />

                  {blocks
                    .filter((b) => b.visible)
                    .sort((a, b) => a.z_index - b.z_index)
                    .map((block) => {
                      const selected = selectedId === block.id;

                      return (
                        <Rnd
                          key={block.id}
                          lockAspectRatio={block.type === "logo"}
                          size={{
                            width: block.width,
                            height: block.height,
                          }}
                          position={{
                            x: block.x,
                            y: block.y,
                          }}
                          bounds="parent"
                          onMouseDown={() => setSelectedId(block.id)}
                          onDragStop={(_, d) => {
                            updateBlock(block.id, {
                              x: Math.round(d.x),
                              y: Math.round(d.y),
                            });
                          }}
                          onResizeStop={(_, __, ref, ___, position) => {
                            updateBlock(block.id, {
                              width: Math.round(ref.offsetWidth),
                              height: Math.round(ref.offsetHeight),
                              x: Math.round(position.x),
                              y: Math.round(position.y),
                            });
                          }}
                          style={{
                            zIndex: block.z_index,
                          }}
                        >
                          {renderBlock(
                            block,
                            selected,
                            (content) => updateBlock(block.id, { content }),
                            logoPreviewUrl,
                            blockEffects[block.id] || "none",
                          )}
                        </Rnd>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 20% 0%, #f5f3ff 0, transparent 36%), #eef2ff",
  color: "#0f172a",
  padding: 24,
};

const topbar: CSSProperties = {
  background: "rgba(255,255,255,.9)",
  border: "1px solid #dbe3ef",
  borderRadius: 24,
  padding: 22,
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
};

const eyebrow: CSSProperties = {
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: ".12em",
};

const title: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: "-.04em",
};

const subtitle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontWeight: 700,
};

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: 18,
  alignItems: "start",
};

const panel: CSSProperties = {
  background: "rgba(255,255,255,.92)",
  border: "1px solid #dbe3ef",
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
  position: "sticky",
  top: 18,
  maxHeight: "calc(100vh - 36px)",
  overflow: "auto",
};

const panelTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 16,
};

const componentHint: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  margin: "-4px 0 10px",
  lineHeight: 1.35,
};

const blockList: CSSProperties = {
  display: "grid",
  gap: 8,
};

const blockListItem: CSSProperties = {
  minHeight: 38,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "0 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  cursor: "pointer",
  fontWeight: 900,
};

const blockListItemActive: CSSProperties = {
  ...blockListItem,
  borderColor: "#7c3aed",
  background: "#f5f3ff",
  color: "#6d28d9",
};

const selectedSummary: CSSProperties = {
  border: "1px solid #ddd6fe",
  borderRadius: 14,
  padding: 12,
  background: "#f5f3ff",
  color: "#4c1d95",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 13,
};

const quickControls: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
};

const quickButton: CSSProperties = {
  minHeight: 34,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const componentGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const divider: CSSProperties = {
  height: 1,
  background: "#e2e8f0",
  margin: "18px 0",
};

const emptyBox: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 16,
  padding: 18,
  color: "#64748b",
  background: "#f8fafc",
  textAlign: "center",
};

const editStack: CSSProperties = {
  display: "grid",
  gap: 12,
};

const field: CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: CSSProperties = {
  fontSize: 12,
  color: "#475569",
  fontWeight: 900,
};

const input: CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "0 10px",
  boxSizing: "border-box",
};

const textarea: CSSProperties = {
  width: "100%",
  minHeight: 72,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: 10,
  boxSizing: "border-box",
  resize: "vertical",
};

const assetControlBox: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const smallButtonActive: CSSProperties = {
  ...smallButton,
  background: "#7c3aed",
  color: "#ffffff",
  borderColor: "#7c3aed",
};

const fileInput: CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: 9,
  boxSizing: "border-box",
  background: "#ffffff",
  cursor: "pointer",
};

const assetPreviewLine: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
};

const linkButton: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const backgroundPickerBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 44px",
  gap: 8,
  alignItems: "center",
};

const backgroundPreviewSwatch: CSSProperties = {
  width: 40,
  height: 40,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  backgroundImage:
    "linear-gradient(45deg,#e2e8f0 25%,transparent 25%), linear-gradient(-45deg,#e2e8f0 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#e2e8f0 75%), linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
};

const opacityHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const opacityBadge: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#4c1d95",
  fontSize: 11,
  fontWeight: 900,
};

const backgroundActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const backgroundValueText: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const colorInput: CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: 4,
  boxSizing: "border-box",
};

const twoCols: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const variables: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const variablePill: CSSProperties = {
  border: "1px solid #ddd6fe",
  background: "#f5f3ff",
  color: "#6d28d9",
  borderRadius: 999,
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const musicBadge: CSSProperties = {
  position: "absolute",
  top: 18,
  right: 18,
  zIndex: 9999,
  borderRadius: 999,
  padding: "8px 12px",
  background: "rgba(15,23,42,.78)",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 900,
  boxShadow: "0 10px 24px rgba(0,0,0,.22)",
};


const confirmationEffectHint: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "9px 10px",
  background: "#ffffff",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.35,
};

const canvasTip: CSSProperties = {
  marginBottom: 12,
  padding: "10px 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,.86)",
  border: "1px solid #dbe3ef",
  color: "#475569",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 10px 24px rgba(15,23,42,.06)",
};

const canvasArea: CSSProperties = {
  minHeight: "calc(100vh - 160px)",
  display: "grid",
  placeItems: "start center",
  overflow: "auto",
  padding: "18px 0 60px",
};

const phoneFrame: CSSProperties = {
  width: CANVAS_W,
  height: CANVAS_H,
  borderRadius: 34,
  padding: 0,
  background: "#020617",
  boxShadow: "0 34px 90px rgba(15,23,42,.34)",
  overflow: "hidden",
};

const canvas: CSSProperties = {
  width: CANVAS_W,
  height: CANVAS_H,
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 30%), linear-gradient(180deg,#0b1530,#211f63)",
};

