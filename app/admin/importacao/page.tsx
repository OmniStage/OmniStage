"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
};

type PreviewRow = {
  id: string;
  legacy_id: string | null;
  nome: string;
  telefone: string | null;
  grupo: string | null;
  is_duplicate: boolean;
};

export default function AdminImportacaoPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member?.tenant_id) {
      alert("Usuário sem empresa vinculada.");
      return;
    }

    setTenantId(member.tenant_id);

    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select("id, nome")
      .eq("tenant_id", member.tenant_id)
      .order("created_at", { ascending: false });

    if (eventosError) {
      alert("Erro ao carregar eventos: " + eventosError.message);
      return;
    }

    setEventos((eventosData || []) as Evento[]);

    if (eventosData && eventosData.length > 0) {
      setEventoId(eventosData[0].id);
    }
  }

  async function gerarPreview() {
    if (!tenantId || !eventoId) {
      alert("Selecione um evento.");
      return;
    }

    if (!texto.trim()) {
      alert("Cole os convidados da planilha antiga.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "preview",
          tenantId,
          eventoId,
          text: texto,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar prévia.");
      }

      setBatchId(result.batchId);
      setPreview(result.preview || []);
      alert(`${result.total} registros interpretados.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao gerar prévia.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmarImportacao() {
    if (!tenantId || !eventoId || !batchId) {
      alert("Gere uma prévia antes de confirmar.");
      return;
    }

    const confirmacao = confirm(
      "Confirmar importação? Registros duplicados serão ignorados."
    );

    if (!confirmacao) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm",
          tenantId,
          eventoId,
          batchId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao confirmar importação.");
      }

      alert(`${result.imported} convidados importados com sucesso.`);

      setTexto("");
      setPreview([]);
      setBatchId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao confirmar importação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const totalDuplicados = preview.filter((item) => item.is_duplicate).length;
  const totalValidos = preview.length - totalDuplicados;

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Admin · Importação Legada</h1>

      <p style={{ color: "#94a3b8", marginTop: 8 }}>
        Use esta tela apenas para migrar eventos antigos com ID da planilha.
      </p>

      <section style={sectionStyle}>
        <label style={fieldStyle}>
          <span>Evento</span>
          <select
            value={eventoId}
            onChange={(event) => {
              setEventoId(event.target.value);
              setPreview([]);
              setBatchId(null);
            }}
            style={inputStyle}
          >
            <option value="">Selecione um evento</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nome}
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginTop: 18 }}>
          <label style={fieldStyle}>
            <span>Colar dados da planilha antiga</span>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder={`3    FAMILIA_ANDREZZA    ANDREZZA FERRAZ    5522999787402\n4    FAMILIA_ANDREZZA    FLÁVIO MANCEBO\n5    INDIVIDUAL_ALESSANDRA BARROS    ALESSANDRA BARROS    5522999320550`}
              style={{
                ...inputStyle,
                minHeight: 220,
                resize: "vertical",
              }}
            />
          </label>
        </div>

        <div style={actionsStyle}>
          <button onClick={gerarPreview} disabled={loading} style={buttonStyle}>
            {loading ? "Processando..." : "Gerar prévia"}
          </button>

          {preview.length > 0 && (
            <button
              onClick={confirmarImportacao}
              disabled={loading}
              style={goldButtonStyle}
            >
              Confirmar importação
            </button>
          )}
        </div>
      </section>

      {preview.length > 0 && (
        <section style={sectionStyle}>
          <div style={headerStyle}>
            <h2 style={{ margin: 0 }}>Prévia</h2>
            <span style={{ color: "#94a3b8", fontWeight: 800 }}>
              {totalValidos} válidos · {totalDuplicados} duplicados
            </span>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {preview.map((item) => (
              <article
                key={item.id}
                style={{
                  ...cardStyle,
                  border: item.is_duplicate
                    ? "1px solid rgba(239,68,68,0.6)"
                    : "1px solid #334155",
                  background: item.is_duplicate
                    ? "rgba(127,29,29,0.22)"
                    : "#0f172a",
                }}
              >
                <div>
                  <strong style={{ fontSize: 20 }}>{item.nome}</strong>
                  <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                    Legacy ID: {item.legacy_id || "sem ID"} · Grupo:{" "}
                    {item.grupo || "sem grupo"} · Telefone:{" "}
                    {item.telefone || "sem telefone"}
                  </p>
                </div>

                <span
                  style={{
                    ...badgeStyle,
                    background: item.is_duplicate
                      ? "rgba(239,68,68,0.16)"
                      : "rgba(34,197,94,0.14)",
                    color: item.is_duplicate ? "#fca5a5" : "#86efac",
                  }}
                >
                  {item.is_duplicate ? "Duplicado" : "OK"}
                </span>
              </article>
            ))}
          </div>

          {batchId && (
            <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
              Lote: {batchId}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

const sectionStyle: CSSProperties = {
  marginTop: 28,
  padding: 22,
  borderRadius: 18,
  border: "1px solid #334155",
  background: "#020617",
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#cbd5e1",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 10,
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const goldButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 10,
  border: "1px solid rgba(250,204,21,0.42)",
  background: "rgba(250,204,21,0.12)",
  color: "#fde68a",
  fontWeight: 900,
  cursor: "pointer",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const cardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  padding: 16,
  borderRadius: 14,
};

const badgeStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
};
