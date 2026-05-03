"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  total: number;
  confirmados: number;
  pendentes: number;
  entradas: number;
  restantes: number;
};

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_checkin: string | null;
  status_envio?: string | null;
  token?: string | null;
  created_at?: string | null;
};

type FiltroConvidados =
  | "todos"
  | "confirmados"
  | "pendentes"
  | "entraram"
  | "faltam"
  | "nao";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmados: 0,
    pendentes: 0,
    entradas: 0,
    restantes: 0,
  });

  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [filtro, setFiltro] = useState<FiltroConvidados>("todos");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  async function carregarDashboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select("*")
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar dashboard: " + error.message);
      setLoading(false);
      return;
    }

    const convidadosData = (data || []) as Convidado[];

    const total = convidadosData.length;
    const confirmados = convidadosData.filter((c) => c.status_rsvp === "confirmado").length;
    const pendentes = convidadosData.filter((c) => c.status_rsvp === "pendente").length;
    const entradas = convidadosData.filter((c) => c.status_checkin === "entrou").length;
    const restantes = Math.max(confirmados - entradas, 0);

    setConvidados(convidadosData);
    setStats({
      total,
      confirmados,
      pendentes,
      entradas,
      restantes,
    });

    setLoading(false);
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  const percentualConfirmados =
    stats.total > 0 ? Math.round((stats.confirmados / stats.total) * 100) : 0;

  const percentualEntradas =
    stats.confirmados > 0 ? Math.round((stats.entradas / stats.confirmados) * 100) : 0;

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return convidados.filter((convidado) => {
      const buscaOk =
        !termo ||
        [
          convidado.nome,
          convidado.grupo,
          convidado.telefone,
          convidado.email,
          convidado.token,
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!buscaOk) return false;

      if (filtro === "todos") return true;
      if (filtro === "confirmados") return convidado.status_rsvp === "confirmado";
      if (filtro === "pendentes") return convidado.status_rsvp === "pendente";
      if (filtro === "entraram") return convidado.status_checkin === "entrou";
      if (filtro === "faltam") {
        return convidado.status_rsvp === "confirmado" && convidado.status_checkin !== "entrou";
      }
      if (filtro === "nao") return convidado.status_rsvp === "nao";

      return true;
    });
  }, [convidados, filtro, busca]);

  const cards = [
    {
      label: "Total de convidados",
      value: stats.total,
      detail: "Base completa do evento",
      color: "#6d28d9",
      bg: "#ede9fe",
    },
    {
      label: "Confirmados",
      value: stats.confirmados,
      detail: `${percentualConfirmados}% da lista`,
      color: "#16a34a",
      bg: "#dcfce7",
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      detail: "Aguardando resposta",
      color: "#f59e0b",
      bg: "#fef3c7",
    },
    {
      label: "Entradas",
      value: stats.entradas,
      detail: `${percentualEntradas}% dos confirmados`,
      color: "#2563eb",
      bg: "#dbeafe",
    },
  ];

  const tabs: { key: FiltroConvidados; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "confirmados", label: "Confirmados" },
    { key: "pendentes", label: "Pendentes" },
    { key: "entraram", label: "Entraram" },
    { key: "faltam", label: "Faltam entrar" },
    { key: "nao", label: "Não vão" },
  ];

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage Dashboard</span>
          <h1 style={titleStyle}>Visão geral do evento</h1>
          <p style={subtitleStyle}>
            Acompanhe confirmações, pendências e entradas em tempo real.
          </p>
        </div>

        <button onClick={carregarDashboard} style={refreshButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar dados"}
        </button>
      </section>

      <section style={gridStyle}>
        {cards.map((card) => (
          <article key={card.label} style={metricCardStyle}>
            <div
              style={{
                ...iconBubbleStyle,
                background: card.bg,
                color: card.color,
              }}
            >
              ●
            </div>

            <p style={metricLabelStyle}>{card.label}</p>

            <strong style={metricValueStyle}>{loading ? "..." : card.value}</strong>

            <p style={metricDetailStyle}>{card.detail}</p>
          </article>
        ))}
      </section>

      <section style={contentGridStyle}>
        <article style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Confirmações</h2>
              <p style={panelTextStyle}>Progresso geral de RSVP</p>
            </div>

            <strong style={percentStyle}>{percentualConfirmados}%</strong>
          </div>

          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressBarStyle,
                width: `${percentualConfirmados}%`,
                background: "#6d28d9",
              }}
            />
          </div>

          <div style={miniStatsStyle}>
            <span>{stats.confirmados} confirmados</span>
            <span>{stats.pendentes} pendentes</span>
          </div>
        </article>

        <article style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Check-in</h2>
              <p style={panelTextStyle}>Entradas realizadas no evento</p>
            </div>

            <strong style={percentStyle}>{percentualEntradas}%</strong>
          </div>

          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressBarStyle,
                width: `${percentualEntradas}%`,
                background: "#16a34a",
              }}
            />
          </div>

          <div style={miniStatsStyle}>
            <span>{stats.entradas} entradas</span>
            <span>{stats.restantes} restantes</span>
          </div>
        </article>
      </section>

      <section style={largePanelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Última entrada</h2>
            <p style={panelTextStyle}>Registro mais recente do check-in</p>
          </div>

          <span style={statusPillStyle}>Ao vivo</span>
        </div>

        <div style={emptyStateStyle}>Nenhuma entrada registrada ainda.</div>
      </section>

      <section style={largePanelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Convidados</h2>
            <p style={panelTextStyle}>Filtre a lista por RSVP, check-in ou busca.</p>
          </div>

          <span style={itemsPillStyle}>{convidadosFiltrados.length} itens</span>
        </div>

        <div style={tabsStyle}>
          {tabs.map((tab) => {
            const active = filtro === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key)}
                style={{
                  ...tabButtonStyle,
                  background: active ? "#6d28d9" : "var(--card)",
                  color: active ? "#fff" : "var(--text)",
                  border: active ? "1px solid #6d28d9" : "1px solid var(--line)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={searchRowStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, grupo, telefone, e-mail ou token"
            style={searchInputStyle}
          />
        </div>

        <div style={guestListStyle}>
          {convidadosFiltrados.length === 0 && (
            <div style={emptyStateStyle}>Nenhum convidado encontrado com estes filtros.</div>
          )}

          {convidadosFiltrados.map((convidado) => (
            <article key={convidado.id} style={guestRowStyle}>
              <div style={{ minWidth: 0 }}>
                <strong style={guestNameStyle}>{convidado.nome || "Sem nome"}</strong>
                <p style={guestMetaStyle}>
                  {convidado.grupo || "Sem grupo"} • {convidado.telefone || "Sem telefone"}
                </p>
              </div>

              <div style={guestBadgesStyle}>
                <span style={getRsvpBadgeStyle(convidado.status_rsvp)}>
                  {labelRsvp(convidado.status_rsvp)}
                </span>
                <span style={getCheckinBadgeStyle(convidado.status_checkin)}>
                  {convidado.status_checkin === "entrou" ? "Entrou" : "Não entrou"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Não vai";
  return "Pendente";
}

function getRsvpBadgeStyle(status: string | null): React.CSSProperties {
  if (status === "confirmado") return badgeStyle("#dcfce7", "#16a34a");
  if (status === "nao") return badgeStyle("#fee2e2", "#dc2626");
  return badgeStyle("#fef3c7", "#f59e0b");
}

function getCheckinBadgeStyle(status: string | null): React.CSSProperties {
  if (status === "entrou") return badgeStyle("#dbeafe", "#2563eb");
  return badgeStyle("#f1f5f9", "#64748b");
}

function badgeStyle(background: string, color: string): React.CSSProperties {
  return {
    padding: "7px 11px",
    borderRadius: 999,
    background,
    color,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const heroStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 24,
  padding: 28,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontWeight: 800,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 8px",
  fontSize: 34,
  fontWeight: 900,
  color: "var(--text)",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--muted)",
  fontSize: 16,
};

const refreshButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#6d28d9",
  color: "#fff",
  padding: "13px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
};

const iconBubbleStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
  fontSize: 18,
};

const metricLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 700,
};

const metricValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 36,
  fontWeight: 900,
  color: "var(--text)",
};

const metricDetailStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--muted)",
  fontSize: 13,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
};

const largePanelStyle: React.CSSProperties = {
  ...panelStyle,
  minHeight: 180,
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "var(--text)",
};

const panelTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
};

const percentStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontSize: 24,
  fontWeight: 900,
};

const progressTrackStyle: React.CSSProperties = {
  width: "100%",
  height: 10,
  background: "#e2e8f0",
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 24,
};

const progressBarStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

const miniStatsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 14,
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 700,
};

const statusPillStyle: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#16a34a",
  fontSize: 12,
  fontWeight: 900,
};

const itemsPillStyle: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 900,
};

const emptyStateStyle: React.CSSProperties = {
  marginTop: 24,
  border: "1px dashed var(--line)",
  borderRadius: 16,
  padding: 22,
  color: "var(--muted)",
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 18,
};

const tabButtonStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 999,
  fontWeight: 800,
  cursor: "pointer",
};

const searchRowStyle: React.CSSProperties = {
  marginTop: 16,
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  outline: "none",
  fontWeight: 700,
};

const guestListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 16,
};

const guestRowStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
};

const guestNameStyle: React.CSSProperties = {
  display: "block",
  color: "var(--text)",
  fontSize: 15,
  fontWeight: 900,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const guestMetaStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "var(--muted)",
  fontSize: 13,
};

const guestBadgesStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};
