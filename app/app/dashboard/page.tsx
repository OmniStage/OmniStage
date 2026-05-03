"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  total: number;
  confirmados: number;
  pendentes: number;
  entradas: number;
  restantes: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmados: 0,
    pendentes: 0,
    entradas: 0,
    restantes: 0,
  });

  const [loading, setLoading] = useState(true);

  async function carregarDashboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select("status_rsvp, status_checkin");

    if (error) {
      alert("Erro ao carregar dashboard: " + error.message);
      setLoading(false);
      return;
    }

    const convidados = data || [];

    const total = convidados.length;
    const confirmados = convidados.filter((c) => c.status_rsvp === "confirmado").length;
    const pendentes = convidados.filter((c) => c.status_rsvp === "pendente").length;
    const entradas = convidados.filter((c) => c.status_checkin === "entrou").length;
    const restantes = Math.max(confirmados - entradas, 0);

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

            <strong style={metricValueStyle}>
              {loading ? "..." : card.value}
            </strong>

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

        <div style={emptyStateStyle}>
          Nenhuma entrada registrada ainda.
        </div>
      </section>
    </div>
  );
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

const emptyStateStyle: React.CSSProperties = {
  marginTop: 24,
  border: "1px dashed var(--line)",
  borderRadius: 16,
  padding: 22,
  color: "var(--muted)",
};
