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

type VisualBlock = {
  id: string;
  template_id: string;
  type: string;
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
      .select("id,nome,token,evento_id,grupo,tipo_convite")
      .eq("token", tokenDecodificado)
      .maybeSingle();

    if (!convidado) {
      setHtmlFinal(htmlErro("Convite não encontrado."));
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
      .eq("id", convidado.evento_id)
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

    let nomesDoConvite = [convidado.nome];

    if (convidado.grupo && convidado.tipo_convite === "grupo") {
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

    let htmlDoEvento = "";

    if (template.editor_mode === "visual") {
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

      htmlDoEvento = renderizarConviteVisual(
        template as Template,
        evento as Evento,
        (blocksData || []) as VisualBlock[],
        nomesDoConvite,
      );
    } else if (template.html_template) {
      htmlDoEvento = preencherTemplate(
        template.html_template,
        evento as Evento,
      );
      htmlDoEvento = injetarConvidadosNoConvite(htmlDoEvento, nomesDoConvite);
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

function renderizarConviteVisual(
  template: Template,
  evento: Evento,
  blocks: VisualBlock[],
  nomesDoConvite: string[],
) {
  const visualConfig = template.visual_config || {};
  const background =
    evento.background_url ||
    evento.background_image ||
    visualConfig.backgroundPreviewUrl ||
    template.background_image ||
    template.preview_image ||
    "";

  const logo =
    evento.logo_url ||
    evento.logo_image ||
    visualConfig.logoPreviewUrl ||
    template.logo_image ||
    "";

  const musica =
    evento.musica_url ||
    evento.music_file ||
    visualConfig.musicaPreviewUrl ||
    "";

  const dataEvento = evento.data_evento || "";
  const horarioEvento = evento.horario || "00:00";

  const blocksVisiveis = blocks
    .filter((block) => block.visible !== false)
    .sort((a, b) => (a.z_index || 1) - (b.z_index || 1));

  const hasGuestPicker = blocksVisiveis.some(
    (block) => block.type === "guest_picker",
  );

  const blocksHtml = blocksVisiveis
    .map((block) => renderBlockVisual(block, evento, logo))
    .join("");

  const nomesHtml = nomesDoConvite
    .map(
      (nome) => `
        <label class="name-option selected">
          <input type="checkbox" checked name="guest-confirmation" />
          <span>${escapeHtml(nome)}</span>
        </label>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(evento.nome || "Convite digital")}</title>

        <style>
          * { box-sizing: border-box; }

          html, body {
            margin: 0;
            min-height: 100%;
            background: #020617;
            font-family: Arial, sans-serif;
          }

          body {
            display: grid;
            place-items: center;
            overflow-x: hidden;
          }

          .phone-wrap {
            width: min(100vw, 430px);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            background: #020617;
          }

          .invite-card {
            position: relative;
            width: 430px;
            min-height: 920px;
            overflow: hidden;
            background:
              radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 30%),
              linear-gradient(180deg,#0b1530,#211f63);
            color: #ffffff;
          }

          .invite-bg {
            position: absolute;
            inset: 0;
            z-index: 0;
            background-image: url("${safeCssUrl(background)}");
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            opacity: ${Number(visualConfig.backgroundOpacity ?? 1)};
            transform:
              translate(${Number(visualConfig.backgroundX || 0)}px, ${Number(
                visualConfig.backgroundY || 0,
              )}px)
              scale(${Number(visualConfig.backgroundScale || 1)});
            transform-origin: center;
          }

          .invite-glass {
            position: absolute;
            inset: 0;
            z-index: 1;
            background: ${
              visualConfig.glassTone === "light"
                ? `rgba(255,255,255,${Number(visualConfig.glassOpacity ?? 0.18)})`
                : `rgba(2,6,23,${Number(visualConfig.glassOpacity ?? 0.18)})`
            };
            backdrop-filter: blur(${Number(visualConfig.glassBlur || 0)}px);
            pointer-events: none;
          }

          .visual-block {
            position: absolute;
            box-sizing: border-box;
            white-space: pre-wrap;
            overflow: hidden;
          }

          .visual-block img {
            max-width: 100%;
            max-height: 100%;
          }

          .countdown-grid {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .countdown-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 0;
          }

          .countdown-number {
            display: block;
            line-height: .9;
            font-weight: 950;
            letter-spacing: .02em;
          }

          .countdown-label {
            display: block;
            margin-top: 7px;
            line-height: 1;
            font-weight: 950;
            letter-spacing: .16em;
            color: #ffffff;
            opacity: .88;
          }

          .guest-box {
            position: absolute;
            left: 28px;
            right: 28px;
            bottom: 82px;
            z-index: 999;
            padding: 18px 20px;
            border-radius: 22px;
            background: rgba(15,23,42,.56);
            border: 1px solid rgba(255,255,255,.18);
            backdrop-filter: blur(10px);
          }

          .name-option {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #ffffff;
            font-weight: 900;
            font-size: 20px;
            margin: 10px 0;
          }

          .name-option input {
            width: 22px;
            height: 22px;
            accent-color: #f7d477;
          }

          .hint-text {
            position: absolute;
            left: 28px;
            right: 28px;
            bottom: 42px;
            z-index: 999;
            text-align: center;
            color: rgba(255,255,255,.88);
            font-weight: 800;
            font-size: 15px;
          }

          .confirm-btn {
            position: absolute;
            left: 58px;
            right: 58px;
            bottom: 14px;
            z-index: 999;
            height: 46px;
            border: 0;
            border-radius: 999px;
            background: linear-gradient(135deg,#22c55e,#16a34a);
            color: #ffffff;
            font-weight: 950;
            font-size: 15px;
          }
        </style>
      </head>

      <body>
        <div class="phone-wrap">
          <main class="invite-card" data-convite-card>
            ${background ? `<div class="invite-bg"></div>` : ""}
            <div class="invite-glass"></div>

            ${blocksHtml}

            ${
              hasGuestPicker
                ? ""
                : `
                  <section class="guest-box" id="namePicker">
                    ${nomesHtml}
                  </section>

                  <div class="hint-text" id="hintText">
                    Selecione os nomes para confirmar presença
                  </div>
                `
            }

            <button class="confirm-btn" id="confirmBtn">
              CONFIRMAR PRESENÇA
            </button>

            ${
              musica
                ? `<audio id="bgMusic" loop preload="auto"><source src="${escapeAttr(
                    musica,
                  )}" /></audio>`
                : ""
            }
          </main>
        </div>

        <script>
          window.__OMNISTAGE_EVENT_DATE__ = ${JSON.stringify(dataEvento)};
          window.__OMNISTAGE_EVENT_TIME__ = ${JSON.stringify(horarioEvento)};

          function normalizarHorario(horario) {
            var value = String(horario || "00:00")
              .trim()
              .toLowerCase()
              .replace("h", ":")
              .replace(/\\s/g, "");

            if (/^\\d{2}:\\d{2}$/.test(value)) return value;
            if (/^\\d{1}:\\d{2}$/.test(value)) return "0" + value;
            if (/^\\d{2}$/.test(value)) return value + ":00";
            if (/^\\d{1}$/.test(value)) return "0" + value + ":00";

            return "00:00";
          }

          function pad2(value) {
            return String(value).padStart(2, "0");
          }

          function updateCountdown() {
            var dataEvento = window.__OMNISTAGE_EVENT_DATE__;
            var horarioEvento = normalizarHorario(window.__OMNISTAGE_EVENT_TIME__);

            if (!dataEvento) return;

            var target = new Date(dataEvento + "T" + horarioEvento + ":00-03:00");
            var now = new Date();

            if (isNaN(target.getTime())) return;

            var diff = Math.max(0, target.getTime() - now.getTime());
            var totalSeconds = Math.floor(diff / 1000);

            var dias = Math.floor(totalSeconds / 86400);
            var horas = Math.floor((totalSeconds % 86400) / 3600);
            var minutos = Math.floor((totalSeconds % 3600) / 60);
            var segundos = totalSeconds % 60;

            document.querySelectorAll("[data-countdown-dias]").forEach(function(el) {
              el.textContent = pad2(dias);
            });

            document.querySelectorAll("[data-countdown-horas]").forEach(function(el) {
              el.textContent = pad2(horas);
            });

            document.querySelectorAll("[data-countdown-minutos]").forEach(function(el) {
              el.textContent = pad2(minutos);
            });

            document.querySelectorAll("[data-countdown-segundos]").forEach(function(el) {
              el.textContent = pad2(segundos);
            });
          }

          updateCountdown();
          setInterval(updateCountdown, 1000);
        </script>
      </body>
    </html>
  `;
}

function renderBlockVisual(
  block: VisualBlock,
  evento: Evento,
  logoEvento: string,
) {
  const style = `
    left:${Number(block.x || 0)}px;
    top:${Number(block.y || 0)}px;
    width:${Number(block.width || 0)}px;
    height:${Number(block.height || 0)}px;
    z-index:${Number(block.z_index || 1) + 10};
    border-radius:${Number(block.border_radius || 0)}px;
    color:${escapeCssValue(block.color || "#ffffff")};
    background:${escapeCssValue(block.background || "transparent")};
    font-family:${escapeCssValue(block.font_family || "Arial")};
    font-size:${Number(block.font_size || 24)}px;
    font-weight:900;
    display:flex;
    align-items:center;
    justify-content:center;
    text-align:center;
    line-height:1.12;
    padding:${block.type === "divider" ? 0 : 8}px;
  `;

  if (block.type === "logo") {
    return `
      <div class="visual-block" style="${style}">
        ${
          logoEvento
            ? `<img src="${escapeAttr(logoEvento)}" alt="Logo do evento" style="width:100%;height:100%;object-fit:contain;display:block;" />`
            : ""
        }
      </div>
    `;
  }

  if (block.type === "countdown") {
    const numberSize = Math.max(Number(block.font_size || 42), 28);
    const labelSize = Math.max(8, Math.round(numberSize * 0.28));

    return `
      <div class="visual-block" style="${style}">
        <div class="countdown-grid">
          <div class="countdown-item">
            <strong class="countdown-number" data-countdown-dias style="font-size:${numberSize}px;color:${escapeCssValue(
              block.color || "#f7d477",
            )};">00</strong>
            <span class="countdown-label" style="font-size:${labelSize}px;">DIAS</span>
          </div>

          <div class="countdown-item">
            <strong class="countdown-number" data-countdown-horas style="font-size:${numberSize}px;color:${escapeCssValue(
              block.color || "#f7d477",
            )};">00</strong>
            <span class="countdown-label" style="font-size:${labelSize}px;">HORAS</span>
          </div>

          <div class="countdown-item">
            <strong class="countdown-number" data-countdown-minutos style="font-size:${numberSize}px;color:${escapeCssValue(
              block.color || "#f7d477",
            )};">00</strong>
            <span class="countdown-label" style="font-size:${labelSize}px;">MIN</span>
          </div>

          <div class="countdown-item">
            <strong class="countdown-number" data-countdown-segundos style="font-size:${numberSize}px;color:${escapeCssValue(
              block.color || "#f7d477",
            )};">00</strong>
            <span class="countdown-label" style="font-size:${labelSize}px;">SEG</span>
          </div>
        </div>
      </div>
    `;
  }

  if (block.type === "guest_picker") {
    const nomesHtml = nomesDoConvite
      .map(
        (nome) => `
          <label class="name-option selected">
            <input type="checkbox" checked name="guest-confirmation" />
            <span>${escapeHtml(nome)}</span>
          </label>
        `,
      )
      .join("");

    return `
      <div class="visual-block guest-picker-block" id="namePicker" style="${style}">
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:14px;padding:10px;box-sizing:border-box;">
          ${nomesHtml}
        </div>
      </div>
    `;
  }

  if (block.type === "qr") {
    return `
      <div class="visual-block" style="${style}">
        <div style="width:78%;height:78%;border-radius:8px;background:#fff;"></div>
      </div>
    `;
  }

  if (block.type === "divider") {
    return `<div class="visual-block" style="${style}"></div>`;
  }

  return `
    <div class="visual-block" style="${style}">
      ${escapeHtml(preencherTextoBloco(block.content || "", evento))}
    </div>
  `;
}

function preencherTextoBloco(content: string, evento: Evento) {
  const dataFormatada = formatarDataBR(evento.data_evento);
  const horarioFormatado = formatarHorarioBR(evento.horario);
  const local = evento.local || evento.endereco || "";

  return String(content || "")
    .replaceAll("{{nome_evento}}", evento.nome || "")
    .replaceAll("{{nome_convidado}}", "")
    .replaceAll("{{data_evento}}", dataFormatada)
    .replaceAll("{{hora_evento}}", horarioFormatado)
    .replaceAll("{{horario_evento}}", horarioFormatado)
    .replaceAll("{{local_evento}}", local)
    .replaceAll("{{endereco_evento}}", evento.endereco || "")
    .replaceAll("{{link_rsvp}}", "Confirmar presença")
    .replaceAll("{{qr_code}}", "QR")
    .replaceAll("{{logo_evento}}", "");
}

function formatarDataBR(data: string | null | undefined) {
  if (!data) return "";

  const date = new Date(`${data}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return data;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatarHorarioBR(horario: string | null | undefined) {
  if (!horario) return "";

  const match = String(horario).match(/(\d{1,2})(?::|h)?(\d{2})?/i);
  if (!match) return horario;

  const horas = match[1].padStart(2, "0");
  const minutos = (match[2] || "00").padStart(2, "0");

  return minutos === "00" ? `${Number(horas)}h` : `${Number(horas)}h${minutos}`;
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
