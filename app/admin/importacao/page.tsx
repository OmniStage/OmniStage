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
  status_rsvp: string | null;
  status_envio: string | null;
  observacoes: string | null;
  is_duplicate: boolean;
};

type ImportHistoryItem = {
  id: string;
  source_type: string | null;
  file_name: string | null;
  total_rows: number | null;
  imported_rows: number | null;
  duplicated_rows: number | null;
  reverted_rows: number | null;
  status: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  reverted_at: string | null;
};

export default function AdminImportacaoPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function carregarHistorico(tenant: string, evento: string) {
    const response = await fetch("/api/admin/import-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant, eventoId: evento }),
    });

    const result = await response.json();

    if (response.ok) {
      setHistory(result.history || []);
    }
  }

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
      await carregarHistorico(member.tenant_id, eventosData[0].id);
    }
  }

  function cancelarPrevia() {
    setTexto("");
    setPreview([]);
    setSelectedIds([]);
    setBatchId(null);
  }

  function normalizarGoogleSheetsUrl(url: string) {
    if (url.includes("/pubhtml")) {
      return url.replace("/pubhtml", "/pub?output=csv");
    }

    return url;
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selecionarTodos() {
    setSelectedIds(preview.map((item) => item.id));
  }

  function selecionarValidos() {
    setSelectedIds(
      preview
        .filter((item) => !item.is_duplicate)
        .map((item) => item.id)
    );
  }

  function limparSelecao() {
    setSelectedIds([]);
  }

  function removerDuplicados() {
    setSelectedIds((prev) =>
      prev.filter((id) => !preview.find((item) => item.id === id)?.is_duplicate)
    );
  }

  async function carregarGoogleSheets() {
    if (!sheetUrl.trim()) {
      alert("Cole o link CSV do Google Sheets.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-from-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizarGoogleSheetsUrl(sheetUrl.trim()),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao carregar planilha.");
      }

      const textoFormatado = (result.data || [])
        .map(
          (item: any) =>
            `${item.legacy_id || ""}    ${item.grupo || ""}    ${
              item.nome || ""
            }    ${item.telefone || ""}    ${item.status_rsvp || ""}    ${
              item.data_resposta || ""
            }    ${item.status_envio || ""}    ${item.data_hora || ""}`
        )
        .join("\n");

      setTexto(textoFormatado);
      setPreview([]);
      setSelectedIds([]);
      setBatchId(null);

      alert(`${result.total || 0} linhas carregadas da planilha.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao carregar planilha.");
    } finally {
      setLoading(false);
    }
  }

  async function gerarPreview() {
    if (!tenantId || !eventoId) {
      alert("Selecione um evento.");
      return;
    }

    if (!texto.trim()) {
      alert("Cole os convidados da planilha antiga ou carregue uma planilha.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const previewData = (result.preview || []) as PreviewRow[];

      setBatchId(result.batchId);
      setPreview(previewData);
      setSelectedIds(
        previewData
          .filter((item) => !item.is_duplicate)
          .map((item) => item.id)
      );

      await carregarHistorico(tenantId, eventoId);

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

    if (selectedIds.length === 0) {
      alert("Selecione pelo menos um convidado para importar.");
      return;
    }

    const confirmacao = confirm(
      `Confirmar importação de ${selectedIds.length} convidado(s)? Registros duplicados serão ignorados automaticamente.`
    );

    if (!confirmacao) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          tenantId,
          eventoId,
          batchId,
          selectedIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao confirmar importação.");
      }

      alert(`${result.imported} convidados importados com sucesso.`);

      setTexto("");
      setPreview([]);
      setSelectedIds([]);
      setBatchId(null);

      await carregarHistorico(tenantId, eventoId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao confirmar importação.");
    } finally {
      setLoading(false);
    }
  }

  async function reverterImportacao(batchIdParaReverter: string) {
    if (!tenantId || !eventoId) return;

    const confirmar = confirm(
      "Deseja reverter esta importação? Os convidados deste lote serão removidos."
    );

    if (!confirmar) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/revert-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          eventoId,
          batchId: batchIdParaReverter,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao reverter importação.");
      }

      alert(`${result.removidos} convidados removidos.`);
      await carregarHistorico(tenantId, eventoId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao reverter importação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const totalDuplicados = preview.filter((item) => item.is_duplicate).length;
  const totalValidos = preview.length - totalDuplicados;
  const totalSelecionados = selectedIds.length;

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
            onChange={async (event) => {
              const novoEventoId = event.target.value;
              setEventoId(novoEventoId);
              setPreview([]);
              setSelectedIds([]);
              setBatchId(null);

              if (tenantId && novoEventoId) {
                await carregarHistorico(tenantId, novoEventoId);
              }
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
            <span>Link Google Sheets CSV</span>
            <input
              value={sheetUrl}
              onChange={(event) => setSheetUrl(event.target.value)}
              placeholder="Cole o link publicado do Google Sheets"
              style={inputStyle}
            />
          </label>

          <div style={actionsStyle}>
            <button
              onClick={carregarGoogleSheets}
              disabled={loading}
              style={secondaryButtonStyle}
            >
              {loading ? "Carregando..." : "Carregar planilha"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={fieldStyle}>
            <span>Colar dados da planilha antiga</span>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder={`3    FAMILIA_ANDREZZA    ANDREZZA FERRAZ    5522999787402    confirmado    02/05/2026    enviado    02/05/2026 18:40`}
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
            <>
              <button
                onClick={confirmarImportacao}
                disabled={loading || totalSelecionados === 0}
                style={goldButtonStyle}
              >
                Importar selecionados ({totalSelecionados})
              </button>

              <button
                onClick={cancelarPrevia}
                disabled={loading}
                style={secondaryButtonStyle}
              >
                Cancelar prévia
              </button>
            </>
          )}
        </div>
      </section>

      {preview.length > 0 && (
        <section style={sectionStyle}>
          <div style={headerStyle}>
            <h2 style={{ margin: 0 }}>Prévia</h2>
            <span style={{ color: "#94a3b8", fontWeight: 800 }}>
              {totalSelecionados} selecionados · {totalValidos} válidos ·{" "}
              {totalDuplicados} duplicados
            </span>
          </div>

          <div style={selectionActionsStyle}>
            <button onClick={selecionarTodos} disabled={loading} style={smallButtonStyle}>
              Selecionar todos
            </button>

            <button onClick={selecionarValidos} disabled={loading} style={smallButtonStyle}>
              Selecionar válidos
            </button>

            <button onClick={removerDuplicados} disabled={loading} style={smallButtonStyle}>
              Remover duplicados
            </button>

            <button onClick={limparSelecao} disabled={loading} style={smallButtonStyle}>
              Limpar seleção
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {preview.map((item) => {
              const checked = selectedIds.includes(item.id);

              return (
                <article
                  key={item.id}
                  style={{
                    ...cardStyle,
                    border: item.is_duplicate
                      ? "1px solid rgba(239,68,68,0.6)"
                      : checked
                      ? "1px solid rgba(250,204,21,0.6)"
                      : "1px solid #334155",
                    background: item.is_duplicate
                      ? "rgba(127,29,29,0.22)"
                      : checked
                      ? "rgba(250,204,21,0.08)"
                      : "#0f172a",
                  }}
                >
                  <div style={cardLeftStyle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={item.is_duplicate}
                      onChange={() => toggleSelect(item.id)}
                      style={checkboxStyle}
                    />

                    <div>
                      <strong style={{ fontSize: 20 }}>{item.nome}</strong>

                      <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                        Legacy ID: {item.legacy_id || "sem ID"} · Grupo:{" "}
                        {item.grupo || "sem grupo"} · Telefone:{" "}
                        {item.telefone || "sem telefone"}
                      </p>

                      <p style={{ color: "#cbd5e1", margin: "6px 0 0" }}>
                        RSVP: {item.status_rsvp || "pendente"} · Envio:{" "}
                        {item.status_envio || "pendente"}
                      </p>

                      {item.observacoes && (
                        <p
                          style={{
                            color: "#64748b",
                            margin: "6px 0 0",
                            fontSize: 13,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {item.observacoes}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      ...badgeStyle,
                      background: item.is_duplicate
                        ? "rgba(239,68,68,0.16)"
                        : checked
                        ? "rgba(250,204,21,0.16)"
                        : "rgba(34,197,94,0.14)",
                      color: item.is_duplicate
                        ? "#fca5a5"
                        : checked
                        ? "#fde68a"
                        : "#86efac",
                    }}
                  >
                    {item.is_duplicate ? "Duplicado" : checked ? "Selecionado" : "OK"}
                  </span>
                </article>
              );
            })}
          </div>

          {batchId && (
            <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
              Lote: {batchId}
            </p>
          )}
        </section>
      )}

      <section style={sectionStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>Histórico de importações</h2>
          <span style={{ color: "#94a3b8", fontWeight: 800 }}>
            {history.length} lotes
          </span>
        </div>

        {history.length === 0 && (
          <div style={{ color: "#94a3b8" }}>
            Nenhuma importação registrada para este evento.
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {history.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div>
                <strong>
                  Lote {item.id.slice(0, 8)} · {item.status || "preview"}
                </strong>

                <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                  Total: {item.total_rows || 0} · Importados:{" "}
                  {item.imported_rows || 0} · Duplicados:{" "}
                  {item.duplicated_rows || 0} · Revertidos:{" "}
                  {item.reverted_rows || 0}
                </p>

                <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
                  Criado em: {item.created_at || "-"}
                </p>
              </div>

              {item.status === "imported" && (
                <button
                  onClick={() => reverterImportacao(item.id)}
                  disabled={loading}
                  style={{
                    ...secondaryButtonStyle,
                    borderColor: "rgba(239,68,68,0.55)",
                    color: "#fca5a5",
                  }}
                >
                  Reverter
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
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

const selectionActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 16,
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

const secondaryButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 10,
  background: "#1e293b",
  border: "1px solid #334155",
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

const smallButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  fontWeight: 800,
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
  border: "1px solid #334155",
  background: "#0f172a",
};

const cardLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  minWidth: 0,
};

const checkboxStyle: CSSProperties = {
  width: 20,
  height: 20,
  marginTop: 4,
  cursor: "pointer",
};

const badgeStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};
