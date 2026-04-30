import { supabase } from "@/lib/supabase";

export default async function ClientesPage() {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: 40 }}>
      <h1>Clientes</h1>

      <div style={{ marginTop: 20 }}>
        {data?.map((cliente) => (
          <div
            key={cliente.id}
            style={{
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 12,
              marginBottom: 10,
            }}
          >
            <strong>{cliente.nome}</strong>
            <p>{cliente.plano}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
