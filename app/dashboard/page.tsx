export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";

// 🔥 FORÇA o Next.js a NÃO cachear (ESSENCIAL)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const { data: guests, error } = await supabase
    .from("convidados")
    .select("*");

  // 🚨 Se der erro, mostra na tela (muito importante)
  if (error) {
    return (
      <main className="page">
        <div className="shell">
          <Header />
          <section className="card full">
            <h2>Erro ao carregar dados</h2>
            <p>{error.message}</p>
          </section>
        </div>
      </main>
    );
  }

  // 🧠 Segurança (caso venha null)
  const safeGuests = guests || [];

  const total = safeGuests.length;
  const confirmados = safeGuests.filter(g => g.status === "confirmado").length;
  const pendentes = safeGuests.filter(g => g.status === "pendente").length;
  const entradas = safeGuests.filter(g => g.status === "entrou").length;

  return (
    <main className="page">
      <div className="shell">
        <Header />

        <section className="grid">
          <div className="full kpis">
            <div className="card">
              <strong>{total}</strong>
              <p>Total</p>
            </div>

            <div className="card">
              <strong>{confirmados}</strong>
              <p>Confirmados</p>
            </div>

            <div className="card">
              <strong>{pendentes}</strong>
              <p>Pendentes</p>
            </div>

            <div className="card">
              <strong>{entradas}</strong>
              <p>Entradas</p>
            </div>
          </div>

          <section className="card full">
            <h2>Convidados</h2>

            <div className="list">
              {safeGuests.length === 0 ? (
                <p style={{ opacity: 0.6 }}>
                  Nenhum convidado encontrado no banco.
                </p>
              ) : (
                safeGuests.map((g) => (
                  <div key={g.id} className="guest">
                    <div>
                      <strong>{g.nome}</strong>
                      <p>{g.telefone}</p>
                    </div>

                    <span className={`badge ${g.status}`}>
                      {g.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
