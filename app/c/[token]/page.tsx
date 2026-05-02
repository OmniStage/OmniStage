"use client";

import { useEffect, useState } from "react";
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
};

type Template = {
  id: string;
  html_template: string | null;
};

export default function ConvitePublicoPage({ params }: { params: { token: string } }) {
  const [htmlFinal, setHtmlFinal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarConvite();
  }, []);

  async function carregarConvite() {
    setLoading(true);

    const token = decodeURIComponent(params.token);

    const { data: convidado, error: convidadoError } = await supabase
      .from("convidados")
      .select("id,nome,token,evento_id,grupo")
      .eq("token", token)
      .maybeSingle();

    if (convidadoError || !convidado) {
      setHtmlFinal("<h1 style='color:white;text-align:center'>Convite não encontrado.</h1>");
      setLoading(false);
      return;
    }

    const { data: evento, error: eventoError } = await supabase
      .from("eventos")
      .select("id,nome,data_evento,horario,local,endereco,mapa_url,invite_template_id")
      .eq("id", convidado.evento_id)
      .maybeSingle();

    if (eventoError || !evento?.invite_template_id) {
      setHtmlFinal("<h1 style='color:white;text-align:center'>Evento sem convite aplicado.</h1>");
      setLoading(false);
      return;
    }

    const { data: template, error: templateError } = await supabase
      .from("invite_templates")
      .select("id,html_template")
      .eq("id", evento.invite_template_id)
      .maybeSingle();

    if (templateError || !template?.html_template) {
      setHtmlFinal("<h1 style='color:white;text-align:center'>Modelo de convite não encontrado.</h1>");
      setLoading(false);
      return;
    }

    let nomesDoConvite = [convidado.nome];

    if (convidado.grupo) {
      const { data: grupoData } = await supabase
        .from("convidados")
        .select("nome")
        .eq("evento_id", convidado.evento_id)
        .eq("grupo", convidado.grupo)
        .order("nome");

      if (grupoData && grupoData.length > 0) {
        nomesDoConvite = grupoData.map((item) => item.nome);
      }
    }

    const html = montarHtmlConvite(template.html_template, evento, convidado, nomesDoConvite);
    setHtmlFinal(html);
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

function montarHtmlConvite(
  html: string,
  evento: Evento,
  convidado: Convidado,
  nomesDoConvite: string[]
) {
  const nomeConvidado = convidado.nome || "";
  const dataFormatada = formatarData(evento.data_evento);
  const horario = evento.horario || "";
  const local = evento.local || evento.endereco || "";

  const nomesHtml = nomesDoConvite
    .map(
      (nome) => `
        <label class="name-option selected" style="display:flex;align-items:center;gap:10px;justify-content:center;margin:8px auto;color:#fff;font-family:Georgia,'Times New Roman',serif;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">
          <input type="checkbox" checked style="accent-color:#d4af37;" />
          <span>${escapeHtml(nome)}</span>
        </label>
      `
    )
    .join("");

  const nomesTexto = nomesDoConvite.join(", ");

  const script = `
    <script>
      window.__OMNISTAGE_GUEST__ = ${JSON.stringify({
        nome: nomeConvidado,
        nomes: nomesDoConvite,
        token: convidado.token,
        grupo: convidado.grupo || "",
        evento: evento.nome,
        data: dataFormatada,
        horario,
        local,
        mapa: evento.mapa_url || "",
      })};

      window.addEventListener("DOMContentLoaded", function () {
        var guest = window.__OMNISTAGE_GUEST__;

        var guestName = document.getElementById("guestName");
        if (guestName) {
          guestName.textContent = guest.nomes.length > 1 ? guest.grupo || "CONVITE FAMÍLIA" : guest.nome;
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
        }

        var mapsLink = document.getElementById("mapsLink");
        if (mapsLink && guest.mapa) {
          mapsLink.href = guest.mapa;
        }
      });
    </script>
  `;

  let finalHtml = html
    .replaceAll("{{NOME_CONVIDADO}}", nomeConvidado)
    .replaceAll("{{nome_convidado}}", nomeConvidado)
    .replaceAll("{{NOMES_CONVIDADOS}}", nomesTexto)
    .replaceAll("{{nomes_convidados}}", nomesTexto)
    .replaceAll("{{GRUPO_CONVIDADO}}", convidado.grupo || "")
    .replaceAll("{{grupo_convidado}}", convidado.grupo || "")
    .replaceAll("{{EVENTO_NOME}}", evento.nome || "")
    .replaceAll("{{evento_nome}}", evento.nome || "")
    .replaceAll("{{DATA_EVENTO}}", dataFormatada)
    .replaceAll("{{data_evento}}", dataFormatada)
    .replaceAll("{{HORARIO_EVENTO}}", horario)
    .replaceAll("{{horario_evento}}", horario)
    .replaceAll("{{LOCAL_EVENTO}}", local)
    .replaceAll("{{local_evento}}", local);

  if (finalHtml.includes("</body>")) {
    finalHtml = finalHtml.replace("</body>", `${script}</body>`);
  } else {
    finalHtml += script;
  }

  return finalHtml;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
