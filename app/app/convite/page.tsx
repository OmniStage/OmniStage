"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ConvitePage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState<string>("");
  const [templateSelecionado, setTemplateSelecionado] = useState<string>("");

  // ===============================
  // CARREGAR EVENTOS DO CLIENTE
  // ===============================
  async function carregarEventos() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return;

    const { data: memberships } = await supabase
      .from("network_members")
      .select("tenant_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .single();

    if (!memberships) return;

    const { data } = await supabase
      .from("eventos")
      .select("*")
      .eq("tenant_id", memberships.tenant_id)
      .order("created_at", { ascending: false });

    setEventos(data || []);
  }

  // ===============================
  // CARREGAR TEMPLATES (ADMIN)
  // ===============================
  async function carregarTemplates() {
    const { data } = await supabase
      .from("invite_templates")
      .select("*")
      .eq("active", true);

    setTemplates(data || []);
  }

  // ===============================
  // SALVAR TEMPLATE NO EVENTO
  // ===============================
  async function salvarTemplate() {
    if (!eventoSelecionado || !templateSelecionado) {
      alert("Selecione evento e modelo");
      return;
    }

    const { error } = await supabase
      .from("eventos")
      .update({
        invite_template_id: templateSelecionado,
      })
      .eq("id", eventoSelecionado);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Modelo aplicado ao evento!");
  }

  useEffect(() => {
    carregarEventos();
    carregarTemplates();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 40 }}>Convite Digital</h1>

      {/* ========================= */}
      {/* SELEÇÃO DE EVENTO */}
      {/* ========================= */}
      <div style={{ marginTop: 20 }}>
        <label>Selecione o evento</label>
        <select
          value={eventoSelecionado}
          onChange={(e) => setEventoSelecionado(e.target.value)}
          style={selectStyle}
        >
          <option value="">Selecione...</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      {/* ========================= */}
      {/* LISTA DE TEMPLATES */}
      {/* ========================= */}
      <div style={{ marginTop: 40 }}>
        <h2>Escolha o modelo</h2>

        <div style={{ display: "grid", gap: 20 }}>
          {templates.map((t) => (
            <div
              key={t.id}
              style={{
                border:
                  templateSelecionado === t.id
                    ? "2px solid #22c55e"
                    : "1px solid #334155",
                borderRadius: 16,
                padding: 20,
                cursor: "pointer",
                background: "#020617",
              }}
              onClick={() => setTemplateSelecionado(t.id)}
            >
              <strong>{t.name}</strong>

              <div style={{ marginTop: 10 }}>
                <img
                  src={t.background_url}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================= */}
      {/* BOTÃO SALVAR */}
      {/* ========================= */}
      <button
        onClick={salvarTemplate}
        style={{
          marginTop: 30,
          padding: "14px 20px",
          borderRadius: 10,
          background: "#22c55e",
          border: "none",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Aplicar modelo ao evento
      </button>
    </main>
  );
}

const selectStyle = {
  padding: 12,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
  marginTop: 10,
};
