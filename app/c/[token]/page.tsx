"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Convidado = {
  id: string;
  nome: string;
  token: string;
  evento_id: string;
  grupo: string | null;
};

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  horario: string | null;
  local: string | null;
  endereco: string | null;
  mapa_url: string | null;
  invite_template_id: string | null;
  background_image?: string | null;
  logo_image?: string | null;
  music_file?: string | null;
};

type Template = {
  id: string;
  html_template: string | null;
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

    const { data: convidado, error: convidadoError } = await supabase
      .from("convidados")
      .select("id,nome,token,evento_id,grupo")
      .eq("token", tokenDecodificado)
      .maybeSingle();

    if (convidadoError || !convidado) {
      setHtmlFinal(htmlErro("Convite não encontrado."));
      setLoading(false);
      return;
    }

    const { data: evento, error: eventoError } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        horario,
        local,
        endereco,
        mapa_url,
        invite_template_id,
        background_image,
        logo_image,
        music_file
      `)
      .eq("id", convidado.evento_id)
      .maybeSingle();

    if (eventoError || !evento?.invite_template_id) {
      setHtmlFinal(htmlErro("Evento sem convite aplicado."));
      setLoading(false);
      return;
    }

    const { data: template, error: templateError } = await supabase
      .from("invite_templates")
      .select("id,html_template")
      .eq("id", evento.invite_template_id)
      .maybeSingle();

    if (templateError || !template?.html_template) {
      setHtmlFinal(htmlErro("Modelo de convite não encontrado."));
      setLoading(false);
      return;
    }

    let nomesDoConvite = [convidado.nome];

    if (convidado.grupo) {
      const { data: convidadosGrupo } = await supabase
        .from("convidados")
        .select("nome")
        .eq("evento_id", convidado.evento_id)
        .eq("grupo", convidado.grupo)
        .order("nome");

      if (convidadosGrupo && convidadosGrupo.length > 0) {
        nomesDoConvite = convidadosGrupo.map((item) => item.nome);
      }
    }

    const htmlComEvento = preencherTemplate(template.html_template, evento);
    const htmlComConvidado = injetarConvidado(htmlComEvento, convidado, nomesDoConvite);

    setHtmlFinal(htmlComConvidado);
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

function preencherTemplate(html: string, evento: Evento) {
  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventoDataIso = dataEvento?.toISOString() || "";
  const eventTimestamp = dataEvento?.getTime() || 0;

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
    local: local,
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
    .replace(/const EVENT_LOCATION = ["'].*?["'];/g, `const EVENT_LOCATION = ${JSON.stringify(local || "")};`)
    .replace(/const EVENT_TITLE = ["'].*?["'];/g, `const EVENT_TITLE = ${JSON.stringify(evento.nome || "")};`)
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

  return injetarEventoNoHtml(htmlBase, evento, {
    data: dataFormatada,
    horario: horarioFormatado,
    local,
    timestamp: eventTimestamp,
  });
}

function injetarEventoNoHtml(
  html: string,
  evento: Evento,
  dados: {
    data: string;
    horario: string;
    local: string;
    timestamp: number;
  }
) {
  const script = `
    <script>
      window.__OMNISTAGE_EVENT__ = ${JSON.stringify({
        nome: evento.nome || "",
        data: dados.data,
        horario: dados.horario,
        local: dados.local,
        mapa: evento.mapa_url || "",
        logo: evento.logo_image || "",
        fundo: evento.background_image || "",
        musica: evento.music_file || "",
        timestamp: dados.timestamp,
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

        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var node;

        while ((node = walker.nextNode())) {
          var text = node.nodeValue || "";
          text = text
            .replace(/VALENTINA XV/g, (eventData.nome || "").toUpperCase())
            .replace(/Valentina XV/g, eventData.nome || "")
            .replace(/Guerrah Hall/g, eventData.local || "")
            .replace(/16 de maio de 2026/g, eventData.data || "")
            .replace(/21h/g, eventData.horario || "")
            .replace(/20h/g, eventData.horario || "");
          node.nodeValue = text;
        }

        var meta = document.querySelector(".meta");
        if (meta) {
          var linhas = meta.querySelectorAll("div");
          if (linhas[0]) linhas[0].textContent = [eventData.data, eventData.horario].filter(Boolean).join(" • ").toUpperCase();
          if (linhas[1]) linhas[1].textContent = (eventData.local || "").toUpperCase();

          linhas.forEach(function (linha) {
            linha.style.fontFamily = "Georgia, 'Times New Roman', serif";
            linha.style.fontWeight = "700";
            linha.style.letterSpacing = "0.16em";
            linha.style.textTransform = "uppercase";
            linha.style.lineHeight = "1.45";
            linha.style.fontSize = "clamp(18px, 3.6vw, 27px)";
          });
        }

        if (eventData.logo) {
          var titleImage = document.querySelector(".title-image");
          var logoImage = document.querySelector("[data-logo-evento]");
          var firstEventImage = titleImage || logoImage;

          if (!firstEventImage) {
            var imagens = Array.from(document.querySelectorAll("img"));
            firstEventImage = imagens.find(function (img) {
              var alt = (img.getAttribute("alt") || "").toLowerCase();
              var className = (img.getAttribute("class") || "").toLowerCase();
              return alt.includes("valentina") || alt.includes("logo") || className.includes("title") || className.includes("logo");
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

          function encontrarConviteDigital() {
            var candidatos = Array.from(document.body.querySelectorAll("*"));
            return candidatos.find(function (el) {
              var texto = (el.textContent || "").trim().replace(/\\s+/g, " ").toLowerCase();
              return texto === "convite digital" && el.children.length <= 1;
            }) || null;
          }

          function encontrarTituloDoEvento() {
            var nomeEvento = String(eventData.nome || "").trim().toLowerCase();

            if (nomeEvento) {
              var candidatos = Array.from(
                document.querySelectorAll("h1,h2,h3,[class*='title'],[class*='titulo'],[class*='nome'],[class*='name'],[class*='event']")
              );

              var encontrado = candidatos.find(function (el) {
                var texto = (el.textContent || "").trim().toLowerCase();
                return texto === nomeEvento || texto.includes(nomeEvento);
              });

              if (encontrado) return encontrado;
            }

            return document.querySelector(".event-title") ||
              document.querySelector(".main-title") ||
              document.querySelector(".hero-title") ||
              document.querySelector("h1") ||
              document.querySelector(".title");
          }

          function posicionarLogo(img) {
            var conviteDigital = encontrarConviteDigital();
            var tituloEvento = encontrarTituloDoEvento();

            prepararLogo(img);

            if (conviteDigital && conviteDigital.parentNode) {
              conviteDigital.parentNode.insertBefore(img, conviteDigital.nextSibling);
            } else if (tituloEvento && tituloEvento.parentNode) {
              tituloEvento.parentNode.insertBefore(img, tituloEvento);
            } else {
              var cardParaLogo = document.querySelector(".card") || document.body;
              cardParaLogo.insertBefore(img, cardParaLogo.firstChild);
            }

            if (tituloEvento && !tituloEvento.contains(img)) {
              tituloEvento.style.display = "none";
            }
          }

          if (firstEventImage) {
            posicionarLogo(firstEventImage);
          } else {
            var logoCriada = document.createElement("img");
            posicionarLogo(logoCriada);
          }
        }

        if (eventData.fundo) {
          var card = document.querySelector(".card");
          var motion = document.querySelector(".card-bg-motion");
          var bgValue =
            "linear-gradient(180deg, rgba(12, 28, 60, 0.68) 0%, rgba(10, 24, 54, 0.84) 45%, rgba(6, 14, 36, 0.96) 100%), url('" +
            eventData.fundo +
            "')";

          if (card) {
            card.style.backgroundImage = bgValue;
            card.style.backgroundPosition = "center center";
            card.style.backgroundSize = "cover";
          }

          if (motion) {
            motion.style.backgroundImage = "url('" + eventData.fundo + "')";
            motion.style.backgroundPosition = "center center";
            motion.style.backgroundSize = "cover";
          }
        }

        var daysEl = document.getElementById("days");
        var hoursEl = document.getElementById("hours");
        var minutesEl = document.getElementById("minutes");
        var secondsEl = document.getElementById("seconds");

        if (daysEl && hoursEl && minutesEl && secondsEl) {
          var target = Number(eventData.timestamp || 0);
          var distance = target ? target - Date.now() : 0;

          if (!target || distance <= 0) {
            daysEl.textContent = "00";
            hoursEl.textContent = "00";
            minutesEl.textContent = "00";
            secondsEl.textContent = "00";
          } else {
            daysEl.textContent = String(Math.floor(distance / 86400000)).padStart(2, "0");
            hoursEl.textContent = String(Math.floor((distance / 3600000) % 24)).padStart(2, "0");
            minutesEl.textContent = String(Math.floor((distance / 60000) % 60)).padStart(2, "0");
            secondsEl.textContent = String(Math.floor((distance / 1000) % 60)).padStart(2, "0");
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

function injetarConvidado(html: string, convidado: Convidado, nomesDoConvite: string[]) {
  const nomesSeguros = nomesDoConvite.map((nome) => escapeHtml(nome));
  const tituloConvite =
    nomesDoConvite.length > 1
      ? convidado.grupo || `Convite para ${nomesDoConvite.length} convidados`
      : convidado.nome;

  const nomesHtml = nomesSeguros
    .map(
      (nome) => `
        <label class="name-option selected" style="display:flex;align-items:center;gap:10px;justify-content:flex-start;margin:10px auto;color:#fff;font-family:Georgia,'Times New Roman',serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
          <input type="checkbox" checked name="guest-confirmation" style="accent-color:#d4af37; width:18px; height:18px;" />
          <span>${nome}</span>
        </label>
      `
    )
    .join("");

  const script = `
    <script>
      window.__OMNISTAGE_GUEST__ = ${JSON.stringify({
        nome: convidado.nome,
        nomes: nomesDoConvite,
        token: convidado.token,
        grupo: convidado.grupo || "",
        titulo: tituloConvite,
      })};

      window.addEventListener("DOMContentLoaded", function () {
        var guest = window.__OMNISTAGE_GUEST__;

        var guestName = document.getElementById("guestName");
        if (guestName) {
          guestName.textContent = guest.titulo;
          guestName.style.display = "block";
          guestName.style.textAlign = "center";
          guestName.style.fontFamily = "Georgia, 'Times New Roman', serif";
          guestName.style.fontWeight = "700";
          guestName.style.letterSpacing = "0.12em";
          guestName.style.textTransform = "uppercase";
          guestName.style.color = "#ffffff";
        }

        var picker = document.getElementById("namePicker");
        if (picker) {
          picker.innerHTML = ${JSON.stringify(nomesHtml)};
          picker.style.display = "block";
        }

        var hint = document.getElementById("hintText");
        if (hint) {
          hint.textContent = guest.nomes.length > 1
            ? "Selecione os nomes para confirmar presença"
            : "Confirme sua presença";
          hint.style.display = "block";
        }

        var confirmBtn = document.getElementById("confirmBtn");
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.style.pointerEvents = "auto";
          confirmBtn.style.display = "";
        }
      });
    </script>
  `;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

function formatarData(data: string | null) {
  if (!data) return "";

  const date = new Date(`${data}T00:00:00`);

  if (Number.isNaN(date.getTime())) return data;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function criarDataEvento(evento: Evento | null) {
  if (!evento?.data_evento) return null;

  const horario = normalizarHorario(evento.horario);
  const date = new Date(`${evento.data_evento}T${horario}:00-03:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizarHorario(horario: string | null | undefined) {
  if (!horario) return "20:00";

  const match = horario.match(/(\d{1,2})(?::|h)?(\d{2})?/i);

  if (!match) return "20:00";

  const horas = match[1].padStart(2, "0");
  const minutos = (match[2] || "00").padStart(2, "0");

  return `${horas}:${minutos}`;
}

function formatarHorario(horario: string | null | undefined) {
  if (!horario) return "";

  const horarioNormalizado = normalizarHorario(horario);
  const [horas, minutos] = horarioNormalizado.split(":");

  return minutos === "00" ? `${Number(horas)}h` : `${Number(horas)}h${minutos}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlErro(message: string) {
  return `
    <main style="min-height:100vh;background:#020617;color:white;display:grid;place-items:center;font-family:Arial,sans-serif;text-align:center;padding:24px;">
      <div>
        <h1>${message}</h1>
      </div>
    </main>
  `;
}
