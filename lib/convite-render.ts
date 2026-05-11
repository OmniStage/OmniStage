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

  link_rsvp?: string | null;
  link_convite?: string | null;
  google_maps_url?: string | null;
  waze_url?: string | null;
  total_convidados?: number | null;
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

  // Formato curto igual ao admin: DD/MM/YYYY
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
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

function calcularDiasParaEvento(dataEvento: string | null | undefined): number {
  if (!dataEvento) return 0;
  const date = new Date(`${dataEvento}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

function criarTextoBuscaLocal(evento: EventoConvite | null) {
  if (!evento) return "";
  return [evento.local, evento.endereco].filter(Boolean).join(" ").trim();
}

function criarMapsUrl(evento: EventoConvite | null) {
  if (!evento) return "";
  if (evento.google_maps_url) return evento.google_maps_url;
  if (evento.mapa_url) return evento.mapa_url;

  const query = criarTextoBuscaLocal(evento);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
}

function criarWazeUrl(evento: EventoConvite | null) {
  if (!evento) return "";
  if (evento.waze_url) return evento.waze_url;

  const query = criarTextoBuscaLocal(evento);
  return query ? `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes` : "";
}

function criarCalendarUrl(evento: EventoConvite | null) {
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
  const details = evento.link_convite
    ? `Convite digital: ${evento.link_convite}`
    : "Convite digital OmniStage";

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

  if (
    texto.includes("waze") ||
    texto.includes("trânsito") ||
    texto.includes("transito")
  ) {
    return "waze";
  }

  if (
    texto.includes("localização") ||
    texto.includes("localizacao") ||
    texto.includes("localização") ||
    texto.includes("mapa") ||
    texto.includes("google maps") ||
    texto.includes("ver local")
  ) {
    return "maps";
  }

  if (
    texto.includes("calendário") ||
    texto.includes("calendario") ||
    texto.includes("agenda")
  ) {
    return "calendar";
  }

  if (
    texto.includes("confirmar") ||
    texto.includes("presença") ||
    texto.includes("presenca") ||
    texto.includes("rsvp")
  ) {
    return "rsvp";
  }

  return "none";
}

function renderizarBotaoAcao(block: VisualBlock, evento: EventoConvite | null) {
  const acao = detectarAcaoBotao(block.content);

  const labelCalculado = renderizarConteudoDinamico(
    block.content || ""
  , evento);

  const fallbackLabel =
    acao === "maps"
      ? "Ver localização"
      : acao === "waze"
        ? "Abrir no Waze"
        : acao === "calendar"
          ? "Adicionar ao calendário"
          : "Confirmar presença";

  const label = String(labelCalculado || "").trim() ? labelCalculado : fallbackLabel;

  const href =
    acao === "waze"
      ? criarWazeUrl(evento)
      : acao === "maps"
        ? criarMapsUrl(evento)
        : acao === "calendar"
          ? criarCalendarUrl(evento)
          : acao === "rsvp"
            ? evento?.link_rsvp || "#confirmar-presenca"
            : "";

  if (href) {
    return `<a id="${acao === "rsvp" ? "confirmBtn" : acao + "Link"}" href="${escapeHtml(href)}" target="${acao === "rsvp" ? "_self" : "_blank"}" rel="noopener noreferrer" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;color:inherit;font:inherit;font-weight:inherit;border-radius:inherit;">${label}</a>`;
  }

  return `<button id="confirmBtn" type="button" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;border:0;background:transparent;color:inherit;font:inherit;font-weight:inherit;border-radius:inherit;cursor:pointer;">${label}</button>`;
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

    mapa_url: criarMapsUrl(evento),
    MAPA_URL: criarMapsUrl(evento),
    google_maps_url: criarMapsUrl(evento),
    GOOGLE_MAPS_URL: criarMapsUrl(evento),
    waze_url: criarWazeUrl(evento),
    WAZE_URL: criarWazeUrl(evento),
    calendario_url: criarCalendarUrl(evento),
    CALENDARIO_URL: criarCalendarUrl(evento),
    link_rsvp: evento.link_rsvp || "",
    LINK_RSVP: evento.link_rsvp || "",
    link_convite: evento.link_convite || "",
    LINK_CONVITE: evento.link_convite || "",
    total_convidados: String(evento.total_convidados || ""),
    TOTAL_CONVIDADOS: String(evento.total_convidados || ""),
    convidados_quantidade: String(evento.total_convidados || ""),
    CONVIDADOS_QUANTIDADE: String(evento.total_convidados || ""),

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
  // Formatar dados do evento para substituir placeholders
  const dataFormatada = formatarData(evento?.data_evento || null);
  const horarioFormatado = formatarHorario(evento?.horario);
  const localEvento = evento?.local || "";
  const enderecoEvento = evento?.endereco || "";
  const nomeEvento = evento?.nome || "Nome do Evento";
  const diasParaEvento = calcularDiasParaEvento(evento?.data_evento);
  
  // Funcao para substituir placeholders no conteudo (igual ao admin)
  function substituirPlaceholders(content: string): string {
    return String(content || "")
      .replaceAll("{{nome_evento}}", nomeEvento)
      .replaceAll("{{nome_convidado}}", "Nome do Convidado")
      .replaceAll("{{data_evento}}", dataFormatada)
      .replaceAll("{{hora_evento}}", horarioFormatado)
      .replaceAll("{{horario_evento}}", horarioFormatado)
      .replaceAll("{{local_evento}}", localEvento)
      .replaceAll("{{endereco_evento}}", enderecoEvento)
      .replaceAll("{{dias_para_evento}}", String(diasParaEvento))
      .replaceAll("{{contador_evento}}", String(diasParaEvento))
      .replaceAll("{{link_rsvp}}", "Confirmar presença")
      .replaceAll("{{total_convidados}}", "4")
      .replaceAll("{{convidados_quantidade}}", "4")
      .replaceAll("{{texto_total_convidados}}", "Convite para 4 convidados")
      .replaceAll("{{google_maps_url}}", "Ver localização")
      .replaceAll("{{waze_url}}", "Abrir no Waze")
      .replaceAll("{{calendario_url}}", "Adicionar ao calendário")
      .replaceAll("{{qr_code}}", "QR");
  }

  if (block.type === "logo") {
    const logo = evento?.logo_url || evento?.logo_image || "";

    if (logo) {
      return `<img src="${escapeHtml(logo)}" alt="Logo do evento" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:${block.border_radius || 0}px;" />`;
    }

    return `<div style="width:100%;height:100%;display:grid;place-items:center;background:rgba(255,255,255,.12);border-radius:${block.border_radius || 0}px;font-weight:900;">LOGO<br/>EVENTO</div>`;
  }

  if (block.type === "event_name") {
    return textoSeguro(nomeEvento);
  }

  // Para date_time: ignora block.content e usa sempre data + hora do evento
  if (block.type === "date_time") {
    const partes: string[] = [];
    if (dataFormatada) partes.push(dataFormatada);
    if (horarioFormatado) partes.push(horarioFormatado);
    return textoSeguro(partes.join(" • "));
  }

  // Para location: ignora block.content e usa sempre o local do evento
  if (block.type === "location") {
    return textoSeguro(localEvento);
  }

  if (block.type === "guest_name") {
    return textoSeguro("Nome do Convidado");
  }

  if (block.type === "button") {
    return renderizarBotaoAcao(block, evento);
  }

  if (block.type === "guest_picker") {
    return `
      <div id="namePicker" style="width:100%;height:100%;min-height:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:6px;padding:8px 10px;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;">
        <label class="name-option selected" style="display:flex;align-items:center;gap:8px;color:inherit;font-family:inherit;font-size:17px;font-weight:900;line-height:1.05;min-height:26px;">
          <input type="checkbox" checked readonly style="width:17px;height:17px;accent-color:#f7d477;flex-shrink:0;" />
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

  const blocosVisiveis = blocks
    .filter((block) => block.visible !== false)
    .sort((a, b) => (a.z_index || 1) - (b.z_index || 1));

  /*
    Render híbrido:
    - Admin/editor continua absoluto em outras telas.
    - Cliente público usa este renderizador:
      blocos normais absolutos + guest_picker/botões em rodapé fluido.
  */
  const blocosNormais = blocosVisiveis.filter(
    (block) => block.type !== "guest_picker" && block.type !== "button",
  );

  const blocoGuestPicker = blocosVisiveis.find(
    (block) => block.type === "guest_picker",
  );

  const blocosButtons = blocosVisiveis
    .filter((block) => block.type === "button")
    .sort((a, b) => numberValue(a.y, 0) - numberValue(b.y, 0));

  // Renderiza blocos usando as posições originais definidas no editor admin
  // Respeita x, y, width, height do bloco como salvo no banco
  const blocosHtml = blocosNormais
    .map((block) => {
      const isDivider = block.type === "divider";
      const isLogo = block.type === "logo";
      const background = isLogo ? "transparent" : cssValue(block.background);
      const padding = isDivider || isLogo ? 0 : 8;

      // Usa posições originais do bloco (como definido no admin)
      const blockLeft = numberValue(block.x, 0);
      const blockTop = numberValue(block.y, 0);
      const blockWidth = numberValue(block.width, 200);
      const blockHeight = numberValue(block.height, 60);

      // Line-height reduzido para data, hora, local (mais compacto)
      const isTightContent = ["date_time", "location", "horario", "hora"].includes(block.type);
      const lineHeight = isTightContent ? "1.02" : "1.12";

      // Logo: sem overflow hidden e sem border-radius para não cortar a imagem
      const overflow = isLogo ? "visible" : "hidden";
      const borderRadius = isLogo ? 0 : numberValue(block.border_radius, 0);

      return `
        <div
          data-block-type="${escapeHtml(block.type)}"
          data-block-label="${escapeHtml(block.label || "")}"
          data-block-content="${escapeHtml(block.content || "")}"
          data-base-y="${blockTop}"
          data-base-height="${blockHeight}"
          data-debug-x="${block.x}"
          data-debug-width="${block.width}"
          style="
            position:absolute;
            left:${blockLeft}px;
            top:${blockTop}px;
            width:${blockWidth}px;
            height:${blockHeight}px;
            z-index:${(block.z_index || 1) + 10};
            box-sizing:border-box;
            border-radius:${borderRadius}px;
            color:${block.color || "#ffffff"};
            background:${background};
            font-family:${escapeHtml(block.font_family || "Inter")}, Arial, sans-serif !important;
            font-size:${numberValue(block.font_size, 24)}px !important;
            font-weight:900 !important;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            text-align:center;
            line-height:${lineHeight};
            padding:${padding}px;
            overflow:${overflow};
            white-space:pre-wrap;
          "
        >
          ${renderizarConteudoBloco(block, evento)}
        </div>
      `;
    })
    .join("");

  const footerTemConteudo = Boolean(blocoGuestPicker || blocosButtons.length);

  const footerTop = Math.max(
    520,
    Math.min(
      760,
      Math.min(
        ...[
          blocoGuestPicker ? numberValue(blocoGuestPicker.y, 650) : 650,
          ...blocosButtons.map((block) => numberValue(block.y, 760)),
        ],
      ),
    ),
  );

  const guestPickerHtml = blocoGuestPicker
    ? `
      <div
        class="omnistage-fluid-guest-picker"
        data-block-type="guest_picker"
        data-base-y="${numberValue(blocoGuestPicker.y, footerTop)}"
        data-base-height="${numberValue(blocoGuestPicker.height, 150)}"
        style="
          color:${blocoGuestPicker.color || "#ffffff"};
          background:${cssValue(blocoGuestPicker.background, "rgba(8,15,35,.70)")};
          border-radius:${Math.max(numberValue(blocoGuestPicker.border_radius, 22), 14)}px;
          font-family:${escapeHtml(blocoGuestPicker.font_family || "Inter")}, Arial, sans-serif;
          font-size:${Math.min(Math.max(numberValue(blocoGuestPicker.font_size, 18), 14), 22)}px;
        "
      >
        ${renderizarConteudoBloco(blocoGuestPicker, evento)}
      </div>
    `
    : "";

  const actionsHtml = blocosButtons.length
    ? `
      <div class="omnistage-fluid-actions">
        ${blocosButtons
          .map((block) => {
            const acao = detectarAcaoBotao(block.content);
            const isSecondaryAction = acao === "maps" || acao === "waze" || acao === "calendar";
            const minHeight = isSecondaryAction
              ? Math.max(Math.min(numberValue(block.height, 38), 44), 32)
              : Math.max(Math.min(numberValue(block.height, 54), 58), 44);
            const radius = Math.max(numberValue(block.border_radius, 18), 12);
            const fontSize = isSecondaryAction
              ? Math.max(Math.min(numberValue(block.font_size, 16), 18), 13)
              : Math.max(Math.min(numberValue(block.font_size, 18), 22), 16);

            return `
              <div
                class="omnistage-fluid-button"
                data-block-type="button"
                data-base-y="${numberValue(block.y, 0)}"
                data-base-height="${numberValue(block.height, 54)}"
                style="
                  min-height:${minHeight}px;
                  border-radius:${radius}px;
                  background:${cssValue(block.background, "rgba(255,255,255,.14)")};
                  color:${block.color || "#ffffff"};
                  font-family:${escapeHtml(block.font_family || "Inter")}, Arial, sans-serif;
                  font-size:${fontSize}px;
                  font-weight:900;
                "
              >
                ${renderizarConteudoBloco(block, evento)}
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const footerHtml = footerTemConteudo
    ? `
      <section class="omnistage-fluid-footer" style="top:${footerTop}px;--fluid-footer-top:${footerTop}px;">
        ${guestPickerHtml}
        ${actionsHtml}
      </section>
    `
    : "";

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


  // Script de centralização removido - agora usa posições originais do admin

  const responsiveScaleScript = `
    <script>
      (function () {
        var CANVAS_W = 430;
        var CANVAS_H = 920;

        function ajustarEscala() {
          var viewport = document.querySelector(".omnistage-viewport");
          var shell = document.querySelector(".omnistage-scale-shell");
          var phone = document.querySelector(".omnistage-phone");

          if (!viewport || !shell || !phone) return;

          var larguraDisponivel = Math.max(280, viewport.clientWidth || window.innerWidth || CANVAS_W);
          var escala = Math.min(1, larguraDisponivel / CANVAS_W);

          phone.style.transform = "scale(" + escala + ")";
          shell.style.width = CANVAS_W * escala + "px";
          shell.style.height = CANVAS_H * escala + "px";
        }

        window.__OMNISTAGE_RESCALE__ = ajustarEscala;
        ajustarEscala();

        window.addEventListener("resize", ajustarEscala);
        window.addEventListener("orientationchange", function () {
          setTimeout(ajustarEscala, 250);
        });
        window.addEventListener("load", ajustarEscala);
      })();
    </script>
  `;

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style>
          * { box-sizing: border-box; }

          html,
          body {
            margin: 0;
            min-height: 100%;
            background: #020617;
          }

          body {
            width: 100%;
            min-height: 100vh;
            min-height: 100svh;
            font-family: Inter, Arial, sans-serif;
            overflow-x: hidden;
          }

          .omnistage-viewport {
            width: 100%;
            min-height: 100vh;
            min-height: 100svh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            background: #020617;
            overflow-x: hidden;
            overflow-y: auto;
          }

          .omnistage-scale-shell {
            width: 430px;
            height: 920px;
            position: relative;
            flex: 0 0 auto;
            overflow: visible;
          }

          .omnistage-phone {
            width: 430px;
            height: 920px;
            position: absolute;
            left: 50%;
            top: 0;
            margin-left: -215px;
            overflow: hidden;
            background:
              radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 30%),
              linear-gradient(180deg,#0b1530,#211f63);
            transform-origin: top center;
            color: #ffffff;
          }

          .omnistage-canvas {
            width: 430px;
            height: 920px;
            position: absolute;
            left: 0;
            top: 0;
            overflow: hidden;
          }

          .omnistage-bg {
            position:absolute;
            left:50%;
            top:50%;
            width:430px;
            height:920px;
            object-fit:cover;
            transform:
              translate(
                calc(-50% + ${backgroundX}px),
                calc(-50% + ${backgroundY}px)
              )
              scale(${backgroundScale});
            opacity:${backgroundOpacity};
            z-index:0;
            pointer-events:none;
            user-select:none;
          }

          .omnistage-fluid-footer {
            position:absolute;
            left:0;
            right:0;
            bottom:auto;
            z-index:120;
            display:flex;
            flex-direction:column;
            justify-content:flex-start;
            gap:10px;
            padding:0 22px;
            pointer-events:auto;
            max-height:calc(920px - var(--fluid-footer-top, 650px) - 18px);
          }

          .omnistage-fluid-guest-picker {
            width:100%;
            max-height:178px;
            min-height:0;
            height:auto;
            overflow-y:auto;
            overflow-x:hidden;
            backdrop-filter:blur(12px);
            -webkit-backdrop-filter:blur(12px);
            padding:12px 14px;
            box-sizing:border-box;
            scrollbar-width:thin;
            overscroll-behavior:contain;
            box-shadow:0 14px 38px rgba(0,0,0,.20);
          }

          .omnistage-fluid-guest-picker::-webkit-scrollbar {
            width:6px;
          }

          .omnistage-fluid-guest-picker::-webkit-scrollbar-thumb {
            background:rgba(255,255,255,.35);
            border-radius:999px;
          }

          .omnistage-fluid-actions {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:8px;
          }

          .omnistage-fluid-button {
            width:min(100%, 330px);
            margin:0 auto;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
            box-shadow:0 12px 28px rgba(0,0,0,.18);
          }

          .omnistage-fluid-button a,
          .omnistage-fluid-button button {
            width:100% !important;
            min-height:inherit !important;
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            text-align:center !important;
          }

          #namePicker {
            width:100% !important;
            height:auto !important;
            max-height:100% !important;
            min-height:0 !important;
            display:flex;
            flex-direction:column;
            gap:6px !important;
            padding:0 !important;
            overflow:visible !important;
          }

          /* CSS de centralização forçada removido - usa posições do admin */
          [data-block-type="location"] {
            overflow-wrap:anywhere;
            word-break:normal;
          }

          .name-option {
            display:flex;
            align-items:center;
            gap:8px;
            color:inherit;
            font-family:inherit;
            font-size:17px;
            font-weight:900;
            line-height:1.05;
            min-height:26px;
          }

          .name-option input {
            width:18px;
            height:18px;
            accent-color:#f7d477;
            flex-shrink:0;
          }

          .name-option span {
            display:block;
            overflow-wrap:anywhere;
          }
        </style>
      </head>
      <body>
        <div class="omnistage-viewport">
          <div class="omnistage-scale-shell">
            <main class="omnistage-phone">
              <div class="omnistage-canvas">
                ${
                  backgroundEvento
                    ? `<img
                        class="omnistage-bg"
                        src="${escapeHtml(backgroundEvento)}"
                        alt="Background"
                      />`
                    : ""
                }

                <div style="position:absolute;inset:0;z-index:1;pointer-events:none;background:${
                  glassTone === "light"
                    ? `rgba(255,255,255,${glassOpacity})`
                    : `rgba(2,6,23,${glassOpacity})`
                };backdrop-filter:${glassBlur ? `blur(${glassBlur}px)` : "none"};"></div>

                ${blocosHtml}
                ${footerHtml}
              </div>
            </main>
          </div>
        </div>

        ${countdownScript}
        ${responsiveScaleScript}
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
  const totalConvidados = nomesLimpos.length || 1;
  const textoTotalConvidados =
    totalConvidados === 1
      ? "Convite para 1 convidado"
      : `Convite para ${totalConvidados} convidados`;

  html = html
    .replaceAll("{{total_convidados}}", String(totalConvidados))
    .replaceAll("{{TOTAL_CONVIDADOS}}", String(totalConvidados))
    .replaceAll("{{convidados_quantidade}}", String(totalConvidados))
    .replaceAll("{{CONVIDADOS_QUANTIDADE}}", String(totalConvidados))
    .replaceAll("{{texto_total_convidados}}", textoTotalConvidados)
    .replaceAll("{{TEXTO_TOTAL_CONVIDADOS}}", textoTotalConvidados);

  const nomesHtml = nomesLimpos
    .map(
      (nome) => `
        <label class="name-option selected" style="display:flex;align-items:center;gap:8px;color:inherit;font-family:inherit;font-size:17px;font-weight:900;line-height:1.05;min-height:26px;">
          <input type="checkbox" checked name="guest-confirmation" style="width:17px;height:17px;accent-color:#f7d477;flex-shrink:0;" />
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

        function escapeHtmlClient(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

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

        document.querySelectorAll('[data-block-type="guest_name"]').forEach(function (el) {
          if (isGrupo) {
            el.style.display = "none";
          } else {
            el.textContent = nomeIndividual;
            el.style.display = "";
          }
        });

        var picker = document.getElementById("namePicker");
        if (picker) {
          if (isGrupo) {
            picker.innerHTML = ${JSON.stringify(nomesHtml)};
            picker.style.display = "flex";
            picker.style.flexDirection = "column";
            picker.style.alignItems = "stretch";
            picker.style.justifyContent = "flex-start";
            picker.style.gap = "6px";
            picker.style.padding = "8px 10px";
            picker.style.height = "auto";
            picker.style.maxHeight = "none";
            picker.style.minHeight = "0";
            picker.style.overflowY = "visible";
            picker.style.overflowX = "hidden";
            picker.style.webkitOverflowScrolling = "touch";
            picker.style.overscrollBehavior = "contain";
            picker.classList.remove("hidden");
          } else {
            picker.innerHTML =
              '<div class="name-option selected" style="display:flex;align-items:center;justify-content:center;gap:8px;color:inherit;font-family:inherit;font-size:17px;font-weight:900;line-height:1.05;min-height:24px;text-align:center;">' +
              '<span>' + escapeHtmlClient(nomeIndividual) + '</span>' +
              '</div>';
            picker.style.display = "flex";
            picker.style.flexDirection = "column";
            picker.style.alignItems = "center";
            picker.style.justifyContent = "center";
            picker.style.gap = "6px";
            picker.style.padding = "8px 10px";
            picker.style.height = "auto";
            picker.style.maxHeight = "none";
            picker.style.minHeight = "0";
            picker.style.overflowY = "visible";
            picker.style.overflowX = "hidden";
            picker.classList.remove("hidden");
          }

          var pickerBlock = picker.closest('[data-block-type="guest_picker"]');
          if (pickerBlock) {
            if (isGrupo) {
              pickerBlock.style.display = "";
              pickerBlock.style.minHeight = "0";
              pickerBlock.style.overflowY = "auto";
              pickerBlock.style.overflowX = "hidden";
            } else {
              pickerBlock.style.display = "";
              pickerBlock.style.minHeight = "0";
              pickerBlock.style.overflowY = "hidden";
              pickerBlock.style.overflowX = "hidden";
            }
          }
        }


        function ajustarFooterFluido() {
          var footer = document.querySelector(".omnistage-fluid-footer");
          var pickerBlock = document.querySelector(".omnistage-fluid-guest-picker");
          var nomes = window.__OMNISTAGE_GUESTS__ || [];
          var isGrupo = nomes.length > 1;

          if (!footer) return;

          if (pickerBlock) {
            if (isGrupo) {
              pickerBlock.style.display = "";
              pickerBlock.style.maxHeight = "178px";
              pickerBlock.style.padding = "12px 14px";
            } else {
              pickerBlock.style.display = "";
              pickerBlock.style.maxHeight = "54px";
              pickerBlock.style.padding = "10px 14px";
            }
          }

          if (window.__OMNISTAGE_RESCALE__) {
            window.__OMNISTAGE_RESCALE__();
          }
        }

        ajustarFooterFluido();
        setTimeout(ajustarFooterFluido, 80);
        setTimeout(ajustarFooterFluido, 250);

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
          option.style.display = "flex";
          option.classList.remove("hidden");
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


