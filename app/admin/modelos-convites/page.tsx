"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

function useViewportWidth() {
  const [width, setWidth] = useState(1440);

  useEffect(() => {
    function update() {
      setWidth(window.innerWidth);
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

function AutoScaledIframe({
  html,
  title = "Preview",
  baseWidth = 430,
  baseHeight = 920,
  maxHeight = 420,
}: {
  html: string;
  title?: string;
  baseWidth?: number;
  baseHeight?: number;
  maxHeight?: number;
}) {
  const [scale, setScale] = useState(1);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container) return;

    function resize() {
  if (!container) return;

  const availableWidth = container.clientWidth;
  const nextScale = Math.min(availableWidth / baseWidth, 1);

  setScale(nextScale);
}

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [container, baseWidth]);

  return (
    <div
      ref={setContainer}
      style={{
        width: "100%",
        height: maxHeight,
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid #dbe3ef",
        background: "#020617",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <iframe
        title={title}
        srcDoc={html}
        style={{
          width: baseWidth,
          height: baseHeight,
          border: "none",
          background: "#020617",
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

function AutoScaledImage({
  src,
  alt,
  maxHeight = 420,
}: {
  src: string;
  alt: string;
  maxHeight?: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: maxHeight,
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid #dbe3ef",
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

export default function ModelosConvitePage() {
  const viewport = useViewportWidth();

  const isMobile = viewport < 760;
  const isTablet = viewport >= 760 && viewport < 1100;

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [preview, setPreview] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState("");

  const [novaCategoria, setNovaCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const totalModelos = templates.length;
  const modelosAtivos = templates.filter((t) => t.active).length;
  const modelosInativos = templates.filter((t) => !t.active).length;

  const categoriaSelecionada = useMemo(() => {
    return categorias.find((c) => c.id === categoriaId);
  }, [categorias, categoriaId]);

  function gerarSlug(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }

  useEffect(() => {
    if (!editandoId) setSlug(gerarSlug(nome));
  }, [nome, editandoId]);

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from("invite_template_categories")
      .select("*")
      .eq("active", true)
      .order("nome");

    if (error) return alert("Erro ao carregar categorias: " + error.message);

    setCategorias(data || []);
  }

  async function criarCategoria() {
    if (!novaCategoria.trim()) return alert("Digite o nome da categoria");

    setSalvandoCategoria(true);

    const { error } = await supabase.from("invite_template_categories").insert({
      nome: novaCategoria.trim(),
      slug: gerarSlug(novaCategoria),
      active: true,
    });

    setSalvandoCategoria(false);

    if (error) return alert("Erro ao criar categoria: " + error.message);

    setNovaCategoria("");
    await carregarCategorias();
    alert("Categoria criada!");
  }

  async function carregarTemplates() {
    const { data, error } = await supabase
      .from("invite_templates")
      .select(`
        *,
        categoria:invite_template_categories (
          id,
          nome
        )
      `)
      .order("created_at", { ascending: false });

    if (error) return alert("Erro ao carregar modelos: " + error.message);

    setTemplates(data || []);
  }

  function limparFormulario() {
    setNome("");
    setSlug("");
    setCategoriaId("");
    setPreview("");
    setHtmlTemplate("");
    setEditandoId(null);
  }

  async function criarTemplate() {
    if (!nome.trim()) return alert("Digite o nome do modelo");
    if (!htmlTemplate.trim()) return alert("Cole o código HTML do modelo");

    setLoading(true);

    const { error } = await supabase.from("invite_templates").insert({
      nome: nome.trim(),
      name: nome.trim(),
      slug,
      categoria_id: categoriaId || null,
      preview_image: preview.trim() || null,
      html_template: htmlTemplate.trim(),
      active: true,
    });

    setLoading(false);

    if (error) return alert("Erro: " + error.message);

    limparFormulario();
    await carregarTemplates();
    alert("Modelo criado!");
  }

  function editarTemplate(t: any) {
    setEditandoId(t.id);
    setNome(t.nome || t.name || "");
    setSlug(t.slug || "");
    setCategoriaId(t.categoria_id || "");
    setPreview(t.preview_image || "");
    setHtmlTemplate(t.html_template || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarEdicao() {
    if (!editandoId) return;
    if (!nome.trim()) return alert("Digite o nome do modelo");
    if (!htmlTemplate.trim()) return alert("Cole o código HTML do modelo");

    setLoading(true);

    const { error } = await supabase
      .from("invite_templates")
      .update({
        nome: nome.trim(),
        name: nome.trim(),
        slug,
        categoria_id: categoriaId || null,
        preview_image: preview.trim() || null,
        html_template: htmlTemplate.trim(),
      })
      .eq("id", editandoId);

    setLoading(false);

    if (error) return alert("Erro ao salvar edição: " + error.message);

    limparFormulario();
    await carregarTemplates();
    alert("Modelo atualizado!");
  }

  async function alternarStatus(id: string, active: boolean) {
    const { error } = await supabase
      .from("invite_templates")
      .update({ active: !active })
      .eq("id", id);

    if (error) return alert("Erro ao alterar status: " + error.message);

    carregarTemplates();
  }

  async function duplicarTemplate(template: any) {
    const novoNome = `${template.nome || template.name || "Modelo"} - Cópia`;

    const { error } = await supabase.from("invite_templates").insert({
      nome: novoNome,
      name: novoNome,
      slug: `${template.slug || gerarSlug(novoNome)}-copia-${Date.now()}`,
      categoria_id: template.categoria_id || null,
      preview_image: template.preview_image || null,
      html_template: template.html_template || "",
      active: false,
    });

    if (error) return alert("Erro ao duplicar: " + error.message);

    carregarTemplates();
    alert("Modelo duplicado!");
  }

  async function deletarTemplate(id: string) {
    const { data: eventosUsando, error: usoError } = await supabase
      .from("eventos")
      .select("id")
      .eq("invite_template_id", id)
      .limit(1);

    if (usoError) {
      return alert("Erro ao verificar uso do modelo: " + usoError.message);
    }

    if (eventosUsando && eventosUsando.length > 0) {
      alert(
        "Este modelo já está sendo usado em evento. Desative ou duplique, mas não exclua."
      );
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;

    const { error } = await supabase
      .from("invite_templates")
      .delete()
      .eq("id", id);

    if (error) return alert("Erro ao excluir: " + error.message);

    carregarTemplates();
  }

  useEffect(() => {
    carregarCategorias();
    carregarTemplates();
  }, []);

  const pageStyle: CSSProperties = {
    ...page,
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    padding: isMobile ? "18px 14px 44px" : "32px 32px 56px",
  };

  const heroStyle: CSSProperties = {
    ...hero,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
  };

  const statsGridStyle: CSSProperties = {
    ...statsGrid,
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
  };

  const categoryRowStyle: CSSProperties = {
    ...categoryRow,
    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
  };

  const editorGridStyle: CSSProperties = {
    ...editorGrid,
    gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 500px",
  };

  const formGridStyle: CSSProperties = {
    ...formGrid,
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
  };

  const modelsGridStyle: CSSProperties = {
    ...modelsGrid,
    gridTemplateColumns: isMobile
      ? "1fr"
      : isTablet
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(3, minmax(0, 1fr))",
    width: "100%",
  };

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrow}>Admin OmniStage</div>
          <h1 style={{ ...h1, fontSize: isMobile ? 32 : 40 }}>
            Modelos de Convite
          </h1>
          <p style={subtitle}>
            Crie, edite e organize templates HTML reutilizáveis para eventos e
            clientes.
          </p>
        </div>

        <button onClick={limparFormulario} style={btnPrimary}>
          + Novo modelo
        </button>
      </section>

      <section style={statsGridStyle}>
        <div style={statCard}>
          <span style={statLabel}>Total</span>
          <strong style={statValue}>{totalModelos}</strong>
        </div>

        <div style={statCard}>
          <span style={statLabel}>Ativos</span>
          <strong style={statValue}>{modelosAtivos}</strong>
        </div>

        <div style={statCard}>
          <span style={statLabel}>Inativos</span>
          <strong style={statValue}>{modelosInativos}</strong>
        </div>

        <div style={statCard}>
          <span style={statLabel}>Categorias</span>
          <strong style={statValue}>{categorias.length}</strong>
        </div>
      </section>

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <h2 style={h2}>Categorias</h2>
            <p style={smallText}>Organize os modelos por tipo de evento.</p>
          </div>
        </div>

        <div style={categoryRowStyle}>
          <input
            placeholder="Nova categoria: 15 anos, Casamento, Infantil..."
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            style={input}
          />

          <button
            onClick={criarCategoria}
            style={btnGreen}
            disabled={salvandoCategoria}
          >
            {salvandoCategoria ? "Criando..." : "Criar categoria"}
          </button>
        </div>

        <div style={chips}>
          {categorias.length === 0 && (
            <span style={emptyText}>Nenhuma categoria cadastrada.</span>
          )}

          {categorias.map((c) => (
            <span key={c.id} style={pill}>
              {c.nome}
            </span>
          ))}
        </div>
      </section>

      <section style={editorGridStyle}>
        <div style={card}>
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>{editandoId ? "Editar modelo" : "Novo modelo"}</h2>
              <p style={smallText}>
                Cadastre o HTML principal que será usado no convite.
              </p>
            </div>

            {editandoId && <span style={editBadge}>Editando</span>}
          </div>

          <div style={formGridStyle}>
            <label style={field}>
              <span style={label}>Nome do modelo</span>
              <input
                placeholder="Ex: Convite Luxo 15 anos"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={input}
              />
            </label>

            <label style={field}>
              <span style={label}>Categoria</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                style={input}
              >
                <option value="">Selecione a categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label style={field}>
              <span style={label}>Slug</span>
              <input
                placeholder="convite-luxo-15-anos"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                style={input}
              />
            </label>

            <label style={field}>
              <span style={label}>Preview URL</span>
              <input
                placeholder="https://..."
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
                style={input}
              />
            </label>
          </div>

          <label style={field}>
            <span style={label}>Código HTML</span>
            <textarea
              placeholder="Cole aqui o código HTML do modelo..."
              value={htmlTemplate}
              onChange={(e) => setHtmlTemplate(e.target.value)}
              style={textarea}
            />
          </label>

          <div style={actionsBar}>
            <button
              onClick={editandoId ? salvarEdicao : criarTemplate}
              style={btnPrimary}
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : editandoId
                ? "Salvar alteração"
                : "Criar modelo"}
            </button>

            <button onClick={limparFormulario} style={btnGhost}>
              Limpar
            </button>
          </div>
        </div>

        <aside
          style={{
            ...previewCard,
            position: isMobile || isTablet ? "relative" : "sticky",
          }}
        >
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>Preview ao vivo</h2>
              <p style={smallText}>Veja como o HTML renderiza antes de salvar.</p>
            </div>
          </div>

          <div style={previewMeta}>
            <span style={previewName}>{nome || "Modelo sem nome"}</span>
            <span style={previewCategory}>
              {categoriaSelecionada?.nome || "Sem categoria"}
            </span>
          </div>

          {preview && !htmlTemplate ? (
            <AutoScaledImage
              src={preview}
              alt="Preview do modelo"
              maxHeight={isMobile ? 520 : 720}
            />
          ) : htmlTemplate ? (
            <AutoScaledIframe
              html={htmlTemplate}
              title="Preview do modelo"
              maxHeight={isMobile ? 560 : 720}
            />
          ) : (
            <div style={emptyPreview}>
              <div style={emptyIcon}>✦</div>
              <strong>Preview vazio</strong>
              <span>Cole um HTML ou informe uma imagem de preview.</span>
            </div>
          )}
        </aside>
      </section>

      <section style={modelsSection}>
        <div style={sectionHeader}>
          <div>
            <h2 style={h2}>Modelos cadastrados</h2>
            <p style={smallText}>
              Cards responsivos com preview automático sem cortar.
            </p>
          </div>
        </div>

        <div style={modelsGridStyle}>
          {templates.length === 0 && (
            <div style={emptyList}>Nenhum modelo cadastrado ainda.</div>
          )}

          {templates.map((t) => (
            <article key={t.id} style={modelCard}>
              <div style={modelTop}>
                <div>
                  <strong style={modelTitle}>{t.nome || t.name}</strong>
                  <div style={modelSlug}>/{t.slug}</div>
                </div>

                <span
                  style={{
                    ...statusBadge,
                    background: t.active ? "#dcfce7" : "#fee2e2",
                    color: t.active ? "#166534" : "#991b1b",
                  }}
                >
                  {t.active ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div style={modelInfo}>
                <span>{t.categoria?.nome || "Sem categoria"}</span>
                <span>{t.html_template ? "HTML cadastrado" : "Sem HTML"}</span>
              </div>

              <div style={{ marginTop: 14 }}>
                {t.preview_image ? (
                  <AutoScaledImage
                    src={t.preview_image}
                    alt={t.nome || t.name || "Preview do modelo"}
                    maxHeight={isMobile ? 360 : 420}
                  />
                ) : t.html_template ? (
                  <AutoScaledIframe
                    html={t.html_template}
                    title={`Preview ${t.nome || t.name}`}
                    maxHeight={isMobile ? 360 : 420}
                  />
                ) : (
                  <div style={miniEmpty}>Sem preview</div>
                )}
              </div>

              <div style={modelActions}>
                <button onClick={() => editarTemplate(t)} style={btnBlue}>
                  Editar
                </button>

                <button onClick={() => duplicarTemplate(t)} style={btnPurple}>
                  Duplicar
                </button>

                <button
                  onClick={() => alternarStatus(t.id, t.active)}
                  style={btnSoft}
                >
                  {t.active ? "Desativar" : "Ativar"}
                </button>

                <button onClick={() => deletarTemplate(t.id)} style={btnDanger}>
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  margin: "0 auto",
  color: "#0f172a",
  boxSizing: "border-box",
};

const hero: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  marginBottom: 20,
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f5f3ff",
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 10,
};

const h1: CSSProperties = {
  margin: 0,
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
};

const subtitle: CSSProperties = {
  maxWidth: 660,
  marginTop: 10,
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.5,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gap: 14,
  marginBottom: 18,
};

const statCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
};

const statLabel: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
};

const statValue: CSSProperties = {
  display: "block",
  fontSize: 26,
  letterSpacing: "-0.04em",
};

const card: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 16px 42px rgba(15, 23, 42, 0.06)",
  minWidth: 0,
};

const sectionHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 16,
};

const h2: CSSProperties = {
  margin: 0,
  fontSize: 20,
  letterSpacing: "-0.02em",
};

const smallText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 14,
};

const categoryRow: CSSProperties = {
  display: "grid",
  gap: 10,
};

const chips: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 14,
};

const pill: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#f5f3ff",
  color: "#6d28d9",
  fontSize: 13,
  fontWeight: 700,
};

const emptyText: CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
};

const editorGrid: CSSProperties = {
  display: "grid",
  gap: 18,
  marginTop: 18,
  alignItems: "start",
};

const formGrid: CSSProperties = {
  display: "grid",
  gap: 14,
};

const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
  minWidth: 0,
};

const label: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#334155",
};

const input: CSSProperties = {
  width: "100%",
  minHeight: 46,
  padding: "0 13px",
  borderRadius: 12,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
};

const textarea: CSSProperties = {
  width: "100%",
  minHeight: 280,
  padding: 14,
  marginTop: 14,
  borderRadius: 14,
  border: "1px solid #dbe3ef",
  background: "#0b1020",
  color: "#e5e7eb",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 13,
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
  boxSizing: "border-box",
};

const actionsBar: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const btnPrimary: CSSProperties = {
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 12,
  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
  border: "none",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(124, 58, 237, 0.22)",
  whiteSpace: "nowrap",
};

const btnGreen: CSSProperties = {
  ...btnPrimary,
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  boxShadow: "0 12px 26px rgba(34, 197, 94, 0.2)",
};

const btnGhost: CSSProperties = {
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 12,
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontWeight: 800,
  cursor: "pointer",
};

const editBadge: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#fff7ed",
  color: "#c2410c",
  fontSize: 12,
  fontWeight: 900,
};

const previewCard: CSSProperties = {
  ...card,
  top: 20,
};

const previewMeta: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginBottom: 14,
};

const previewName: CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const previewCategory: CSSProperties = {
  color: "#7c3aed",
  fontWeight: 800,
  fontSize: 12,
};

const emptyPreview: CSSProperties = {
  height: 560,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "#94a3b8",
  background:
    "radial-gradient(circle at 50% 0%, #f5f3ff 0, #ffffff 45%, #f8fafc 100%)",
  border: "1px dashed #cbd5e1",
  borderRadius: 18,
  textAlign: "center",
};

const emptyIcon: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "#f5f3ff",
  color: "#7c3aed",
  fontSize: 22,
};

const modelsSection: CSSProperties = {
  marginTop: 24,
};

const modelsGrid: CSSProperties = {
  display: "grid",
  gap: 18,
};

const modelCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
  minWidth: 0,
  width: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
};

const modelTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const modelTitle: CSSProperties = {
  display: "block",
  fontSize: 16,
  color: "#0f172a",
};

const modelSlug: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#64748b",
  wordBreak: "break-word",
};

const statusBadge: CSSProperties = {
  padding: "6px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const modelInfo: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 12,
  color: "#64748b",
  fontSize: 13,
};

const miniEmpty: CSSProperties = {
  height: 240,
  marginTop: 14,
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  color: "#94a3b8",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
};

const modelActions: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 14,
};

const btnBaseSmall: CSSProperties = {
  minHeight: 34,
  padding: "0 10px",
  borderRadius: 10,
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 13,
};

const btnBlue: CSSProperties = {
  ...btnBaseSmall,
  background: "#2563eb",
  color: "#fff",
};

const btnPurple: CSSProperties = {
  ...btnBaseSmall,
  background: "#7c3aed",
  color: "#fff",
};

const btnSoft: CSSProperties = {
  ...btnBaseSmall,
  background: "#f1f5f9",
  color: "#334155",
};

const btnDanger: CSSProperties = {
  ...btnBaseSmall,
  background: "#fee2e2",
  color: "#991b1b",
};

const emptyList: CSSProperties = {
  gridColumn: "1 / -1",
  padding: 24,
  borderRadius: 18,
  background: "#ffffff",
  border: "1px dashed #cbd5e1",
  color: "#94a3b8",
  textAlign: "center",
};
