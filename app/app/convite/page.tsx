"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ConvitePage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState("");
  const [templateSelecionado, setTemplateSelecionado] = useState("");

  async function carregarEventos() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return;

    const { data: membership, error: membershipError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .single();

    if (membershipError || !membership?.tenant_id) {
      console.error("Erro ao buscar tenant:", membershipError);
      return;
    }

    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar eventos:", error);
      return;
    }

    setEventos(data || []);
  }

  async function carregarTemplates() {
    const { data, error } = await supabase
      .from("invite_templates")
      .select("*")
      .eq("status", "ativo")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar templates:", error);
      return;
    }

    setTemplates(data || []);
  }

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

      <div style={{ marginTop: 20 }}>
        <label>Selecione o evento</label>

        <select
          value={eventoSelecionado}
          onChange={(e) => setEventoSelecionado(e.target.value)}
          style={selectStyle}
        >
          <option value="">Selecione...</option>

          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Escolha o modelo</h2>

        <div style={{ display: "grid", gap: 20 }}>
          {templates.map((template) => {
            const templateNome = template.nome || template.name || "Modelo";
            const preview =
              template.background_image ||
              template.background_url ||
              template.preview_image ||
              "";

            return (
              <div
                key={template.id}
                style={{
                  border:
                    templateSelecionado === template.id
                      ? "2px solid #22c55e"
                      : "1px solid #334155",
                  borderRadius: 16,
                  padding: 20,
                  cursor: "pointer",
                  background: "#020617",
                }}
                onClick={() => setTemplateSelecionado(template.id)}
              >
                <strong>{templateNome}</strong>

                {preview && (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={preview}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

const selectStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
  marginTop: 10,
};
