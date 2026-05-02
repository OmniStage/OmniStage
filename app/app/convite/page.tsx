"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  status: string | null;
  tenant_id: string | null;
  invite_template_id: string | null;
  created_at: string | null;
  horario?: string | null;
  endereco?: string | null;
  mapa_url?: string | null;
  background_image?: string | null;
  logo_image?: string | null;
  music_file?: string | null;
};

type Template = {
  id: string;
  nome: string | null;
  name: string | null;
  slug: string;
  preview_image: string | null;
  background_image: string | null;
  logo_image: string | null;
  html_template: string | null;
  active: boolean | null;
  tenant_id: string | null;
  categoria?: { nome: string } | { nome: string }[] | null;
};

function getCategoriaNome(categoria: Template["categoria"]) {
  if (Array.isArray(categoria)) {
    return categoria[0]?.nome || "Sem categoria";
  }

  return categoria?.nome || "Sem categoria";
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

function injetarModoPreview(html: string, evento?: Evento | null) {
  const dataEvento = criarDataEvento(evento || null);
  const dataFormatada = evento ? formatarData(evento.data_evento) : "";
  const horarioFormatado = evento ? formatarHorario(evento.horario) : "";
  const local = evento ? evento.local || evento.endereco || "" : "";
  const nome = evento?.nome || "";
  const eventTimestamp = dataEvento?.getTime() || 0;

  const previewCss = `
    <style>
      html { overflow: hidden !important; }
      body { overflow: hidden !important; }
      #guestName { display: none !important; }
      #namePicker, .name-picker, #hintText, .hint, #statusMessage, .status { display: none !important; }
      input[name="guest-confirmation"], .name-option { display: none !important; }
      #confirmBtn { pointer-events: none !important; }
    </style>
    <script>
      window.__OMNISTAGE_PREVIEW__ = true;
      window.__OMNISTAGE_EVENT__ = ${JSON.stringify({
        nome,
        data: dataFormatada,
        horario: horarioFormatado,
        local,
        mapa: evento?.mapa_url || "",
        logo: evento?.logo_image || "",
        fundo: evento?.background_image || "",
        musica: evento?.music_file || "",
        timestamp: eventTimestamp,
      })};
      window.addEventListener("DOMContentLoaded", function () {
        var eventData = window.__OMNISTAGE_EVENT__ || {};
        var guestName = document.getElementById("guestName");
        var picker = document.getElementById("namePicker");
        var hint = document.getElementById("hintText");
        var status = document.getElementById("statusMessage");
        var confirmBtn = document.getElementById("confirmBtn");
        var mapsLink = document.getElementById("mapsLink");
        var calendarLink = document.getElementById("calendarLink");
        var musicSource = document.querySelector("#bgMusic source");
        var musicAudio = document.getElementById("bgMusic");

        if (guestName) guestName.textContent = "";
        if (picker) picker.innerHTML = "";
        if (hint) hint.textContent = "";
        if (status) status.textContent = "";
        if (confirmBtn) {
          confirmBtn.disabled = true;
          confirmBtn.removeAttribute("onclick");
        }
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

        if (eventData.nome || eventData.data || eventData.local) {
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
            if (linhas[0]) linhas[0].textContent = [eventData.data, eventData.horario].filter(Boolean).join(" • ");
            if (linhas[1]) linhas[1].textContent = eventData.local || "";
          }
        }

        if (eventData.logo) {
          var titleImage = document.querySelector(".title-image");
          var logoImage = document.querySelector("[data-logo-evento]");
          var firstEventImage = titleImage || logoImage;
          var nomeEvento = String(eventData.nome || "").trim();

          function encontrarTituloDoEvento() {
            if (nomeEvento) {
              var tituloPossivel = Array.from(
                document.querySelectorAll(
                  "h1,h2,h3,[class*='title'],[class*='titulo'],[class*='nome'],[class*='name'],[class*='event']"
                )
              ).filter(function (el) {
                var texto = (el.textContent || "").trim().toLowerCase();
                var nome = nomeEvento.toLowerCase();
                return texto === nome || texto.includes(nome);
              });

              var tituloEncontrado =
                tituloPossivel.find(function (el) {
                  return el.children.length <= 2;
                }) ||
                tituloPossivel[0] ||
                null;

              if (tituloEncontrado) return tituloEncontrado;

              var todosElementos = Array.from(document.body.querySelectorAll("*"));
              tituloEncontrado =
                todosElementos.find(function (el) {
                  var texto = (el.textContent || "").trim().toLowerCase();
                  return texto === nomeEvento.toLowerCase() && el.children.length === 0;
                }) || null;

              if (tituloEncontrado) return tituloEncontrado;
            }

            return (
              document.querySelector(".event-title") ||
              document.querySelector(".main-title") ||
              document.querySelector(".hero-title") ||
              document.querySelector("h1") ||
              document.querySelector(".title")
            );
          }

          if (!firstEventImage) {
            var imagens = Array.from(document.querySelectorAll("img"));
            firstEventImage = imagens.find(function (img) {
              var alt = (img.getAttribute("alt") || "").toLowerCase();
              var className = (img.getAttribute("class") || "").toLowerCase();
              return alt.includes("valentina") || alt.includes("logo") || className.includes("title") || className.includes("logo");
            }) || null;
          }

          if (firstEventImage) {
            firstEventImage.setAttribute("src", eventData.logo);
            firstEventImage.setAttribute("alt", eventData.nome || "Logo do evento");
            firstEventImage.style.maxWidth = "78%";
            firstEventImage.style.height = "auto";
            firstEventImage.style.objectFit = "contain";

            var tituloDuplicado = encontrarTituloDoEvento();
            if (tituloDuplicado && !tituloDuplicado.contains(firstEventImage)) {
              tituloDuplicado.style.display = "none";
            }
          } else {
            var tituloEvento = encontrarTituloDoEvento();

            var logoCriada = document.createElement("img");
            logoCriada.setAttribute("src", eventData.logo);
            logoCriada.setAttribute("alt", eventData.nome || "Logo do evento");
            logoCriada.setAttribute("data-logo-evento", "true");
            logoCriada.style.display = "block";
            logoCriada.style.width = "min(78%, 520px)";
            logoCriada.style.maxHeight = "170px";
            logoCriada.style.objectFit = "contain";
            logoCriada.style.margin = "18px auto 12px";

            if (tituloEvento) {
              tituloEvento.innerHTML = "";
              tituloEvento.appendChild(logoCriada);
              tituloEvento.style.display = "block";
              tituloEvento.style.textAlign = "center";
              tituloEvento.style.lineHeight = "1";
              tituloEvento.style.margin = "24px auto 18px";
            } else {
              var cardParaLogo = document.querySelector(".card") || document.body;
              cardParaLogo.insertBefore(logoCriada, cardParaLogo.firstChild);
            }
          }
        }

        if (eventData.fundo) {
          var card = document.querySelector(".card");
          var motion = document.querySelector(".card-bg-motion");
          var bgValue = "linear-gradient(180deg, rgba(12, 28, 60, 0.68) 0%, rgba(10, 24, 54, 0.84) 45%, rgba(6, 14, 36, 0.96) 100%), url('" + eventData.fundo + "')";

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

  if (html.includes("</head>")) {
    return html.replace("</head>", `${previewCss}</head>`);
  }

  return `${previewCss}${html}`;
}

function preencherTemplate(html: string, evento: Evento | null) {
  if (!evento) return injetarModoPreview(html);

  const dataEvento = criarDataEvento(evento);
  const dataFormatada = formatarData(evento.data_evento);
  const horarioFormatado = formatarHorario(evento.horario);
  const local = evento.local || evento.endereco || "";
  const eventoDataIso = dataEvento?.toISOString() || "";
  const eventoDataScript = dataEvento?.toISOString() || "";

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

  return injetarModoPreview(
    preenchido
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
        `const EVENT_DATE = new Date(${JSON.stringify(eventoDataScript || eventoDataIso)});`
      )
      .replace(
        /const EVENT_END = new Date\(["'].*?["']\);/g,
        `const EVENT_END = new Date(${JSON.stringify(dataEvento ? new Date(dataEvento.getTime() + 4 * 60 * 60 * 1000).toISOString() : "")});`
      ),
    evento
  );
}

export default function ConvitePage() {
  const [tenantId, setTenantId] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState("");
  const [templateSelecionado, setTemplateSelecionado] = useState("");
  const [temaSelecionado, setTemaSelecionado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const eventoAtual = useMemo(() => {
    return eventos.find((evento) => evento.id === eventoSelecionado) || null;
  }, [eventos, eventoSelecionado]);

  const templateAtual = useMemo(() => {
    return templates.find((template) => template.id === templateSelecionado) || null;
  }, [templates, templateSelecionado]);

  const temas = useMemo(() => {
    const nomes = templates.map((template) => getCategoriaNome(template.categoria));
    return ["todos", ...Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b))];
  }, [templates]);

  const templatesFiltrados = useMemo(() => {
    if (temaSelecionado === "todos") return templates;

    return templates.filter((template) => getCategoriaNome(template.categoria) === temaSelecionado);
  }, [templates, temaSelecionado]);

  async function carregarDados() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      console.error("Erro ao buscar tenant:", membershipError);
      setLoading(false);
      return;
    }

    setTenantId(membership.tenant_id);

    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select("id,nome,data_evento,local,status,tenant_id,invite_template_id,created_at,horario,endereco,mapa_url,background_image,logo_image,music_file")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false });

    if (eventosError) {
      console.error("Erro ao buscar eventos:", eventosError);
      setLoading(false);
      return;
    }

    const eventosRows = (eventosData || []) as Evento[];
    setEventos(eventosRows);

    const eventoInicial = eventosRows[0];

    if (eventoInicial) {
      setEventoSelecionado(eventoInicial.id);
      setTemplateSelecionado(eventoInicial.invite_template_id || "");
    }

    const { data: templatesData, error: templatesError } = await supabase
      .from("invite_templates")
      .select(`
        id,
        nome,
        name,
        slug,
        preview_image,
        background_image,
        logo_image,
        html_template,
        active,
        tenant_id,
        categoria:invite_template_categories (
          nome
        )
      `)
      .eq("active", true)
      .or(`tenant_id.is.null,tenant_id.eq.${membership.tenant_id}`)
      .order("nome", { ascending: true });

    if (templatesError) {
      console.error("Erro ao buscar templates:", templatesError);
      setLoading(false);
      return;
    }

    setTemplates((templatesData || []).map((template) => ({
      ...template,
      categoria: Array.isArray(template.categoria)
        ? template.categoria[0] || null
        : template.categoria || null,
    })) as Template[]);
    setLoading(false);
  }

  function selecionarEvento(eventoId: string) {
    const evento = eventos.find((item) => item.id === eventoId);

    setEventoSelecionado(eventoId);
    setTemplateSelecionado(evento?.invite_template_id || "");
  }

  async function salvarTemplate() {
    if (!tenantId || !eventoSelecionado || !templateSelecionado) {
      alert("Selecione evento e modelo.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("eventos")
      .update({
        invite_template_id: templateSelecionado,
      })
      .eq("id", eventoSelecionado)
      .eq("tenant_id", tenantId);

    setSaving(false);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    setEventos((current) =>
      current.map((evento) =>
        evento.id === eventoSelecionado
          ? { ...evento, invite_template_id: templateSelecionado }
          : evento
      )
    );

    alert("Modelo aplicado ao evento.");
  }

  useEffect(() => {
    carregarDados();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>Convite Digital</h1>
      <p style={{ color: "#94a3b8", marginTop: 8 }}>
        Escolha o modelo criado no admin da OmniStage para aplicar ao evento do cliente.
      </p>

      {loading ? (
        <div style={emptyStyle}>Carregando eventos e modelos...</div>
      ) : (
        <>
          <section style={sectionStyle}>
            <label style={labelStyle}>Evento</label>

            <select
              value={eventoSelecionado}
              onChange={(event) => selecionarEvento(event.target.value)}
              style={selectStyle}
            >
              <option value="">Selecione...</option>

              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nome}
                </option>
              ))}
            </select>

            {eventoAtual && (
              <div style={{ color: "#94a3b8", marginTop: 10, display: "grid", gap: 6 }}>
                <p style={{ margin: 0 }}>
                  {eventoAtual.data_evento || "Sem data"} · {eventoAtual.local || "Sem local"} ·{" "}
                  {eventoAtual.status || "sem status"}
                </p>
                <p style={{ margin: 0, color: eventoAtual.logo_image ? "#86efac" : "#fbbf24" }}>
                  {eventoAtual.logo_image
                    ? "Logomarca carregada para este evento."
                    : "Este evento ainda está sem logomarca cadastrada."}
                </p>
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Modelos disponíveis</h2>
                <p style={{ color: "#94a3b8", margin: "8px 0 0" }}>
                  Filtre por tema e escolha pelo preview visual do convite.
                </p>
              </div>

              <select
                value={temaSelecionado}
                onChange={(event) => setTemaSelecionado(event.target.value)}
                style={filterSelectStyle}
              >
                {temas.map((tema) => (
                  <option key={tema} value={tema}>
                    {tema === "todos" ? "Todos os temas" : tema}
                  </option>
                ))}
              </select>
            </div>

            {templates.length === 0 && (
              <div style={emptyStyle}>
                Nenhum modelo ativo encontrado. Crie modelos em /admin/modelos-convites.
              </div>
            )}

            {templates.length > 0 && templatesFiltrados.length === 0 && (
              <div style={emptyStyle}>Nenhum modelo encontrado para este tema.</div>
            )}

            <div style={gridStyle}>
              {templatesFiltrados.map((template) => {
                const selected = templateSelecionado === template.id;
                const templateNome = template.nome || template.name || "Modelo";
                const preview = template.preview_image || template.background_image || "";
                const previewHtml = template.html_template
                  ? preencherTemplate(template.html_template, eventoAtual)
                  : "";

                return (
                  <button
                    key={template.id}
                    type="button"
                    style={{
                      ...templateCardStyle,
                      border: selected ? "2px solid #22c55e" : "1px solid #334155",
                    }}
                    onClick={() => setTemplateSelecionado(template.id)}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt={templateNome}
                        style={templateThumbStyle}
                      />
                    ) : template.html_template ? (
                      <div style={templateThumbFrameWrapStyle}>
                        <iframe
                          title={`Preview ${templateNome}`}
                          srcDoc={previewHtml}
                          style={templateThumbFrameStyle}
                        />
                      </div>
                    ) : (
                      <div style={templateThumbEmptyStyle}>Sem preview</div>
                    )}

                    <strong style={{ marginTop: 12 }}>{templateNome}</strong>
                    <span style={{ color: "#94a3b8", marginTop: 4 }}>
                      {getCategoriaNome(template.categoria)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Preview selecionado</h2>

            {!templateAtual && (
              <div style={emptyStyle}>Selecione um modelo para visualizar.</div>
            )}

            {templateAtual?.html_template ? (
              <iframe
                title={`Preview ${templateAtual.nome || templateAtual.name}`}
                srcDoc={preencherTemplate(templateAtual.html_template, eventoAtual)}
                style={previewFrameStyle}
              />
            ) : templateAtual?.preview_image || templateAtual?.background_image ? (
              <img
                src={templateAtual.preview_image || templateAtual.background_image || ""}
                alt={templateAtual.nome || templateAtual.name || "Preview do modelo"}
                style={previewImageStyle}
              />
            ) : null}
          </section>

          <button
            onClick={salvarTemplate}
            disabled={saving || !eventoSelecionado || !templateSelecionado}
            style={{
              ...buttonStyle,
              opacity: saving || !eventoSelecionado || !templateSelecionado ? 0.6 : 1,
            }}
          >
            {saving ? "Aplicando..." : "Aplicar modelo ao evento"}
          </button>
        </>
      )}
    </main>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: 28,
  padding: 20,
  borderRadius: 16,
  border: "1px solid #334155",
  background: "#020617",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 10,
  color: "#cbd5e1",
  fontWeight: 700,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 18,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
};

const filterSelectStyle: React.CSSProperties = {
  minWidth: 220,
  padding: 12,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 240px))",
  gap: 18,
};

const templateCardStyle: React.CSSProperties = {
  display: "grid",
  textAlign: "left",
  borderRadius: 18,
  padding: 14,
  cursor: "pointer",
  background: "#0f172a",
  color: "#fff",
  alignContent: "start",
};

const templateThumbStyle: React.CSSProperties = {
  width: "100%",
  height: 310,
  objectFit: "contain",
  borderRadius: 16,
  border: "1px solid #334155",
  background: "#020617",
};

const templateThumbFrameStyle: React.CSSProperties = {
  width: 430,
  height: 760,
  border: 0,
  background: "#020617",
  pointerEvents: "none",
  position: "absolute",
  left: "50%",
  top: 0,
  transform: "translateX(-50%) scale(0.38)",
  transformOrigin: "top center",
  overflow: "hidden",
};

const templateThumbFrameWrapStyle: React.CSSProperties = {
  width: "100%",
  height: 310,
  borderRadius: 16,
  border: "1px solid #334155",
  background: "#020617",
  overflow: "hidden",
  position: "relative",
};

const templateThumbEmptyStyle: React.CSSProperties = {
  width: "100%",
  height: 310,
  borderRadius: 16,
  border: "1px dashed #334155",
  display: "grid",
  placeItems: "center",
  color: "#94a3b8",
};

const emptyStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 18,
  borderRadius: 12,
  border: "1px dashed #334155",
  color: "#94a3b8",
};

const previewFrameStyle: React.CSSProperties = {
  width: "min(100%, 430px)",
  height: 760,
  display: "block",
  margin: "0 auto",
  borderRadius: 22,
  border: "1px solid #334155",
  background: "#020617",
};

const previewImageStyle: React.CSSProperties = {
  width: "min(100%, 430px)",
  maxHeight: 760,
  display: "block",
  margin: "0 auto",
  objectFit: "contain",
  borderRadius: 22,
  border: "1px solid #334155",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "14px 20px",
  borderRadius: 10,
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};
