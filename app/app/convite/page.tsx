"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { preencherTemplate, type EventoConvite } from "@/lib/convite-render";

type Evento = EventoConvite & {
  status: string | null;
  tenant_id: string | null;
  invite_template_id: string | null;
  created_at: string | null;
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
      .select(`
        id,
        nome,
        data_evento,
        local,
        status,
        tenant_id,
        invite_template_id,
        created_at,
        horario,
        endereco,
        mapa_url,
        background_image,
        logo_image,
        music_file
      `)
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

    setTemplates(
      (templatesData || []).map((template) => ({
        ...template,
        categoria: Array.isArray(template.categoria)
          ? template.categoria[0] || null
          : template.categoria || null,
      })) as Template[]
    );

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
                      <img src={preview} alt={templateNome} style={templateThumbStyle} />
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

            {!templateAtual && <div style={emptyStyle}>Selecione um modelo para visualizar.</div>}

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
