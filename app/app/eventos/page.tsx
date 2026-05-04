"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  cidade: string | null;
  cliente_id: string | null;
  status_aprovacao: string | null;
  ativo: boolean | null;
  created_at: string | null;
};

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
};

export default function AdminEventosPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo() {
    setLoading(true);
    await carregarClientes();
    await carregarEventos();
    setLoading(false);
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,email")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return;
    }

    setClientes((data || []) as Cliente[]);
  }

  async function carregarEventos() {
    const { data, error } = await supabase
      .from("eventos")
      .select("id,nome,data_evento,local,cidade,cliente_id,status_aprovacao,ativo,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    setEventos((data || []) as Evento[]);
  }

  function clienteDoEvento(evento: Evento) {
    return clientes.find((cliente) => cliente.id === evento.cliente_id) || null;
  }

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      const cliente = clientes.find((item) => item.id === evento.cliente_id);

      const buscaOk =
        !termo ||
        [evento.nome, evento.local, evento.cidade, cliente?.nome, cliente?.email]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      const filtroOk = filtro === "todos" || evento.status_aprovacao === filtro;

      return buscaOk && filtroOk;
    });
  }, [eventos, clientes, busca, filtro]);

  const stats = useMemo(() => {
    return {
      total: eventos.length,
      aprovados: eventos.filter((e) => e.status_aprovacao === "aprovado").length,
      aguardando: eventos.filter((e) => e.status_aprovacao === "aguardando_aprovacao").length,
      bloqueados: eventos.filter((e) => e.status_aprovacao === "bloqueado").length,
    };
  }, [eventos]);

  async function atualizarEvento(id: string, campos: Record<string, any>) {
    const { error } = await supabase.from("eventos").update(campos).eq("id", id);

    if (error) {
      alert("Erro ao atualizar evento: " + error.message);
      return;
    }

    await carregarEventos();
  }

  async function vincularCliente(eventoId: string, clienteId: string) {
    await atualizarEvento(eventoId, { cliente_id: clienteId || null });
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .admin-event-card {
          transition: transform .17s cubic-bezier(.2,.8,.2,1), box-shadow .17s ease, border-color .17s ease;
        }

        .admin-event-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 42px rgba(15,23,42,.08);
          border-color: rgba(124,58,237,.22);
        }

        @media (max-width: 900px) {
          .admin-event-card, .admin-event-filters {
            grid-template-columns: 1fr !important;
          }
          .admin-event-actions {
            justify-content: flex-start !important;
          }
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Admin OmniStage</span>
          <h1 style={titleStyle}>Eventos</h1>
          <p style={subtitleStyle}>
            Aprove eventos criados por clientes, vincule empresas e controle liberação.
          </p>
        </div>

        <button onClick={carregarTudo} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar eventos"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Eventos" value={stats.total} detail="Total" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Aprovados" value={stats.aprovados} detail="Liberados" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Aguardando" value={stats.aguardando} detail="Em análise" color="#f59e0b" bg="#fef3c7" />
        <MetricCard label="Bloqueados" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Lista de eventos</h2>
            <p style={panelTextStyle}>Eventos criados no app do cliente aparecem aqui.</p>
          </div>

          <span style={counterStyle}>{eventosFiltrados.length} exibidos</span>
        </div>

        <div className="admin-event-filters" style={filtersStyle}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por evento, cliente, local ou cidade"
            style={inputStyle}
          />

          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={inputStyle}>
            <option value="todos">Todos os status</option>
            <option value="aguardando_aprovacao">Aguardando aprovação</option>
            <option value="aprovado">Aprovado</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="reprovado">Reprovado</option>
            <option value="rascunho">Rascunho</option>
          </select>
        </div>

        <div style={listStyle}>
          {eventosFiltrados.map((evento) => {
            const cliente = clienteDoEvento(evento);

            return (
              <article key={evento.id} className="admin-event-card" style={eventCardStyle}>
                <div>
                  <div style={titleLineStyle}>
                    <strong style={itemTitleStyle}>{evento.nome}</strong>
                    <span style={getStatusStyle(evento.status_aprovacao)}>
                      {labelStatus(evento.status_aprovacao)}
                    </span>
                  </div>

                  <div style={itemMetaStyle}>
                    Cliente: <strong>{cliente?.nome || "Sem cliente vinculado"}</strong>
                  </div>

                  <div style={smallLineStyle}>
                    Data: <strong>{evento.data_evento ? formatarData(evento.data_evento) : "Não definida"}</strong> · Local:{" "}
                    <strong>{evento.local || "Não informado"}</strong> · Cidade:{" "}
                    <strong>{evento.cidade || "Não informada"}</strong>
                  </div>

                  <small style={idStyle}>ID: {evento.id}</small>
                </div>

                <div className="admin-event-actions" style={actionsStyle}>
                  <select
                    value={evento.cliente_id || ""}
                    onChange={(e) => vincularCliente(evento.id, e.target.value)}
                    style={miniSelectStyle}
                  >
                    <option value="">Sem cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>

                  {evento.status_aprovacao !== "aprovado" && (
                    <button
                      onClick={() => atualizarEvento(evento.id, { status_aprovacao: "aprovado", ativo: true })}
                      style={approveButtonStyle}
                    >
                      Aprovar
                    </button>
                  )}

                  {evento.status_aprovacao !== "bloqueado" && (
                    <button
                      onClick={() => atualizarEvento(evento.id, { status_aprovacao: "bloqueado", ativo: false })}
                      style={blockButtonStyle}
                    >
                      Bloquear
                    </button>
                  )}

                  {evento.status_aprovacao !== "reprovado" && (
                    <button
                      onClick={() => atualizarEvento(evento.id, { status_aprovacao: "reprovado", ativo: false })}
                      style={dangerButtonStyle}
                    >
                      Reprovar
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && eventosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum evento encontrado.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  color,
  bg,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  bg: string;
}) {
  return (
    <article style={metricCardStyle}>
      <div style={{ ...iconStyle, background: bg, color }}>●</div>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <p style={metricDetailStyle}>{detail}</p>
    </article>
  );
}

function labelStatus(status: string | null) {
  if (status === "aprovado") return "Aprovado";
  if (status === "bloqueado") return "Bloqueado";
  if (status === "reprovado") return "Reprovado";
  if (status === "aguardando_aprovacao") return "Aguardando aprovação";
  return "Rascunho";
}

function getStatusStyle(status: string | null): React.CSSProperties {
  if (status === "aprovado") return activeBadgeStyle;
  if (status === "bloqueado" || status === "reprovado") return blockedBadgeStyle;
  if (status === "aguardando_aprovacao") return pendingBadgeStyle;
  return neutralBadgeStyle;
}

function formatarData(data: string | null) {
  if (!data) return "Não informado";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const pageStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 22 };
const heroStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,.95)", borderRadius: 26, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, boxShadow: "0 24px 70px rgba(15,23,42,.08)", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { color: "#7c3aed", fontWeight: 950, fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em" };
const titleStyle: React.CSSProperties = { margin: "8px 0", fontSize: 36, fontWeight: 950, color: "#0f172a", letterSpacing: "-.05em" };
const subtitleStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 16, lineHeight: 1.45 };
const primaryButtonStyle: React.CSSProperties = { border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", padding: "13px 18px", borderRadius: 15, fontWeight: 900, cursor: "pointer", boxShadow: "0 12px 26px rgba(124,58,237,.24)" };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 };
const metricCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,.95)", borderRadius: 22, padding: 18, boxShadow: "0 14px 36px rgba(15,23,42,.06)" };
const iconStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 15 };
const metricLabelStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 900 };
const metricValueStyle: React.CSSProperties = { display: "block", marginTop: 7, fontSize: 32, lineHeight: 1, fontWeight: 950, color: "#0f172a" };
const metricDetailStyle: React.CSSProperties = { margin: "8px 0 0", color: "#64748b", fontSize: 12 };
const panelStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,.95)", borderRadius: 24, padding: 24, boxShadow: "0 24px 70px rgba(15,23,42,.08)" };
const panelHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const panelTitleStyle: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 950, color: "#0f172a" };
const panelTextStyle: React.CSSProperties = { margin: "6px 0 0", color: "#64748b", lineHeight: 1.4 };
const counterStyle: React.CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "rgba(124,58,237,.08)", color: "#7c3aed", fontSize: 13, fontWeight: 950 };
const filtersStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 260px", gap: 10, marginTop: 18 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "13px 15px", borderRadius: 15, border: "1px solid rgba(226,232,240,.95)", background: "#f8fafc", color: "#0f172a", outline: "none", fontWeight: 850 };
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 };
const eventCardStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,.95)", borderRadius: 20, background: "#fbfdff", padding: 16, display: "grid", gridTemplateColumns: "minmax(280px,1fr) auto", gap: 14, alignItems: "center" };
const titleLineStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const itemTitleStyle: React.CSSProperties = { color: "#0f172a", fontSize: 17, fontWeight: 950 };
const itemMetaStyle: React.CSSProperties = { color: "#334155", fontSize: 14, fontWeight: 850, marginTop: 4 };
const smallLineStyle: React.CSSProperties = { color: "#64748b", fontSize: 12, marginTop: 6 };
const idStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 10, fontWeight: 700, wordBreak: "break-all", display: "block", marginTop: 6 };
const actionsStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" };
const miniSelectStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,.95)", background: "#fff", color: "#0f172a", padding: "10px 11px", borderRadius: 999, fontWeight: 900, outline: "none", maxWidth: 220 };
const approveButtonStyle: React.CSSProperties = { border: "1px solid rgba(22,163,74,.24)", background: "#dcfce7", color: "#166534", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const blockButtonStyle: React.CSSProperties = { border: "1px solid rgba(245,158,11,.24)", background: "#fef3c7", color: "#92400e", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const dangerButtonStyle: React.CSSProperties = { border: "1px solid rgba(220,38,38,.24)", background: "#fee2e2", color: "#991b1b", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const activeBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 950 };
const blockedBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 950 };
const pendingBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 950 };
const neutralBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#e2e8f0", color: "#475569", fontSize: 11, fontWeight: 950 };
const emptyStyle: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed rgba(148,163,184,.5)", color: "#64748b" };

