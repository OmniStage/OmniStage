import { supabase } from "@/lib/supabase";

export default async function AdminPage() {
  // ===== CLIENTES =====
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, nome, status, created_at");

  // ===== EVENTOS =====
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, nome, status, created_at");

  // ===== USUÁRIOS =====
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id");

  const totalClientes = tenants?.length || 0;
  const ativos = tenants?.filter(t => t.status === "ativo").length || 0;
  const bloqueados = tenants?.filter(t => t.status === "bloqueado").length || 0;

  const totalEventos = eventos?.length || 0;
  const aprovados = eventos?.filter(e => e.status === "aprovado").length || 0;
  const pendentes = eventos?.filter(e => e.status !== "aprovado").length || 0;

  const totalUsuarios = usuarios?.length || 0;

  const ultimasEmpresas = tenants?.slice(0, 5) || [];
  const ultimosEventos = eventos?.slice(0, 5) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      <h1 style={title}>Dashboard OmniStage</h1>

      {/* ===== STATS ===== */}
      <div style={grid}>
        <Card title="Empresas" value={totalClientes} />
        <Card title="Ativas" value={ativos} color="#16a34a" />
        <Card title="Bloqueadas" value={bloqueados} color="#dc2626" />
        <Card title="Usuários" value={totalUsuarios} color="#2563eb" />
        <Card title="Eventos" value={totalEventos} />
        <Card title="Aprovados" value={aprovados} color="#16a34a" />
        <Card title="Pendentes" value={pendentes} color="#f59e0b" />
      </div>

      {/* ===== LISTAS ===== */}
      <div style={grid2}>

        <section style={panel}>
          <h2 style={panelTitle}>Últimas Empresas</h2>
          {ultimasEmpresas.map(e => (
            <Item key={e.id} title={e.nome} subtitle={e.status} />
          ))}
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Últimos Eventos</h2>
          {ultimosEventos.map(e => (
            <Item key={e.id} title={e.nome} subtitle={e.status} />
          ))}
        </section>

      </div>

      {/* ===== AÇÕES ===== */}
      <section style={panel}>
        <h2 style={panelTitle}>Ações rápidas</h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button href="/admin/clientes">Criar empresa</Button>
          <Button href="/admin/redes">Criar rede</Button>
          <Button href="/admin/eventos">Eventos</Button>
        </div>
      </section>

    </div>
  );
}

/* ===== COMPONENTES ===== */

function Card({ title, value, color = "#7c3aed" }: any) {
  return (
    <div style={card}>
      <p style={label}>{title}</p>
      <strong style={{ ...valueStyle, color }}>{value}</strong>
    </div>
  );
}

function Item({ title, subtitle }: any) {
  return (
    <div style={item}>
      <strong>{title}</strong>
      <p style={sub}>{subtitle}</p>
    </div>
  );
}

function Button({ href, children }: any) {
  return (
    <a href={href} style={button}>
      {children}
    </a>
  );
}

/* ===== ESTILO ===== */

const title = {
  fontSize: 36,
  fontWeight: 900,
  color: "#0f172a"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16
};

const panel = {
  background: "#fff",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 20,
  padding: 20
};

const panelTitle = {
  marginBottom: 12,
  fontWeight: 900,
  fontSize: 18
};

const card = {
  background: "#fff",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 16,
  padding: 16
};

const label = {
  color: "#64748b",
  fontSize: 12
};

const valueStyle = {
  fontSize: 28
};

const item = {
  borderBottom: "1px solid #e2e8f0",
  padding: "10px 0"
};

const sub = {
  margin: 0,
  color: "#64748b",
  fontSize: 13
};

const button = {
  padding: "10px 16px",
  borderRadius: 999,
  background: "#7c3aed",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none"
};
