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

  function gerarSlug(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }

  useEffect(() => {
    setSlug(gerarSlug(nome));
  }, [nome]);

  async function carregarTemplates() {
    const { data, error } = await supabase
      .from("invite_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar modelos:", error);
      return;
    }

    setTemplates(data || []);
  }

  async function criarTemplate() {
    if (!nome.trim()) {
      alert("Digite o nome do modelo");
      return;
    }

    if (!htmlTemplate.trim()) {
      alert("Cole o código HTML do modelo");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("invite_templates").insert({
      name: nome.trim(),
      slug,
      preview_image: preview.trim() || null,
      html_template: htmlTemplate,
      active: true,
    });

    setLoading(false);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    setNome("");
    setSlug("");
    setPreview("");
    setHtmlTemplate("");

    await carregarTemplates();

    alert("Modelo criado!");
  }

  async function alternarStatus(id: string, active: boolean) {
    const { error } = await supabase
      .from("invite_templates")
      .update({ active: !active })
      .eq("id", id);

    if (error) {
      alert("Erro ao alterar status: " + error.message);
      return;
    }

    carregarTemplates();
  }

  // ✅ NOVO: EXCLUIR TEMPLATE
  async function deletarTemplate(id: string) {
    const confirmacao = confirm("Tem certeza que deseja excluir este modelo?");
    if (!confirmacao) return;

    const { error } = await supabase
      .from("invite_templates")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }

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
          disabled
          style={{ ...input, opacity: 0.6 }}
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

        <button onClick={criarTemplate} style={btn} disabled={loading}>
          {loading ? "Criando..." : "Criar modelo"}
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Modelos criados</h2>

        <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
          {templates.map((t) => (
            <div key={t.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <div>
                  <strong>{t.name}</strong>

                  <div style={{ opacity: 0.6, marginTop: 5 }}>
                    /{t.slug}
                  </div>

                  <div style={{ marginTop: 8, color: t.active ? "#22c55e" : "#ef4444" }}>
                    {t.active ? "Ativo" : "Inativo"}
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.7 }}>
                    HTML: {t.html_template ? "cadastrado" : "não cadastrado"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => alternarStatus(t.id, t.active)}
                    style={{
                      ...btnSmall,
                      background: t.active ? "#ef4444" : "#22c55e",
                    }}
                  >
                    {t.active ? "Desativar" : "Ativar"}
                  </button>

                  {/* ✅ BOTÃO EXCLUIR */}
                  <button
                    onClick={() => deletarTemplate(t.id)}
                    style={{
                      ...btnSmall,
                      background: "#991b1b",
                    }}
                  >
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
