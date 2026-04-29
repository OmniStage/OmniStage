
import { Header } from "@/components/Header";
import { GuestCard } from "@/components/GuestCard";
import { StatusCard } from "@/components/StatusCard";
import { guests } from "@/lib/mockData";

export default function DashboardPage() {
  const total = guests.length;
  const confirmados = guests.filter(g => g.status === "confirmado").length;
  const pendentes = guests.filter(g => g.status === "pendente").length;
  const entradas = guests.filter(g => g.status === "entrou").length;

  return (
    <main className="page">
      <div className="shell">
        <Header />
        <section className="grid">
          <div className="full kpis">
            <StatusCard label="Total" value={total} />
            <StatusCard label="Confirmados" value={confirmados} />
            <StatusCard label="Pendentes" value={pendentes} />
            <StatusCard label="Entradas" value={entradas} />
          </div>
          <section className="card full">
            <h2>Convidados</h2>
            <div className="list">
              {guests.map((guest) => <GuestCard key={guest.id} guest={guest} />)}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
