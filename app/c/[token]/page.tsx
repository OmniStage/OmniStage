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

  return preenchido
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
        <label class="name-option selected">
          <input type="checkbox" checked name="guest-confirmation" />
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
