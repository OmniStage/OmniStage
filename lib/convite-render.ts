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
  logo_image?: string | null;
  music_file?: string | null;
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

export function preencherTemplate(html: string, evento: EventoConvite | null) {
  if (!evento) return html;

  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventoDataIso = dataEvento?.toISOString() || "";

  const valores: Record<string, string> = {
    evento_nome: evento.nome || "",
    data_evento: dataFormatada,
    horario_evento: horarioFormatado,
    local_evento: local,
    mapa_url: evento.mapa_url || "",
    background_image: evento.background_image || "",
    logo_image: evento.logo_image || "",
    music_file: evento.music_file || "",
    data_iso_evento: eventoDataIso,
  };

  const preenchido = Object.entries(valores).reduce((content, [key, value]) => {
    return content.replaceAll(`{{${key}}}`, value || "");
  }, html);

  return aplicarCompatibilidadeTemplate(preenchido, evento);
}

function aplicarCompatibilidadeTemplate(html: string, evento: EventoConvite) {
  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventTimestamp = dataEvento?.getTime() || 0;

  const script = `
<script>
window.__OMNISTAGE_EVENT__ = ${JSON.stringify({
  nome: evento.nome || "",
  data: dataFormatada,
  horario: horarioFormatado,
  local,
  mapa: evento.mapa_url || "",
  logo: evento.logo_image || "",
  fundo: evento.background_image || "",
  musica: evento.music_file || "",
  timestamp: eventTimestamp,
})};

window.addEventListener("DOMContentLoaded", function () {
  var eventData = window.__OMNISTAGE_EVENT__ || {};

  function buscarCard() {
    return document.querySelector(".card") || document.body;
  }

  function aplicarFundo() {
    var card = buscarCard();

    document.body.style.background = "#020617";
    document.documentElement.style.background = "#020617";

    document.querySelectorAll(".card-bg-motion").forEach(el => el.remove());

    if (!eventData.fundo) return;

    card.style.backgroundImage =
      "linear-gradient(180deg, rgba(12,28,60,0.65), rgba(6,14,36,0.95)), url('" +
      eventData.fundo +
      "')";

    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
    card.style.backgroundRepeat = "no-repeat";
  }

  function aplicarLogo() {
    if (!eventData.logo) return;

    var card = buscarCard();

    // remove logos antigas
    document.querySelectorAll("[data-logo-evento]").forEach(el => el.remove());

    var slot = document.querySelector('[data-slot="logo"]');

    var logo = document.createElement("img");
    logo.src = eventData.logo;
    logo.setAttribute("data-logo-evento", "true");

    logo.style.display = "block";
    logo.style.width = "70%";
    logo.style.maxWidth = "420px";
    logo.style.margin = "20px auto";

    if (slot) {
      slot.innerHTML = "";
      slot.appendChild(logo);
      return;
    }

    // fallback
    card.insertBefore(logo, card.firstChild);
  }

  function aplicarLinks() {
    var maps = document.getElementById("mapsLink");
    if (maps && eventData.mapa) maps.href = eventData.mapa;
  }

  function aplicarMusica() {
    var source = document.querySelector("#bgMusic source");
    var audio = document.getElementById("bgMusic");

    if (source && eventData.musica) {
      source.src = eventData.musica;
      if (audio && audio.load) audio.load();
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

export function injetarConvidadosNoConvite(html: string, nomes: string[]) {
  const nomesHtml = nomes.map(nome => `
    <label class="name-option selected">
      <input type="checkbox" checked />
      <span>${nome}</span>
    </label>
  `).join("");

  const script = `
<script>
window.addEventListener("DOMContentLoaded", function () {
  var picker = document.getElementById("namePicker");
  if (picker) {
    picker.innerHTML = ${JSON.stringify(nomesHtml)};
  }
});
</script>
`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}
