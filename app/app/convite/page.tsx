"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import {
  preencherTemplate,
  formatarData,
  formatarHorario,
  type EventoConvite,
  type VisualBlock,
} from "@/lib/convite-render";
import ConviteVisualRenderer from "@/components/ConviteVisualRenderer";

type Evento = EventoConvite & {
  status: string | null;
  tenant_id: string | null;
  invite_template_id: string | null;
  created_at: string | null;
  logo_url?: string | null;
  background_url?: string | null;
  musica_url?: string | null;
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
  editor_mode: "html" | "visual" | string | null;
  visual_config: any | null;
  active: boolean | null;
  tenant_id: string | null;
  categoria?: { nome: string } | { nome: string }[] | null;
};

const CANVAS_W = 430;
const CANVAS_H = 920;

function getCategoriaNome(categoria: Template["categoria"]) {
  if (Array.isArray(categoria)) {
    return categoria[0]?.nome || "Sem categoria";
  }

  return categoria?.nome || "Sem categoria";
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizarBlock(raw: any): VisualBlock {
  return {
    id: String(raw.id),
    template_id: String(raw.template_id),
    type: raw.type || "text",
    label: raw.label || null,
    content: raw.content || "",
    x: toNumber(raw.x, 0),
    y: toNumber(raw.y, 0),
    width: toNumber(raw.width, 200),
    height: toNumber(raw.height, 60),
    font_size: toNumber(raw.font_size, 24),
    font_family: raw.font_family || "Inter",
    color: raw.color || "#ffffff",
    background: raw.background || null,
    border_radius: toNumber(raw.border_radius, 0),
    z_index: toNumber(raw.z_index, 1),
    visible: raw.visible !== false,
  };
}

function getVisualConfig(template: Template | null) {
  return (template?.visual_config || {}) as Record<string, any>;
}

function getBackgroundUrl(template: Template | null, evento: Evento | null) {
  const visualConfig = getVisualConfig(template);

  return (
    evento?.background_url ||
    evento?.background_image ||
    visualConfig.backgroundPreviewUrl ||
    template?.background_image ||
    template?.preview_image ||
    ""
  );
}

function getLogoUrl(template: Template | null, evento: Evento | null) {
  const visualConfig = getVisualConfig(template);

  return (
    evento?.logo_url ||
    evento?.logo_image ||
    visualConfig.logoPreviewUrl ||
    template?.logo_image ||
    ""
  );
}

function getEventoPreview(
  evento: Evento | null,
  totalConvidados?: number,
) {
  const dataFormatada = formatarData(evento?.data_evento || null);

  const horaFormatada =
    formatarHorario(evento?.horario) ||
    String(evento?.horario || "")
      .trim()
      .replace("Horário", "")
      .replace("horário", "");

  const total = Number(totalConvidados || 0);

  return {
    nome_evento: evento?.nome || "Nome do Evento",

    nome_convidado: "Nome do Convidado",

    data_evento: dataFormatada || "",

    hora_evento: horaFormatada || "",

    horario_evento: horaFormatada || "",

    horario: horaFormatada || "",

    hora: horaFormatada || "",

    local_evento: evento?.local || "Local do Evento",

    endereco_evento:
      evento?.endereco || "Endereço do Evento",

    total_convidados: total || 1,
  };
}

function gerarHtmlPreview(template: Template | null, evento: Evento | null) {
  if (!template) return "";

  if (template.editor_mode === "visual") {
    return "";
  }

  if (template.html_template) {
    return preencherTemplate(template.html_template, evento);
  }

  return "";
}

function VisualPreviewCard({
  template,
  evento,
  blocks,
  totalConvidados = 0,
}: {
  template: Template;
  evento: Evento | null;
  blocks: VisualBlock[];
  totalConvidados?: number;
}) {
  const visualConfig = getVisualConfig(template);
  const scale = 0.43;

  return (
    <div style={templateThumbFrameWrapStyle}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          transform: "translateX(-50%)",
        }}
      >
        <ConviteVisualRenderer
          blocks={blocks}
          backgroundUrl={getBackgroundUrl(template, evento)}
          logoUrl={getLogoUrl(template, evento)}
          width={CANVAS_W}
          height={CANVAS_H}
          scale={scale}
          backgroundX={toNumber(visualConfig.backgroundX, 0)}
          backgroundY={toNumber(visualConfig.backgroundY, 0)}
          backgroundScale={toNumber(visualConfig.backgroundScale, 1)}
          backgroundOpacity={toNumber(visualConfig.backgroundOpacity, 1)}
          glassOpacity={toNumber(visualConfig.glassOpacity, 0.18)}
          glassBlur={toNumber(visualConfig.glassBlur, 0)}
          glassTone={visualConfig.glassTone === "light" ? "light" : "dark"}
          blockEffects={visualConfig.blockEffects || {}}
          evento={getEventoPreview(evento, totalConvidados)}
        />
      </div>
    </div>
  );
}

function VisualPreviewGrande({
  template,
  evento,
  blocks,
  totalConvidados = 0,
}: {
  template: Template;
  evento: Evento | null;
  blocks: VisualBlock[];
  totalConvidados?: number;
}) {
  const visualConfig = getVisualConfig(template);

  return (
    <div style={visualPreviewLargeWrapStyle}>
      <ConviteVisualRenderer
        blocks={blocks}
        backgroundUrl={getBackgroundUrl(template, evento)}
        logoUrl={getLogoUrl(template, evento)}
        width={CANVAS_W}
        height={CANVAS_H}
        scale={1}
        backgroundX={toNumber(visualConfig.backgroundX, 0)}
        backgroundY={toNumber(visualConfig.backgroundY, 0)}
        backgroundScale={toNumber(visualConfig.backgroundScale, 1)}
        backgroundOpacity={toNumber(visualConfig.backgroundOpacity, 1)}
        glassOpacity={toNumber(visualConfig.glassOpacity, 0.18)}
        glassBlur={toNumber(visualConfig.glassBlur, 0)}
        glassTone={visualConfig.glassTone === "light" ? "light" : "dark"}
        blockEffects={visualConfig.blockEffects || {}}
        evento={getEventoPreview(evento, totalConvidados)}
      />
    </div>
  );
}

export default function ConvitePage() {
  const [tenantId, setTenantId] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateBlocks, setTemplateBlocks] = useState<Record<string, VisualBlock[]>>({});
  const [eventoSelecionado, setEventoSelecionado] = useState("");
  const [templateSelecionado, setTemplateSelecionado] = useState("");
  const [temaSelecionado, setTemaSelecionado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});

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

  async function carregarTemplatesPermitidos(eventoId: string, tenantIdAtual: string) {
    if (!eventoId || !tenantIdAtual) {
      setTemplates([]);
      setTemplateBlocks({});
      return [] as Template[];
    }

    const { data: vinculosData, error: vinculosError } = await supabase
      .from("event_invite_templates")
      .select(`
        template:invite_templates (
          id,
          nome,
          name,
          slug,
          preview_image,
          background_image,
          logo_image,
          html_template,
          editor_mode,
          visual_config,
          active,
          tenant_id,
          categoria:invite_template_categories (
            nome
          )
        )
      `)
      .eq("evento_id", eventoId);

    if (vinculosError) {
      console.error("Erro ao buscar modelos vinculados ao evento:", vinculosError);
      setTemplates([]);
      setTemplateBlocks({});
      return [] as Template[];
    }

    const templatesRows = (vinculosData || [])
      .map((row: any) => row.template)
      .filter(Boolean)
      .filter((template: any) => template.active === true)
      .filter((template: any) => !template.tenant_id || template.tenant_id === tenantIdAtual)
      .map((template: any) => ({
        ...template,
        editor_mode: template.editor_mode || "html",
        categoria: Array.isArray(template.categoria)
          ? template.categoria[0] || null
          : template.categoria || null,
      })) as Template[];

    setTemplates(templatesRows);

    const visualIds = templatesRows
      .filter((template) => template.editor_mode === "visual")
      .map((template) => template.id);

    if (visualIds.length) {
      const { data: blocksData, error: blocksError } = await supabase
        .from("invite_template_blocks")
        .select("*")
        .in("template_id", visualIds)
        .order("z_index", { ascending: true });

      if (blocksError) {
        console.error("Erro ao buscar blocos visuais:", blocksError);
        setTemplateBlocks({});
      } else {
        const grouped: Record<string, VisualBlock[]> = {};

        for (const raw of blocksData || []) {
          const block = normalizarBlock(raw);
          if (!grouped[block.template_id]) grouped[block.template_id] = [];
          grouped[block.template_id].push(block);
        }

        setTemplateBlocks(grouped);
      }
    } else {
      setTemplateBlocks({});
    }

    return templatesRows;
  }

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
        background_url,
        logo_image,
        logo_url,
        music_file,
        musica_url
      `)
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false });

    if (eventosError) {
      console.error("Erro ao buscar eventos:", eventosError);
      setLoading(false);
      return;
    }

    const eventosRows = (eventosData || []) as Evento[];
    const eventoIds = eventosRows.map((e) => e.id);

    if (eventoIds.length) {
      const { data: convidadosCount, error: convidadosCountError } = await supabase
        .from("convidados")
        .select("evento_id")
        .in("evento_id", eventoIds);

      if (convidadosCountError) {
        console.error("Erro ao contar convidados:", convidadosCountError);
        setGuestCounts({});
      } else {
        const counts: Record<string, number> = {};

        for (const item of convidadosCount || []) {
          const eventoId = item.evento_id;

          if (!eventoId) continue;

          counts[eventoId] = (counts[eventoId] || 0) + 1;
        }

        setGuestCounts(counts);
      }
    } else {
      setGuestCounts({});
    }

    setEventos(eventosRows);

    const eventoInicial = eventosRows[0];

    if (eventoInicial) {
      setEventoSelecionado(eventoInicial.id);
      const templatesPermitidos = await carregarTemplatesPermitidos(
        eventoInicial.id,
        membership.tenant_id
      );
      const modeloSalvoEstaPermitido = templatesPermitidos.some(
        (template) => template.id === eventoInicial.invite_template_id
      );
      setTemplateSelecionado(
        modeloSalvoEstaPermitido
          ? eventoInicial.invite_template_id || ""
          : templatesPermitidos[0]?.id || ""
      );
    } else {
      setEventoSelecionado("");
      setTemplateSelecionado("");
      setTemplates([]);
      setTemplateBlocks({});
    }

    setLoading(false);
  }

  async function selecionarEvento(eventoId: string) {
    const evento = eventos.find((item) => item.id === eventoId);

    setEventoSelecionado(eventoId);
    setTemaSelecionado("todos");
    setTemplates([]);
    setTemplateBlocks({});

    if (!eventoId || !tenantId) {
      setTemplateSelecionado("");
      return;
    }

    const templatesPermitidos = await carregarTemplatesPermitidos(eventoId, tenantId);
    const modeloSalvoEstaPermitido = templatesPermitidos.some(
      (template) => template.id === evento?.invite_template_id
    );

    setTemplateSelecionado(
      modeloSalvoEstaPermitido
        ? evento?.invite_template_id || ""
        : templatesPermitidos[0]?.id || ""
    );
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
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>OMNISTAGE CONVITES</div>
          <h1 style={titleStyle}>Convite Digital</h1>
          <p style={subtitleStyle}>
            Escolha o modelo criado no admin para aplicar ao evento do cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarDados}
          style={ghostButtonStyle}
        >
          Atualizar modelos
        </button>
      </section>

      {loading ? (
        <div style={emptyStyle}>Carregando eventos e modelos...</div>
      ) : (
        <>
          <section style={sectionStyle}>
            <div style={eventSectionGridStyle}>
              <div>
                <div style={sectionKickerStyle}>Evento selecionado</div>
                <h2 style={sectionTitleStyle}>Modelo do convite</h2>
                <p style={sectionDescriptionStyle}>
                  Escolha o evento para visualizar os modelos com os dados reais do cadastro.
                </p>
              </div>

              <label style={eventSelectWrapStyle}>
                <span style={labelStyle}>Evento</span>
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
              </label>
            </div>

            {eventoAtual && (
              <div style={eventInfoBarStyle}>
                <span>{eventoAtual.data_evento || "Sem data"}</span>
                <span>{eventoAtual.local || "Sem local"}</span>
                <span>{eventoAtual.status || "sem status"}</span>
                <strong
                  style={{
                    color:
                      eventoAtual.logo_url || eventoAtual.logo_image
                        ? "#16a34a"
                        : "#b45309",
                  }}
                >
                  {eventoAtual.logo_url || eventoAtual.logo_image
                    ? "Logomarca carregada"
                    : "Sem logomarca"}
                </strong>
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={sectionKickerStyle}>Biblioteca</div>
                <h2 style={sectionTitleStyle}>Modelos disponíveis</h2>
                <p style={sectionDescriptionStyle}>
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
                Nenhum modelo vinculado a este evento. Vincule o modelo no Admin em Modelos de Convite &gt; Eventos.
              </div>
            )}

            {templates.length > 0 && templatesFiltrados.length === 0 && (
              <div style={emptyStyle}>Nenhum modelo encontrado para este tema.</div>
            )}

            <div style={gridStyle}>
              {templatesFiltrados.map((template) => {
                const selected = templateSelecionado === template.id;
                const templateNome = template.nome || template.name || "Modelo";
                const isVisual = template.editor_mode === "visual";
                const preview = template.preview_image || template.background_image || "";
                const previewHtml = gerarHtmlPreview(template, eventoAtual);
                const blocks = templateBlocks[template.id] || [];

                return (
                  <button
                    key={template.id}
                    type="button"
                    style={{
                      ...templateCardStyle,
                      border: selected ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                      boxShadow: selected
                        ? "0 20px 55px rgba(124,58,237,0.20)"
                        : "0 10px 35px rgba(15,23,42,0.06)",
                    }}
                    onClick={() => setTemplateSelecionado(template.id)}
                  >
                    {isVisual && blocks.length ? (
                      <VisualPreviewCard
                        template={template}
                        evento={eventoAtual}
                        blocks={blocks}
                        totalConvidados={guestCounts[eventoAtual?.id || ""] || 0}
                      />
                    ) : template.html_template ? (
                      <div style={templateThumbFrameWrapStyle}>
                        <iframe
                          title={`Preview ${templateNome}`}
                          srcDoc={previewHtml}
                          style={templateThumbFrameStyle}
                        />
                      </div>
                    ) : preview ? (
                      <img src={preview} alt={templateNome} style={templateThumbStyle} />
                    ) : (
                      <div style={templateThumbEmptyStyle}>Sem preview</div>
                    )}

                    <strong style={templateNameStyle}>{templateNome}</strong>
                    <span style={templateCategoryStyle}>
                      {getCategoriaNome(template.categoria)}
                    </span>
                    <span style={isVisual ? visualBadgeStyle : htmlBadgeStyle}>
                      {isVisual ? "Editor visual" : "HTML"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionKickerStyle}>Visualização</div>
            <h2 style={sectionTitleStyle}>Preview selecionado</h2>

            {!templateAtual && <div style={emptyStyle}>Selecione um modelo para visualizar.</div>}

            {templateAtual?.editor_mode === "visual" && templateBlocks[templateAtual.id]?.length ? (
              <VisualPreviewGrande
                template={templateAtual}
                evento={eventoAtual}
                blocks={templateBlocks[templateAtual.id] || []}
                totalConvidados={guestCounts[eventoAtual?.id || ""] || 0}
              />
            ) : templateAtual && gerarHtmlPreview(templateAtual, eventoAtual) ? (
              <iframe
                title={`Preview ${templateAtual.nome || templateAtual.name}`}
                srcDoc={gerarHtmlPreview(templateAtual, eventoAtual)}
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

const pageStyle: CSSProperties = {
  color: "#0f172a",
  display: "grid",
  gap: 24,
};

const heroStyle: CSSProperties = {
  padding: 34,
  borderRadius: 34,
  border: "1px solid #e2e8f0",
  background: "linear-gradient(135deg,#ffffff,#f8fafc)",
  boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  color: "#6d28d9",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 46,
  lineHeight: 1.02,
  fontWeight: 950,
  letterSpacing: "-0.045em",
  color: "#0f172a",
};

const subtitleStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "#64748b",
  fontSize: 18,
  lineHeight: 1.45,
};

const sectionStyle: CSSProperties = {
  padding: 28,
  borderRadius: 30,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 14px 45px rgba(15,23,42,0.07)",
};

const eventSectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 520px)",
  gap: 22,
  alignItems: "end",
};

const eventSelectWrapStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const eventInfoBarStyle: CSSProperties = {
  marginTop: 20,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
  color: "#64748b",
  fontWeight: 800,
};

const sectionKickerStyle: CSSProperties = {
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 28,
  lineHeight: 1.08,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const sectionDescriptionStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.45,
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "#334155",
  fontSize: 14,
  fontWeight: 900,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 22,
  flexWrap: "wrap",
};

const selectStyle: CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "0 16px",
  borderRadius: 16,
  background: "#ffffff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  fontSize: 15,
  fontWeight: 800,
  outline: "none",
};

const filterSelectStyle: CSSProperties = {
  minWidth: 240,
  minHeight: 48,
  padding: "0 16px",
  borderRadius: 999,
  background: "#ffffff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  fontSize: 14,
  fontWeight: 800,
  outline: "none",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 22,
};

const templateCardStyle: CSSProperties = {
  display: "grid",
  textAlign: "left",
  borderRadius: 28,
  padding: 16,
  cursor: "pointer",
  background: "#ffffff",
  color: "#0f172a",
  alignContent: "start",
  transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
};

const templateNameStyle: CSSProperties = {
  marginTop: 14,
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 950,
};

const templateCategoryStyle: CSSProperties = {
  color: "#64748b",
  marginTop: 5,
  fontSize: 13,
  fontWeight: 750,
};

const visualBadgeStyle: CSSProperties = {
  width: "fit-content",
  marginTop: 10,
  padding: "7px 10px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 12,
  fontWeight: 900,
};

const htmlBadgeStyle: CSSProperties = {
  width: "fit-content",
  marginTop: 10,
  padding: "7px 10px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 900,
};

const templateThumbStyle: CSSProperties = {
  width: "100%",
  height: 390,
  objectFit: "cover",
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const templateThumbFrameStyle: CSSProperties = {
  width: 430,
  height: 920,
  border: 0,
  background: "#ffffff",
  pointerEvents: "none",
  position: "absolute",
  left: "50%",
  top: 0,
  transform: "translateX(-50%) scale(0.43)",
  transformOrigin: "top center",
  overflow: "hidden",
};

const templateThumbFrameWrapStyle: CSSProperties = {
  width: "100%",
  height: 390,
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
  overflow: "hidden",
  position: "relative",
};

const templateThumbEmptyStyle: CSSProperties = {
  width: "100%",
  height: 390,
  borderRadius: 22,
  border: "1px dashed #cbd5e1",
  display: "grid",
  placeItems: "center",
  color: "#64748b",
  background: "#f8fafc",
  fontWeight: 900,
};

const emptyStyle: CSSProperties = {
  marginTop: 14,
  padding: 20,
  borderRadius: 18,
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  background: "#f8fafc",
  fontWeight: 800,
};

const previewFrameStyle: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  height: 860,
  display: "block",
  margin: "22px auto 0",
  borderRadius: 34,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 24px 70px rgba(15,23,42,0.14)",
};

const previewImageStyle: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  maxHeight: 860,
  display: "block",
  margin: "22px auto 0",
  objectFit: "contain",
  borderRadius: 34,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 24px 70px rgba(15,23,42,0.14)",
};

const visualPreviewLargeWrapStyle: CSSProperties = {
  width: CANVAS_W,
  height: CANVAS_H,
  maxWidth: "100%",
  display: "block",
  margin: "22px auto 0",
  borderRadius: 34,
  overflow: "hidden",
  background: "#020617",
  boxShadow: "0 24px 70px rgba(15,23,42,0.14)",
};

const buttonStyle: CSSProperties = {
  width: "fit-content",
  marginTop: 4,
  padding: "17px 24px",
  borderRadius: 18,
  background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
  border: "none",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 16px 40px rgba(124,58,237,0.26)",
};

const ghostButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 16,
  background: "#7c3aed",
  border: "none",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(124,58,237,0.22)",
};

