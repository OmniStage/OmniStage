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
    horario: horarioFormatado,
    HORARIO: horarioFormatado,
    data_horario_evento: [dataFormatada, horarioFormatado].filter(Boolean).join(" • "),
    DATA_HORARIO_EVENTO: [dataFormatada, horarioFormatado].filter(Boolean).join(" • "),
    local_evento: local,
    LOCAL_EVENTO: local,
    local,
    LOCAL: local,
    endereco_evento: evento.endereco || "",
    ENDERECO_EVENTO: evento.endereco || "",
    mapa_url: evento.mapa_url || "",
    MAPA_URL: evento.mapa_url || "",
    background_image: evento.background_image || "",
    BACKGROUND_IMAGE: evento.background_image || "",
    logo_image: evento.logo_image || "",
    LOGO_IMAGE: evento.logo_image || "",
    logo_evento: evento.logo_image || "",
    LOGO_EVENTO: evento.logo_image || "",
    music_file: evento.music_file || "",
    MUSIC_FILE: evento.music_file || "",
    musica_evento: evento.music_file || "",
    MUSICA_EVENTO: evento.music_file || "",
    data_iso_evento: eventoDataIso,
    DATA_ISO_EVENTO: eventoDataIso,
  };

  const preenchido = Object.entries(valores).reduce((content, [key, value]) => {
    return content.replaceAll(`{{${key}}}`, value || "");
  }, html);

  const htmlBase = preenchido
    .replaceAll("VALENTINA XV", (evento.nome || "Evento").toUpperCase())
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
        dataEvento ? new Date(dataEvento.getTime() + 4 * 60 * 60 * 1000).toISOString() : ""
      )});`
    );

  return aplicarCompatibilidadeTemplate(htmlBase, evento);
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

        var mapsLink = document.getElementById("mapsLink");
        var calendarLink = document.getElementById("calendarLink");
        var musicSource = document.querySelector("#bgMusic source");
        var musicAudio = document.getElementById("bgMusic");

        if (mapsLink && eventData.mapa) mapsLink.href = eventData.mapa;

        if (musicSource && eventData.musica) {
          musicSource.setAttribute("src", eventData.musica);
          if (musicAudio && musicAudio.load) musicAudio.load();
        }

        if (calendarLink && eventData.nome && eventData.timestamp) {
          var start = new Date(eventData.timestamp);
          var end = new Date(eventData.timestamp + 4 * 60 * 60 * 1000);

          function toGoogleDate(date) {
            return date.toISOString().replace(/[-:]/g, "").replace(/\\.\\d{3}Z$/, "Z");
          }

          calendarLink.href =
            "https://calendar.google.com/calendar/render?action=TEMPLATE" +
            "&text=" + encodeURIComponent(eventData.nome) +
            "&dates=" + toGoogleDate(start) + "/" + toGoogleDate(end) +
            "&location=" + encodeURIComponent(eventData.local || "");
        }

        if (eventData.logo) {
          var nomeEvento = String(eventData.nome || "").trim();

          function encontrarTextoExato(textoBuscado) {
            if (!textoBuscado) return null;

            var elementos = Array.from(document.body.querySelectorAll("*"));

            return elementos.find(function (el) {
              var texto = (el.textContent || "").trim().replace(/\\s+/g, " ");
              var filhos = el.children.length;
              return texto.toLowerCase() === textoBuscado.toLowerCase() && filhos <= 2;
            }) || null;
          }

          function encontrarTituloDoEvento() {
            var tituloPorTexto = encontrarTextoExato(nomeEvento);
            if (tituloPorTexto) return tituloPorTexto;

            var tituloMaiusculo = encontrarTextoExato(nomeEvento.toUpperCase());
            if (tituloMaiusculo) return tituloMaiusculo;

            var candidatos = Array.from(
              document.querySelectorAll(
                "h1,h2,h3,.title,.event-title,.main-title,.hero-title,[class*='title'],[class*='titulo'],[class*='nome'],[class*='name'],[class*='event']"
              )
            );

            return candidatos.find(function (el) {
              var texto = (el.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
              var nome = nomeEvento.toLowerCase();
              return nome && (texto === nome || texto.includes(nome));
            }) || null;
          }

          function encontrarConviteDigital() {
            var candidatos = Array.from(document.body.querySelectorAll("*"));
            return candidatos.find(function (el) {
              var texto = (el.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
              return texto === "convite digital" && el.children.length <= 1;
            }) || null;
          }

          function prepararLogo(img) {
            img.setAttribute("src", eventData.logo);
            img.setAttribute("alt", eventData.nome || "Logo do evento");
            img.setAttribute("data-logo-evento", "true");
            img.style.display = "block";
            img.style.width = "min(78%, 520px)";
            img.style.maxWidth = "78%";
            img.style.maxHeight = "170px";
            img.style.height = "auto";
            img.style.objectFit = "contain";
            img.style.margin = "24px auto 18px";
          }

          function posicionarLogo(img) {
            var tituloEvento = encontrarTituloDoEvento();
            var conviteDigital = encontrarConviteDigital();

            prepararLogo(img);

            if (tituloEvento && tituloEvento.parentNode) {
              tituloEvento.parentNode.insertBefore(img, tituloEvento);
              tituloEvento.style.display = "none";
              tituloEvento.setAttribute("data-substituido-por-logo", "true");
              return;
            }

            if (conviteDigital && conviteDigital.parentNode) {
              conviteDigital.parentNode.insertBefore(img, conviteDigital.nextSibling);
              return;
            }

            var cardParaLogo = document.querySelector(".card") || document.body;
            cardParaLogo.insertBefore(img, cardParaLogo.firstChild);
          }

          var imgExistente =
            document.querySelector("[data-logo-evento]") ||
            document.querySelector(".title-image") ||
            null;

          if (imgExistente) {
            posicionarLogo(imgExistente);
          } else {
            var logoCriada = document.createElement("img");
            posicionarLogo(logoCriada);
          }
        }
      });
    </script>
  `;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

export function injetarConvidadosNoConvite(html: string, nomesDoConvite: string[]) {
  const nomesHtml = nomesDoConvite
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
      window.__OMNISTAGE_GUESTS__ = ${JSON.stringify(nomesDoConvite)};

      window.addEventListener("DOMContentLoaded", function () {
        var nomes = window.__OMNISTAGE_GUESTS__ || [];

        var guestName = document.getElementById("guestName");
        if (guestName) {
          guestName.textContent = "";
          guestName.style.display = "none";
        }

        var picker = document.getElementById("namePicker");
        if (picker) {
          picker.innerHTML = ${JSON.stringify(nomesHtml)};
          picker.style.display = "block";
          picker.classList.remove("hidden");
        }

        var hint = document.getElementById("hintText");
        if (hint) {
          hint.textContent = nomes.length > 1
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
          input.style.display = "";
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
