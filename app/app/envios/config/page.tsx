"use client";

import { useState } from "react";

type ModoEnvio = "manual" | "automatico";
type Provider = "zapi" | "360dialog";

export default function ConfigEnvioPage() {
  const [modo, setModo] = useState<ModoEnvio>("manual");
  const [provider, setProvider] = useState<Provider>("zapi");
  const [dataHora, setDataHora] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceId, setInstanceId] = useState("");

  function salvarConfig() {
    // 🔜 Aqui você vai salvar no Supabase
    console.log({
      modo,
      provider,
      apiToken,
      instanceId,
    });

    alert("Configuração salva com sucesso");
  }

  function agendarEnvio() {
    if (!dataHora) {
      alert("Selecione data e hora");
      return;
    }

    // 🔜 Aqui você vai atualizar envio_fila.agendado_para
    console.log("Agendado para:", dataHora);

    alert("Envio agendado para: " + new Date(dataHora).toLocaleString());
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Configuração de Envios</h1>

        {/* MODO DE ENVIO */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Modo de envio</h2>

          <div style={rowStyle}>
            <button
              onClick={() => setModo("manual")}
              style={modo === "manual" ? activeBtn : btn}
            >
              Manual (WhatsApp Web)
            </button>

            <button
              onClick={() => setModo("automatico")}
              style={modo === "automatico" ? activeBtn : btn}
            >
              Automático (API)
            </button>
          </div>

          <p style={descStyle}>
            {modo === "manual"
              ? "Você envia manualmente via WhatsApp."
              : "Envios serão feitos automaticamente via API."}
          </p>
        </div>

        {/* CONFIG API */}
        {modo === "automatico" && (
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Integração WhatsApp</h2>

            <div style={fieldStyle}>
              <label>Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                style={inputStyle}
              >
                <option value="zapi">Z-API</option>
                <option value="360dialog">360Dialog</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label>API Token</label>
              <input
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                style={inputStyle}
                placeholder="Seu token"
              />
            </div>

            <div style={fieldStyle}>
              <label>Instance ID</label>
              <input
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                style={inputStyle}
                placeholder="ID da instância"
              />
            </div>
          </div>
        )}

        {/* AGENDAMENTO */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Agendamento</h2>

          <div style={fieldStyle}>
            <label>Data e hora do envio</label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button style={primaryBtn} onClick={agendarEnvio}>
            Agendar envio
          </button>
        </div>

        {/* SALVAR */}
        <div style={{ marginTop: 20 }}>
          <button style={saveBtn} onClick={salvarConfig}>
            Salvar configuração
          </button>
        </div>
      </div>
    </div>
  );
}

//
// 🎨 ESTILO (padrão OmniStage clean)
//

const pageStyle: React.CSSProperties = {
  background: "#f1f5f9",
  minHeight: "100vh",
  padding: 30,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 12,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ccc",
  cursor: "pointer",
  background: "#f9fafb",
};

const activeBtn: React.CSSProperties = {
  ...btn,
  background: "#2563eb",
  color: "#fff",
  border: "none",
};

const descStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 14,
  color: "#64748b",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const primaryBtn: React.CSSProperties = {
  marginTop: 10,
  padding: "12px 16px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const saveBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  background: "#111827",
  color: "#fff",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};
