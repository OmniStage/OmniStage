"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empresa = {
  id: string;
  nome: string;
  plano?: string | null;
  status?: string | null;
};

type NetworkTenant = {
  tenant_id: string;
  tenants: Empresa | null;
};

type NetworkMember = {
  network_id: string;
  networks: {
    id: string;
    nome: string;
  } | null;
};

type Convidado = {
  id: string;
  tenant_id: string;
  nome: string;
  status_rsvp: string | null;
};

type Checkin = {
  id: string;
  tenant_id: string;
  convidado_id: string | null;
  data_checkin: string;
};

export default function NetworkDashboardPage() {
  const [networkName, setNetworkName] = useState("Rede");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarDados() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("network_members")
      .select("network_id, networks(id, nome)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData?.network_id) {
      console.error(memberError);
      setLoading(false);
      return;
    }
const member = memberData as any;

const network = member?.networks?.[0];

setNetworkName(network?.nome || "Rede");
    
    const { data: empresasDaRede, error: empresasError } = await supabase
      .from("network_tenants")
      .select("tenant_id, tenants(id, nome, plano, status)")
      .eq("network_id", member.network_id);

    if (empresasError) {
      console.error(empresasError);
      setLoading(false);
      return;
    }

    const listaEmpresas =
      ((empresasDaRede || []) as NetworkTenant[])
        .map((item) => item.tenants)
        .filter(Boolean) as Empresa[];

    setEmpresas(listaEmpresas);

    const tenantIds = listaEmpresas.map((empresa) => empresa.id);

    if (tenantIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: convidadosData } = await supabase
      .from("convidados")
      .select("id, tenant_id, nome, status_rsvp")
      .in("tenant_id", tenantIds);

    const { data: checkinsData } = await supabase
      .from("checkins")
      .select("id, tenant_id, convidado_id, data_checkin")
      .in("tenant_id", tenantIds);

    setConvidados((convidadosData || []) as Convidado[]);
    setCheckins((checkinsData || []) as Checkin[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const metricas = useMemo(() => {
    const total = convidados.length;
    const confirmados = convidados.filter(
      (c) => c.status_rsvp?.toLowerCase() === "confirmado"
    ).length;
    const pendentes = convidados.filter(
      (c) => !c.status_rsvp || c.status_rsvp?.toLowerCase() === "pendente"
    ).length;
    const entradas = checkins.length;
    const restantes = Math.max(confirmados - entradas, 0);

    return { total, confirmados, pendentes, entradas, restantes };
  }, [convidados, checkins]);

  function metricasEmpresa(tenantId: string) {
    const convidadosEmpresa = convidados.filter((c) => c.tenant_id === tenantId);
    const checkinsEmpresa = checkins.filter((c) => c.tenant_id === tenantId);

    const total = convidadosEmpresa.length;
    const confirmados = convidadosEmpresa.filter(
      (c) => c.status_rsvp?.toLowerCase() === "confirmado"
    ).length;
    const pendentes = convidadosEmpresa.filter(
      (c) => !c.status_rsvp || c.status_rsvp?.toLowerCase() === "pendente"
    ).length;

    return {
      total,
      confirmados,
      pendentes,
      entradas: checkinsEmpresa.length,
    };
  }

  const ranking = [...empresas]
    .map((empresa) => ({
      ...empresa,
      metricas: metricasEmpresa(empresa.id),
    }))
    .sort((a, b) => b.metricas.confirmados - a.metricas.confirmados);

  if (loading) {
    return (
      <main style={pageStyle}>
        <h1>Carregando dashboard da rede...</h1>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={{ marginBottom: 34 }}>
        <p style={{ color: "#a78bfa", fontWeight: 900, margin: 0 }}>🔵 APP</p>
        <h1 style={{ fontSize: 58, margin: "8px 0 8px" }}>
          Dashboard da Rede
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 18 }}>
          Visão consolidada de {networkName}
        </p>
      </header>

      <section style={gridCards}>
        <MetricCard title="Empresas" value={empresas.length} />
        <MetricCard title="Convidados" value={metricas.total} />
        <MetricCard title="Confirmados" value={metricas.confirmados} />
        <MetricCard title="Pendentes" value={metricas.pendentes} />
        <MetricCard title="Entradas" value={metricas.entradas} />
        <MetricCard title="Restantes" value={metricas.restantes} />
      </section>

      <section style={panelStyle}>
        <h2 style={{ fontSize: 32, marginTop: 0 }}>Empresas da Rede</h2>

        <div style={empresaGrid}>
          {empresas.map((empresa) => {
            const m = metricasEmpresa(empresa.id);

            return (
              <div key={empresa.id} style={empresaCard}>
                <div>
                  <p style={{ color: "#a78bfa", fontWeight: 800, margin: 0 }}>
                    Empresa
                  </p>
                  <h3 style={{ fontSize: 24, margin: "6px 0 16px" }}>
                    {empresa.nome}
                  </h3>
                </div>

                <div style={miniGrid}>
                  <MiniMetric label="Total" value={m.total} />
                  <MiniMetric label="Confirmados" value={m.confirmados} />
                  <MiniMetric label="Pendentes" value={m.pendentes} />
                  <MiniMetric label="Entradas" value={m.entradas} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ fontSize: 32, marginTop: 0 }}>Ranking da Rede</h2>

        {ranking.map((empresa, index) => (
          <div key={empresa.id} style={rankingRow}>
            <strong>
              #{index + 1} — {empresa.nome}
            </strong>
            <span style={{ color: "#facc15", fontWeight: 900 }}>
              {empresa.metricas.confirmados} confirmados
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={metricCard}>
      <p style={{ color: "#94a3b8", margin: 0 }}>{title}</p>
      <h2 style={{ fontSize: 42, margin: "12px 0 0", color: "#facc15" }}>
        {value}
      </h2>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={miniMetric}>
      <strong style={{ fontSize: 22, color: "#facc15" }}>{value}</strong>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: 42,
  background:
    "radial-gradient(circle at top left, rgba(124,58,237,0.28), transparent 30%), linear-gradient(135deg, #020617, #0f172a)",
  color: "#fff",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const gridCards: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const metricCard: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.82))",
  border: "1px solid rgba(167,139,250,0.22)",
  borderRadius: 26,
  padding: 26,
  boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
};

const panelStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.72)",
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: 30,
  padding: 28,
  marginTop: 26,
};

const empresaGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
};

const empresaCard: React.CSSProperties = {
  background: "rgba(2,6,23,0.78)",
  border: "1px solid rgba(250,204,21,0.24)",
  borderRadius: 24,
  padding: 22,
};

const miniGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 10,
};

const miniMetric: React.CSSProperties = {
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const rankingRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(148,163,184,0.14)",
  padding: "16px 0",
};
