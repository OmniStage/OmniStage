"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ModelosConvitePage() {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // =========================
  // GERAR SLUG AUTOMÁTICO
  // =========================
  function gerarSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }

  useEffect(() => {
    setSlug(gerarSlug(nome));
  }, [nome]);

  // =========================
  // CARREGAR TEMPLATES
  // =========================
  async function carregarTemplates() {
    const { data } = await supabase
      .from("invite_templates")
      .select("*")
      .order("created_at", { ascending: false });

    setTemplates(data || []);
  }

  // =========================
  // CRIAR TEMPLATE
  // =========================
  async function criarTemplate() {
    if (!nome) {
      alert("Digite o nome");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("invite_templates").insert({
      name: nome,
      slug: slug,
      active: true,
    });

    setLoading(false);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    setNome("");
    setSlug("");

    carregarTemplates();

    alert("Modelo criado!");
  }

  useEffect(() => {
    carregarTemplates();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 36 }}>Modelos de Convite</h1>

      {/* ========================= */}
      {/* FORM */}
      {/* ========================= */}
      <div style={{ marginTop: 20, maxWidth: 500 }}>
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

        <button onClick={criarTemplate} style={btn}>
          {loading ? "Criando..." : "Criar modelo"}
        </button>
      </div>

      {/* ========================= */}
      {/* LISTA */}
      {/* ========================= */}
      <div style={{ marginTop: 40 }}>
        <h2>Modelos criados</h2>

        <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
          {templates.map((t) => (
            <div key={t.id} style={card}>
              <strong>{t.name}</strong>
              <div style={{ opacity: 0.6 }}>/{t.slug}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// =========================
// ESTILOS
// =========================

const input = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#fff",
};

const btn = {
  marginTop: 15,
  padding: "12px 16px",
  borderRadius: 10,
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const card = {
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 15,
  background: "#020617",
};
