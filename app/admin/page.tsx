import { supabase } from "@/lib/supabase";

/* ========================= */

export default async function AdminPage() {
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, nome, status, plano_id, created_at");

  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, nome, status, created_at");

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id");

  /* ===== KPIs ===== */
  const totalEmpresas = tenants?.length || 0;
  const ativos = tenants?.filter(t => t.status === "ativo").length || 0;
  const bloqueados = tenants?.filter(t => t.status === "bloqueado").length || 0;

  const totalEventos = eventos?.length || 0;
  const aprovados = eventos?.filter(e => e.status === "aprovado").length || 0;

  const totalUsuarios = usuarios?.length || 0;

  /* ===== CRESCIMENTO (últimos dias) ===== */
  const crescimento = agruparPorDia(tenants || []);

  /* ===== PLANOS ===== */
  const planos = agruparPlanos(tenants || []);

  /* ===== LISTAS ===== */
  const ultimasEmpresas = (tenants || []).slice(0, 5);
  const ultimosEventos = (eventos || []).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      <h1 style={title}>Dashboard OmniStage</h1>

      {/* ===== KPIs ===== */}
      <div style={grid}>
        <Card title="Empresas" value={totalEmpresas} />
        <Card title="Ativas" value={ativos} color="#16a34a" />
        <Card title="Bloqueadas" value={bloqueados} color="#dc2626" />
        <Card title="Usuários" value={totalUsuarios} color="#2563eb" />
        <Card title="Eventos" value={totalEventos} />
        <Card title="Aprovados" value={aprovados} color="#16a34a" />
      </div>

      {/* ===== GRÁFICO ===== */}
      <section style={panel}>
        <h2 style={panelTitle}>Crescimento de empresas</h2>
        <MiniChart data={crescimento} />
      </section>

      {/* ===== DISTRIBUIÇÃO ===== */}
      <section style={panel}>
        <h2 style={panelTitle}>Distribuição por plano</h2>

        <div style={{ display: "flex", gap: 12 }}>
          {Object.entries(planos).map(([plano, qtd]) => (
            <div key={plano} style={badge}>
              {plano}: <strong>{qtd}</strong>
            </div>
          ))}
        </div>
      </section>

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

        <div style={{ display: "flex", gap: 12 }}>
          <Button href="/admin/clientes">Criar empresa</Button>
          <Button href="/admin/redes">Criar rede</Button>
          <Button href="/admin/eventos">Eventos</Button>
        </div>
      </section>

    </div>
  );
}

/* ========================= */
/* COMPONENTES */
/* ========================= */

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

/* ===== MINI GRÁFICO ===== */

function MiniChart({ data }: any) {
  const max = Math.max(...data.map((d: any) => d.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
      {data.map((d: any, i: number) => (
        <div
          key={i}
          style={{
            width: 16,
            height: `${(d.value / max) * 100}%`,
            background: "#7c3aed",
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}

/* ========================= */
/* HELPERS */
/* ========================= */

function agruparPorDia(lista: any[]) {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const dia = new Date(item.created_at).toLocaleDateString("pt-BR");
    mapa[dia] = (mapa[dia] || 0) + 1;
  });

  return Object.entries(mapa).map(([date, value]) => ({ date, value }));
}

function agruparPlanos(lista: any[]) {
  const mapa: Record<string, number> = {};

  lista.forEach((t) => {
    const plano = t.plano_id || "sem plano";
    mapa[plano] = (mapa[plano] || 0) + 1;
  });

  return mapa;
}

/* ========================= */
/* STYLE */
/* ========================= */

const title = { fontSize: 36, fontWeight: 900 };

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const panel = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: 20,
};

const panelTitle = {
  marginBottom: 12,
  fontWeight: 900,
};

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
};

const label = { color: "#64748b" };
const valueStyle = { fontSize: 28 };

const item = {
  borderBottom: "1px solid #e2e8f0",
  padding: "10px 0",
};

const sub = { margin: 0, color: "#64748b" };

const button = {
  padding: "10px 16px",
  borderRadius: 999,
  background: "#7c3aed",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
};

const badge = {
  background: "#ede9fe",
  padding: "8px 12px",
  borderRadius: 999,
};
