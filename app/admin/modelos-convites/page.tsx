"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ModelosConvitePage() {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [preview, setPreview] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

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

  async function carregarTemplates() {
    const { data, error } = await supabase
      .from("invite_templates")
      .select("*")
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
    setPreview("");
    setHtmlTemplate("");
    setEditandoId(null);
  }

  async function criarTemplate() {
    if (!nome.trim()) return alert("Digite o nome do modelo");
    if (!htmlTemplate.trim()) return alert("Cole o código HTML do modelo");

    setLoading(true);

    const { error } = await supabase.from("invite_templates").insert({
      name: nome.trim(),
      slug,
      preview_image: preview.trim() || null,
      html_template: htmlTemplate,
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
    setNome(t.name || "");
    setSlug(t.slug || "");
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
        name: nome.trim(),
        slug,
        preview_image: preview.trim() || null,
        html_template: htmlTemplate,
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
    const { error } = await supabase.from("invite_templates").insert({
      name: `${template.name} - Cópia`,
      slug: `${template.slug}-copia-${Date.now()}`,
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
      alert("Este modelo já está sendo usado em evento. Desative ou duplique, mas não exclua.");
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
    carregarTemplates();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 36 }}>Modelos de Convite</h1>

      <div style={{ marginTop: 20, maxWidth: 760 }}>
        <input
          placeholder="Nome do modelo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={input}
        />

        <input
          placeholder="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          style={input}
        />

        <input
          placeholder="Preview (URL da imagem)"
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          style={input}
        />

        <textarea
          placeholder="Cole aqui o código HTML do modelo..."
          value={htmlTemplate}
          onChange={(e) => setHtmlTemplate(e.target.value)}
          style={textarea}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={editandoId ? salvarEdicao : criarTemplate}
            style={btn}
            disabled={loading}
          >
            {loading
              ? "Salvando..."
              : editandoId
              ? "Salvar alteração"
              : "Criar modelo"}
          </button>

          {editandoId && (
            <button onClick={limparFormulario} style={{ ...btn, background: "#475569" }}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Modelos criados</h2>

        <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
          {templates.map((t) => (
            <div key={t.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <div>
                  <strong>{t.name}</strong>
                  <div style={{ opacity: 0.6, marginTop: 5 }}>/{t.slug}</div>
                  <div style={{ marginTop: 8, color: t.active ? "#22c55e" : "#ef4444" }}>
                    {t.active ? "Ativo" : "Inativo"}
                  </div>
                  <div style={{ marginTop: 8, opacity: 0.7 }}>
                    HTML: {t.html_template ? "cadastrado" : "não cadastrado"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => editarTemplate(t)} style={{ ...btnSmall, background: "#2563eb" }}>
                    Editar
                  </button>

                  <button onClick={() => duplicarTemplate(t)} style={{ ...btnSmall, background: "#7c3aed" }}>
                    Duplicar
                  </button>

                  <button
                    onClick={() => alternarStatus(t.id, t.active)}
                    style={{ ...btnSmall, background: t.active ? "#ef4444" : "#22c55e" }}
                  >
                    {t.active ? "Desativar" : "Ativar"}
                  </button>

                  <button onClick={() => deletarTemplate(t.id)} style={{ ...btnSmall, background: "#991b1b" }}>
                    Excluir
                  </button>
                </div>
              </div>

              {t.preview_image && (
                <img
                  src={t.preview_image}
                  style={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "cover",
                    marginTop: 14,
                    borderRadius: 10,
                    opacity: 0.9,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#fff",
};

const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 260,
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#fff",
  fontFamily: "monospace",
  resize: "vertical",
};

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: "12px 16px",
  borderRadius: 10,
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const btnSmall: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  height: 42,
};

const card: React.CSSProperties = {
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 15,
  background: "#020617",
};
