import { supabase } from "@/lib/supabase";

export default async function AdminPage() {
  const { count: totalClientes } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true });

  const { count: totalEventos } = await supabase
    .from("eventos")
    .select("*", { count: "exact", head: true });

  const { count: totalUsuarios } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ fontSize: 42 }}>Admin OmniStage</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          marginTop: 30,
        }}
      >
        <Card title="Clientes" value={totalClientes || 0} />
        <Card title="Eventos" value={totalEventos || 0} />
        <Card title="Usuários" value={totalUsuarios || 0} />
      </div>
    </main>
  );
}

function Card({ title, value }: any) {
  return (
    <div
      style={{
        background: "#111827",
        color: "#fff",
        padding: 24,
        borderRadius: 16,
      }}
    >
      <p style={{ opacity: 0.6 }}>{title}</p>
      <h2 style={{ fontSize: 32 }}>{value}</h2>
    </div>
  );
}
