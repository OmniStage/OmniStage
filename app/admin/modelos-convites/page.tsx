"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

export default function ModelosConvitePage() {
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

    if (error) {
      alert("Erro ao carregar categorias: " + error.message);
      return;
    }

    setCategorias(data || []);
  }

  async function criarCategoria() {
    if (!novaCategoria.trim()) {
      alert("Digite o nome da categoria");
      return;
    }

    const novoSlug = gerarSlug(novaCategoria);

    setSalvandoCategoria(true);

    const { error } = await supabase.from("invite_template_categories").insert({
      nome: novaCategoria.trim(),
      slug: novoSlug,
      active: true,
    });

    setSalvandoCategoria(false);

    if (error) {
      alert("Erro ao criar categoria: " + error.message);
      return;
    }

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

    if (error) {
      alert("Erro ao carregar modelos: " + error.message);
      return;
    }

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
      alert("Erro ao verificar uso do modelo: " + usoError.message);
      return;
    }

    if (eventosUsando && eventosUsando.length > 0) {
      alert(
        "Este modelo já está sendo usado em evento. Desative ou duplique, mas não exclua."
      );
      return;
    }

    const confirmacao = confirm("Tem certeza que deseja excluir este modelo?");
    if (!confirmacao) return;

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

  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <div style={eyebrow}>Admin OmniStage</div>
          <h1 style={h1}>Modelos de Convite</h1>
          <p style={subtitle}>
            Crie, edite e organize templates HTML reutilizáveis para eventos,
            clientes e experiências digitais.
          </p>
        </div>

        <button onClick={limparFormulario} style={btnPrimary}>
          + Novo modelo
        </button>
      </section>

      <section style={statsGrid}>
        <div style={statCard}>
          <span style={statLabel}>Total de modelos</span>
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

        <div style={categoryRow}>
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

      <section style={editorGrid}>
        <div style={card}>
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>
                {editandoId ? "Editar modelo" : "Novo modelo"}
              </h2>
              <p style={smallText}>
                Cadastre o HTML principal que será usado no convite.
              </p>
            </div>

            {editandoId && <span style={editBadge}>Editando</span>}
          </div>

          <div style={formGrid}>
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

        <aside style={previewCard}>
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>Preview ao vivo</h2>
              <p style={smallText}>
                Veja como o HTML renderiza antes de salvar.
              </p>
            </div>
          </div>

          <div style={previewMeta}>
            <span style={previewName}>{nome || "Modelo sem nome"}</span>
            <span style={previewCategory}>
              {categoriaSelecionada?.nome || "Sem categoria"}
            </span>
          </div>

          {preview && !htmlTemplate ? (
            <div style={phonePreviewShell}>
              <img src={preview} alt="Preview do modelo" style={previewImage} />
            </div>
          ) : htmlTemplate ? (
            <div style={phonePreviewShell}>
              <iframe
                title="Preview do modelo"
                srcDoc={htmlTemplate}
                style={iframePreview}
              />
            </div>
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
              Gerencie status, edição, duplicação e exclusão dos templates.
            </p>
          </div>
        </div>

        <div style={modelsGrid}>
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

              {t.preview_image ? (
                <div style={miniPhoneShell}>
                  <img
                    src={t.preview_image}
                    alt={t.nome || t.name || "Preview do modelo"}
                    style={miniImage}
                  />
                </div>
              ) : t.html_template ? (
                <div style={miniPhoneShell}>
                  <iframe
                    title={`Preview ${t.nome || t.name}`}
                    srcDoc={t.html_template}
                    style={miniFrame}
                  />
                </div>
              ) : (
                <div style={miniEmpty}>Sem preview</div>
              )}

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
  maxWidth: 1320,
  margin: "0 auto",
  padding: "34px 34px 60px",
  color: "#0f172a",
};

const hero: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 24,
  marginBottom: 22,
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
  fontSize: 42,
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
};

const subtitle: CSSProperties = {
  maxWidth: 680,
  marginTop: 10,
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.6,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const statCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 12px 34px rgba(15, 23, 42, 0.06)",
};

const statLabel: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 8,
};

const statValue: CSSProperties = {
  display: "block",
  fontSize: 28,
  letterSpacing: "-0.04em",
};

const card: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.07)",
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
  gridTemplateColumns: "1fr auto",
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
  gridTemplateColumns: "1fr 460px",
  gap: 18,
  marginTop: 18,
  alignItems: "start",
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
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
  boxShadow: "0 12px 26px rgba(124, 58, 237, 0.24)",
  whiteSpace: "nowrap",
};

const btnGreen: CSSProperties = {
  ...btnPrimary,
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  boxShadow: "0 12px 26px rgba(34, 197, 94, 0.22)",
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
  position: "sticky",
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

const phonePreviewShell: CSSProperties = {
  width: "100%",
  height: 720,
  overflow: "auto",
  borderRadius: 26,
  border: "1px solid #dbe3ef",
  background: "#020617",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
};

const iframePreview: CSSProperties = {
  width: "430px",
  minWidth: "430px",
  height: "820px",
  border: "none",
  display: "block",
  margin: "0 auto",
  background: "#020617",
};

const previewImage: CSSProperties = {
  width: "100%",
  minHeight: 720,
  objectFit: "contain",
  display: "block",
  background: "#020617",
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
  gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))",
  gap: 24,
};

const modelCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 24,
  padding: 22,
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

const modelTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
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
  marginTop: 14,
  color: "#64748b",
  fontSize: 13,
};

const miniPhoneShell: CSSProperties = {
  width: "100%",
  height: 620,
  overflow: "hidden",
  marginTop: 14,
  borderRadius: 22,
  border: "1px solid #dbe3ef",
  background: "#020617",
  position: "relative",
};

const miniFrame: CSSProperties = {
  width: "430px",
  minWidth: "430px",
  height: "920px",
  border: "none",
  display: "block",
  background: "#020617",
  transform: "scale(0.82)",
  transformOrigin: "top center",
  marginLeft: "50%",
  translate: "-50% 0",
};
const miniImage: CSSProperties = {
  width: "100%",
  minHeight: 440,
  objectFit: "contain",
  display: "block",
  background: "#020617",
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
  minHeight: 36,
  padding: "0 11px",
  borderRadius: 10,
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
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
