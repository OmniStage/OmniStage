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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const eventoAtual = useMemo(() => {
    return eventos.find((evento) => evento.id === eventoSelecionado) || null;
  }, [eventos, eventoSelecionado]);

  const templateAtual = useMemo(() => {
    return templates.find((template) => template.id === templateSelecionado) || null;
  }, [templates, templateSelecionado]);

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
      .select("id,nome,data_evento,local,status,tenant_id,invite_template_id,created_at")
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
              <p style={{ color: "#94a3b8", marginTop: 10 }}>
                {eventoAtual.data_evento || "Sem data"} · {eventoAtual.local || "Sem local"} ·{" "}
                {eventoAtual.status || "sem status"}
              </p>
            )}
          </section>

          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Modelos disponíveis</h2>

            {templates.length === 0 && (
              <div style={emptyStyle}>
                Nenhum modelo ativo encontrado. Crie modelos em /admin/modelos-convites.
              </div>
            )}

            <div style={gridStyle}>
              {templates.map((template) => {
                const selected = templateSelecionado === template.id;
                const templateNome = template.nome || template.name || "Modelo";
                const preview = template.preview_image || template.background_image || "";

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
                    <strong>{templateNome}</strong>
                    <span style={{ color: "#94a3b8", marginTop: 6 }}>
                      {getCategoriaNome(template.categoria)} · /{template.slug}
                    </span>
                    <span style={{ color: template.tenant_id ? "#a78bfa" : "#facc15", marginTop: 6 }}>
                      {template.tenant_id ? "Modelo do cliente" : "Modelo global OmniStage"}
                    </span>

                    {preview && (
                      <img
                        src={preview}
                        alt={templateNome}
                        style={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "cover",
                          borderRadius: 12,
                          marginTop: 14,
                        }}
                      />
                    )}
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
                srcDoc={templateAtual.html_template}
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

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const templateCardStyle: React.CSSProperties = {
  display: "grid",
  textAlign: "left",
  borderRadius: 16,
  padding: 18,
  cursor: "pointer",
  background: "#0f172a",
  color: "#fff",
};

const emptyStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 18,
  borderRadius: 12,
  border: "1px dashed #334155",
  color: "#94a3b8",
};

const previewFrameStyle: React.CSSProperties = {
  width: "100%",
  height: 720,
  borderRadius: 16,
  border: "1px solid #334155",
  background: "#020617",
};

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 420,
  objectFit: "cover",
  borderRadius: 16,
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
