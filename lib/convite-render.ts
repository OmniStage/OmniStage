export type EventoConvite = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  status?: string | null;
  tenant_id?: string | null;
  invite_template_id?: string | null;
  created_at?: string | null;
  horario?: string | null;
  endereco?: string | null;
  mapa_url?: string | null;

  background_image?: string | null;
  background_url?: string | null;
  logo_image?: string | null;
  logo_url?: string | null;
  music_file?: string | null;
  musica_url?: string | null;
};

export type VisualBlock = {
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

export type ConviteTemplateVisual = {
  id: string;
  nome?: string | null;
  name?: string | null;
  editor_mode?: string | null;
  preview_image?: string | null;
  background_image?: string | null;
  logo_image?: string | null;
  visual_config?: any;
};

export function formatarData(data: string | null) {
  if (!data) return "";

  const date = new Date(`${data}T00:00:00`);
  if (Number.isNaN(date.getTime())) return data;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function normalizarHorario(horario: string | null | undefined) {
  if (!horario) return "20:00";

  const match = horario.match(/(\d{1,2})(?::|h)?(\d{2})?/i);
  if (!match) return "20:00";

  const horas = match[1].padStart(2, "0");
  const minutos = (match[2] || "00").padStart(2, "0");

  return `${horas}:${minutos}`;
}

export function formatarHorario(horario: string | null | undefined) {
  if (!horario) return "";

  const [horas, minutos] = normalizarHorario(horario).split(":");
  return minutos === "00" ? `${Number(horas)}h` : `${Number(horas)}h${minutos}`;
}

export function criarDataEvento(evento: EventoConvite | null) {
  if (!evento?.data_evento) return null;

  const horario = normalizarHorario(evento.horario);
  const date = new Date(`${evento.data_evento}T${horario}:00-03:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function calcularCountdown(dataEvento: Date | null) {
  if (!dataEvento) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  const diff = Math.max(0, dataEvento.getTime() - Date.now());
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

export function preencherTemplate(html: string, evento: EventoConvite | null) {
  if (!evento) return html;

  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventoDataIso = dataEvento?.toISOString() || "";
  const countdown = calcularCountdown(dataEvento);

  const backgroundEvento =
    evento.background_url || evento.background_image || "";

  const logoEvento = evento.logo_url || evento.logo_image || "";

  const musicaEvento = evento.musica_url || evento.music_file || "";

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
    hora_evento: horarioFormatado,
    HORA_EVENTO: horarioFormatado,
    horario: horarioFormatado,
    HORARIO: horarioFormatado,

    data_horario_evento: [dataFormatada, horarioFormatado]
      .filter(Boolean)
      .join(" • "),
    DATA_HORARIO_EVENTO: [dataFormatada, horarioFormatado]
      .filter(Boolean)
      .join(" • "),

    local_evento: local,
    LOCAL_EVENTO: local,
    local,
    LOCAL: local,

    endereco_evento: evento.endereco || "",
    ENDERECO_EVENTO: evento.endereco || "",

    mapa_url: evento.mapa_url || "",
    MAPA_URL: evento.mapa_url || "",

    background_image: backgroundEvento,
    BACKGROUND_IMAGE: backgroundEvento,
    background_url: backgroundEvento,
    BACKGROUND_URL: backgroundEvento,
    background_evento: backgroundEvento,
    BACKGROUND_EVENTO: backgroundEvento,

    logo_image: logoEvento,
    LOGO_IMAGE: logoEvento,
    logo_url: logoEvento,
    LOGO_URL: logoEvento,
    logo_evento: logoEvento,
    LOGO_EVENTO: logoEvento,

    music_file: musicaEvento,
    MUSIC_FILE: musicaEvento,
    musica_url: musicaEvento,
    MUSICA_URL: musicaEvento,
    musica_evento: musicaEvento,
    MUSICA_EVENTO: musicaEvento,

    data_iso_evento: eventoDataIso,
    DATA_ISO_EVENTO: eventoDataIso,

    dias_para_evento: String(countdown.dias),
    DIAS_PARA_EVENTO: String(countdown.dias),
    contador_evento: `${pad2(countdown.dias)} ${pad2(countdown.horas)} ${pad2(countdown.minutos)} ${pad2(countdown.segundos)}`,
    CONTADOR_EVENTO: `${pad2(countdown.dias)} ${pad2(countdown.horas)} ${pad2(countdown.minutos)} ${pad2(countdown.segundos)}`,
  };

  const preenchido = Object.entries(valores).reduce((content, [key, value]) => {
    return content.replaceAll(`{{${key}}}`, value || "");
  }, html);

  const htmlBase = preenchido
    .replaceAll("VALENTINA XV", evento.nome || "Evento")
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
      `const EVENT_DATE = new Date(${JSON.stringify(eventoDataIso)});`
    )
    .replace(
      /const EVENT_END = new Date\(["'].*?["']\);/g,
      `const EVENT_END = new Date(${JSON.stringify(
        dataEvento
          ? new Date(dataEvento.getTime() + 4 * 60 * 60 * 1000).toISOString()
          : ""
      )});`
    );

  return aplicarCompatibilidadeTemplate(htmlBase, evento);
}

function cssValue(value: string | null | undefined, fallback = "transparent") {
  return value && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pareceCodigoJavascript(value: string) {
  const texto = String(value || "").trim();

  if (!texto) return false;

  return [
    "document.createElement",
    "document.querySelector",
    "appendChild",
    "innerHTML",
    "window.addEventListener",
    "<script",
    "</script>",
    "function ",
    "const ",
    "let ",
    "var ",
  ].some((token) => texto.includes(token));
}

function textoSeguro(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function renderizarConteudoDinamico(
  content: string | null,
  evento: EventoConvite | null
) {
  const preenchido = preencherTemplate(String(content || ""), evento);

  if (pareceCodigoJavascript(preenchido)) {
    return "";
  }

  return textoSeguro(preenchido);
}

function renderizarConteudoBloco(block: VisualBlock, evento: EventoConvite | null) {
  const dataFormatada = formatarData(evento?.data_evento || null);
  const horarioFormatado = formatarHorario(evento?.horario);
  const localEvento = evento?.local || evento?.endereco || "";

  if (block.type === "logo") {
    const logo = evento?.logo_url || evento?.logo_image || "";

    if (logo) {
      return `<img src="${escapeHtml(logo)}" alt="Logo do evento" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:${block.border_radius || 0}px;" />`;
    }

    return `<div style="width:100%;height:100%;display:grid;place-items:center;background:rgba(255,255,255,.12);border-radius:${block.border_radius || 0}px;font-weight:900;">LOGO<br/>EVENTO</div>`;
  }

  if (block.type === "event_name") {
    return textoSeguro(evento?.nome || "Nome do Evento");
  }

  if (block.type === "date_time") {
    return textoSeguro(
      [dataFormatada, horarioFormatado].filter(Boolean).join(" • ")
    );
  }

  if (block.type === "location") {
    return textoSeguro(localEvento || "Local do Evento");
  }

  if (block.type === "guest_name") {
    return textoSeguro("Nome do Convidado");
  }

  if (block.type === "button") {
    return renderizarConteudoDinamico(
      block.content || "CONFIRMAR PRESENÇA",
      evento
    );
  }

  if (block.type === "guest_picker") {
    return `
      <div id="namePicker" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:12px;padding:10px;box-sizing:border-box;">
        <label class="name-option selected" style="display:flex;align-items:center;gap:12px;color:inherit;font-family:inherit;font-size:inherit;font-weight:900;line-height:1.15;">
          <input type="checkbox" checked readonly style="width:20px;height:20px;accent-color:#f7d477;flex-shrink:0;" />
          <span>Nome do Convidado</span>
        </label>
      </div>
    `;
  }

  if (block.type === "qr") {
    return `<div style="width:78%;height:78%;border-radius:8px;background:linear-gradient(90deg,#111 10px,transparent 10px) 0 0/22px 22px,linear-gradient(#111 10px,transparent 10px) 0 0/22px 22px,#fff;"></div>`;
  }

  if (block.type === "divider") return "";

  if (block.type === "countdown") {
    const dataEvento = criarDataEvento(evento);
    const timestamp = dataEvento?.getTime() || 0;
    const countdown = calcularCountdown(dataEvento);
    const uid = `countdown_${String(block.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;

    return `
      <div id="${uid}" data-countdown-target="${timestamp}" style="width:100%;height:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;justify-content:center;gap:8px;">
        ${[
          ["dias", "DIAS", countdown.dias],
          ["horas", "HORAS", countdown.horas],
          ["minutos", "MIN", countdown.minutos],
          ["segundos", "SEG", countdown.segundos],
        ]
          .map(
            ([key, label, value]) => `
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;">
                <strong data-countdown-part="${key}" style="display:block;font-size:${Math.max(block.font_size || 28, 28)}px;line-height:.9;font-weight:950;color:${block.color || "#f7d477"};letter-spacing:.02em;">${pad2(Number(value))}</strong>
                <span style="display:block;margin-top:7px;font-size:${Math.max(8, Math.round((block.font_size || 28) * 0.28))}px;line-height:1;font-weight:950;letter-spacing:.16em;color:#fff;opacity:.86;">${label}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  return renderizarConteudoDinamico(block.content || "", evento);
}

export function renderizarTemplateVisual(
  template: ConviteTemplateVisual,
  blocks: VisualBlock[],
  evento: EventoConvite | null,
) {
  const visualConfig = template.visual_config || {};

  const backgroundEvento =
    evento?.background_url ||
    evento?.background_image ||
    visualConfig.backgroundPreviewUrl ||
    template.background_image ||
    template.preview_image ||
    "";

  const backgroundX = numberValue(visualConfig.backgroundX, 0);
  const backgroundY = numberValue(visualConfig.backgroundY, 0);
  const backgroundScale = numberValue(visualConfig.backgroundScale, 1);
  const backgroundOpacity = numberValue(visualConfig.backgroundOpacity, 1);
  const glassOpacity = numberValue(visualConfig.glassOpacity, 0.18);
  const glassBlur = numberValue(visualConfig.glassBlur, 0);
  const glassTone = visualConfig.glassTone === "light" ? "light" : "dark";

  const blocosHtml = blocks
    .filter((block) => block.visible !== false)
    .sort((a, b) => (a.z_index || 1) - (b.z_index || 1))
    .map((block) => {
      const isDivider = block.type === "divider";
      const background = cssValue(block.background);
      const padding = isDivider ? 0 : 8;

      return `
        <div
          data-block-type="${escapeHtml(block.type)}"
          style="position:absolute;left:${numberValue(block.x, 0)}px;top:${numberValue(block.y, 0)}px;width:${numberValue(block.width, 200)}px;height:${numberValue(block.height, 60)}px;z-index:${(block.z_index || 1) + 10};box-sizing:border-box;border-radius:${numberValue(block.border_radius, 0)}px;color:${block.color || "#ffffff"};background:${background};font-family:${escapeHtml(block.font_family || "Inter")}, Arial, sans-serif;font-size:${numberValue(block.font_size, 24)}px;font-weight:900;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.12;padding:${padding}px;overflow:hidden;white-space:pre-wrap;"
        >
          ${renderizarConteudoBloco(block, evento)}
        </div>
      `;
    })
    .join("");

  const countdownScript = `
    <script>
      window.addEventListener("DOMContentLoaded", function () {
        function pad2(value) { return String(value).padStart(2, "0"); }

        function updateCountdown(root) {
          var target = Number(root.getAttribute("data-countdown-target") || 0);
          if (!target) return;

          var diff = Math.max(0, target - Date.now());
          var totalSeconds = Math.floor(diff / 1000);
          var values = {
            dias: Math.floor(totalSeconds / 86400),
            horas: Math.floor((totalSeconds % 86400) / 3600),
            minutos: Math.floor((totalSeconds % 3600) / 60),
            segundos: totalSeconds % 60
          };

          Object.keys(values).forEach(function (key) {
            var el = root.querySelector('[data-countdown-part="' + key + '"]');
            if (el) el.textContent = pad2(values[key]);
          });
        }

        var counters = Array.from(document.querySelectorAll("[data-countdown-target]"));
        counters.forEach(updateCountdown);
        if (counters.length) {
          setInterval(function () { counters.forEach(updateCountdown); }, 1000);
        }
      });
    </script>
  `;

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; min-height: 100%; background: #020617; }
          body { display: grid; place-items: center; font-family: Inter, Arial, sans-serif; overflow-x: hidden; }
          .omnistage-phone { width: 430px; height: 920px; max-width: 100vw; max-height: none; position: relative; overflow: hidden; background: radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 30%), linear-gradient(180deg,#0b1530,#211f63); }
          @media (max-width: 460px) { .omnistage-phone { width: 100vw; height: calc(100vw * 2.1395); } .omnistage-canvas { transform: scale(calc(100vw / 430)); transform-origin: top left; } }
        </style>
      </head>
      <body>
        <main class="omnistage-phone">
          <div class="omnistage-canvas" style="width:430px;height:920px;position:absolute;left:0;top:0;overflow:hidden;">
            ${
              backgroundEvento
                ? `<img src="${escapeHtml(backgroundEvento)}" alt="Background" style="position:absolute;left:50%;top:50%;width:430px;height:920px;object-fit:cover;transform:translate(calc(-50% + ${backgroundX}px), calc(-50% + ${backgroundY}px)) scale(${backgroundScale});opacity:${backgroundOpacity};z-index:0;" />`
                : ""
            }
            <div style="position:absolute;inset:0;z-index:1;pointer-events:none;background:${
              glassTone === "light"
                ? `rgba(255,255,255,${glassOpacity})`
                : `rgba(2,6,23,${glassOpacity})`
            };backdrop-filter:${glassBlur ? `blur(${glassBlur}px)` : "none"};"></div>
            ${blocosHtml}
          </div>
        </main>
        ${countdownScript}
      </body>
    </html>
  `;
}

function aplicarCompatibilidadeTemplate(html: string, evento: EventoConvite) {
  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventTimestamp = dataEvento?.getTime() || 0;

  const logoEvento = evento.logo_url || evento.logo_image || "";
  const backgroundEvento =
    evento.background_url || evento.background_image || "";
  const musicaEvento = evento.musica_url || evento.music_file || "";

  const script = `
    <script>
      window.__OMNISTAGE_EVENT__ = ${JSON.stringify({
        nome: evento.nome || "",
        data: dataFormatada,
        horario: horarioFormatado,
        local,
        mapa: evento.mapa_url || "",
        logo: logoEvento,
        fundo: backgroundEvento,
        musica: musicaEvento,
        timestamp: eventTimestamp,
      })};

      window.addEventListener("DOMContentLoaded", function () {
        var eventData = window.__OMNISTAGE_EVENT__ || {};

        function buscarCardPrincipal() {
          return (
            document.querySelector("[data-convite-card]") ||
            document.querySelector(".invite-card") ||
            document.querySelector(".convite-card") ||
            document.querySelector(".card") ||
            document.querySelector("main") ||
            document.body
          );
        }

        function aplicarFundo() {
          var card = buscarCardPrincipal();

          document.documentElement.style.margin = "0";
          document.documentElement.style.background = "#020617";
          document.body.style.margin = "0";
          document.body.style.background = "#020617";
          document.body.style.overflowX = "hidden";

          document
            .querySelectorAll(".card-bg-motion, .background-motion, .bg-motion, [data-bg-evento]")
            .forEach(function (el) {
              el.remove();
            });

          if (!eventData.fundo || !card) return;

          card.style.backgroundImage =
            "linear-gradient(180deg, rgba(12,28,60,0.50), rgba(6,14,36,0.88)), url('" +
            eventData.fundo +
            "')";

          card.style.backgroundSize = "cover";
          card.style.backgroundPosition = "center";
          card.style.backgroundRepeat = "no-repeat";
          card.style.overflow = "hidden";
        }

        function normalizarTexto(value) {
          return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
        }

        function removerTitulosDuplicados() {
          var nomeEvento = normalizarTexto(eventData.nome);
          if (!nomeEvento) return;

          var elementos = Array.from(
            document.querySelectorAll("h1,h2,h3,.title,.event-title,.main-title")
          );

          elementos.forEach(function (el) {
            if (el.querySelector("[data-logo-evento]")) return;
            if (el.getAttribute("data-slot") === "logo") return;

            var texto = normalizarTexto(el.textContent);

            if (
              texto === nomeEvento ||
              texto.includes(nomeEvento) ||
              nomeEvento.includes(texto)
            ) {
              el.remove();
            }
          });
        }

        function aplicarLogo() {
          if (!eventData.logo) return;

          var card = buscarCardPrincipal();
          var slotLogo = document.querySelector('[data-slot="logo"]');

          document.querySelectorAll("[data-logo-evento]").forEach(function (el) {
            el.remove();
          });

          var logo = document.createElement("img");
          logo.src = eventData.logo;
          logo.alt = eventData.nome || "Logo do evento";
          logo.setAttribute("data-logo-evento", "true");

          logo.style.display = "block";
          logo.style.width = "72%";
          logo.style.maxWidth = "420px";
          logo.style.height = "auto";
          logo.style.maxHeight = "170px";
          logo.style.objectFit = "contain";
          logo.style.margin = "18px auto";
          logo.style.position = "relative";
          logo.style.zIndex = "20";

          if (slotLogo) {
            slotLogo.innerHTML = "";
            slotLogo.appendChild(logo);
            return;
          }

          var nomeEvento = normalizarTexto(eventData.nome);
          var candidatos = Array.from(
            document.querySelectorAll("h1,h2,h3,.title,.event-title,.main-title")
          );

          var tituloEncontrado = candidatos.find(function (el) {
            if (el.querySelector("[data-logo-evento]")) return false;
            if (el.getAttribute("data-slot") === "logo") return false;

            var texto = normalizarTexto(el.textContent);
            if (!texto) return false;

            return (
              texto === nomeEvento ||
              texto.includes(nomeEvento) ||
              texto.includes("valentina") ||
              texto.includes("theo") ||
              texto.includes("anos") ||
              texto.includes("convite")
            );
          });

          if (tituloEncontrado) {
            tituloEncontrado.innerHTML = "";
            tituloEncontrado.appendChild(logo);
            return;
          }

          removerTitulosDuplicados();

          if (card) {
            card.insertBefore(logo, card.firstChild);
          }
        }

        function aplicarLinks() {
          var mapsLink = document.getElementById("mapsLink");
          var calendarLink = document.getElementById("calendarLink");

          if (mapsLink && eventData.mapa) {
            mapsLink.href = eventData.mapa;
          }

          if (calendarLink && eventData.nome && eventData.timestamp) {
            var start = new Date(eventData.timestamp);
            var end = new Date(eventData.timestamp + 4 * 60 * 60 * 1000);

            function toGoogleDate(date) {
              return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
            }

            calendarLink.href =
              "https://calendar.google.com/calendar/render?action=TEMPLATE" +
              "&text=" + encodeURIComponent(eventData.nome) +
              "&dates=" + toGoogleDate(start) + "/" + toGoogleDate(end) +
              "&location=" + encodeURIComponent(eventData.local || "");
          }
        }

        function aplicarMusica() {
          var musicSource = document.querySelector("#bgMusic source");
          var musicAudio = document.getElementById("bgMusic");

          if (musicSource && eventData.musica) {
            musicSource.setAttribute("src", eventData.musica);
            if (musicAudio && musicAudio.load) musicAudio.load();
          }
        }

        aplicarFundo();
        aplicarLogo();
        aplicarLinks();
        aplicarMusica();
      });
    </script>
  `;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

export function injetarConvidadosNoConvite(
  html: string,
  nomesDoConvite: string[]
) {
  const nomesLimpos = nomesDoConvite
    .map((nome) => String(nome || "").trim())
    .filter(Boolean);

  const isGrupo = nomesLimpos.length > 1;
  const nomeIndividual = nomesLimpos[0] || "Convidado";

  const nomesHtml = nomesLimpos
    .map(
      (nome) => `
        <label class="name-option selected">
          <input type="checkbox" checked name="guest-confirmation" />
          <span>${escapeHtml(nome)}</span>
        </label>
      `
    )
    .join("");

  const script = `
    <script>
      window.__OMNISTAGE_GUESTS__ = ${JSON.stringify(nomesLimpos)};

      window.addEventListener("DOMContentLoaded", function () {
        var nomes = window.__OMNISTAGE_GUESTS__ || [];
        var isGrupo = nomes.length > 1;
        var nomeIndividual = nomes[0] || "Convidado";

        var guestName = document.getElementById("guestName");
        if (guestName) {
          if (isGrupo) {
            guestName.textContent = "";
            guestName.style.display = "none";
          } else {
            guestName.textContent = nomeIndividual;
            guestName.style.display = "";
            guestName.classList.remove("hidden");
          }
        }

        var picker = document.getElementById("namePicker");
        if (picker) {
          if (isGrupo) {
            picker.innerHTML = ${JSON.stringify(nomesHtml)};
            picker.style.display = "block";
            picker.classList.remove("hidden");
          } else {
            picker.innerHTML = "";
            picker.style.display = "none";
            picker.classList.add("hidden");
          }
        }

        var hint = document.getElementById("hintText");
        if (hint) {
          hint.textContent = isGrupo
            ? "Selecione os nomes para confirmar presença"
            : "Confirme sua presença";
          hint.style.display = "block";
          hint.classList.remove("hidden");
        }

        var status = document.getElementById("statusMessage");
        if (status) {
          status.textContent = "";
          status.style.display = "";
        }

        var confirmBtn = document.getElementById("confirmBtn");
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.style.pointerEvents = "auto";
          confirmBtn.style.display = "";
        }

        var options = document.querySelectorAll(".name-option");
        options.forEach(function(option) {
          option.style.display = isGrupo ? "flex" : "none";
          if (isGrupo) option.classList.remove("hidden");
          else option.classList.add("hidden");
        });

        var inputs = document.querySelectorAll('input[name="guest-confirmation"]');
        inputs.forEach(function(input) {
          input.style.display = isGrupo ? "" : "none";
          input.checked = true;
        });
      });
    </script>
  `;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
