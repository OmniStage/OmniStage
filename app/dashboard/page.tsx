import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";

export default async function DashboardPage() {
  const { data: guests } = await supabase
    .from("convidados")
    .select("*");

  const total = guests?.length || 0;
  const confirmados = guests?.filter(g => g.status === "confirmado").length || 0;
  const pendentes = guests?.filter(g => g.status === "pendente").length || 0;
  const entradas = guests?.filter(g => g.status === "entrou").length || 0;

  return (
    <main className="page">
      <div className="shell">
        <Header />

        <section className="grid">
          <div className="full kpis">
            <div className="card"><strong>{total}</strong><p>Total</p></div>
            <div className="card"><strong>{confirmados}</strong><p>Confirmados</p></div>
            <div className="card"><strong>{pendentes}</strong><p>Pendentes</p></div>
            <div className="card"><strong>{entradas}</strong><p>Entradas</p></div>
          </div>

          <section className="card full">
            <h2>Convidados</h2>

            <div className="list">
              {guests?.map((g) => (
                <div key={g.id} className="guest">
                  <div>
                    <strong>{g.nome}</strong>
                    <p>{g.telefone}</p>
                  </div>
                  <span className={`badge ${g.status}`}>
                    {g.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
