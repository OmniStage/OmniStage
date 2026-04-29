import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const { data: guests, error } = await supabase
    .from("convidados")
    .select("*")
    .order("criado_em", { ascending: false });

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

  const safeGuests = guests || [];

  const total = safeGuests.length;
  const confirmados = safeGuests.filter((g) => g.status_rsvp === "confirmado").length;
  const pendentes = safeGuests.filter((g) => g.status_rsvp === "pendente").length;
  const entradas = safeGuests.filter((g) => g.checkin_realizado === true).length;

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
                      <p>
                        {g.telefone || "Sem telefone"} · Token {g.token}
                      </p>
                    </div>

                    <span className={`badge ${g.checkin_realizado ? "entrou" : g.status_rsvp}`}>
                      {g.checkin_realizado ? "entrou" : g.status_rsvp}
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
