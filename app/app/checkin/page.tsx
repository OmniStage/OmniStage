import { Header } from "@/components/Header";
import { GuestCard } from "@/components/GuestCard";
import { guests } from "@/lib/mockData";

export default function CheckinPage() {
  return (
    <main className="page">
      <div className="shell">
        <Header />
        <section className="grid">
          <div className="card hero">
            <p>Entrada do evento</p>
            <h1>Check-in</h1>
            <p>Leitura por QR Code e busca manual por nome ou token.</p>
            <input className="input" placeholder="Buscar convidado..." />
            <div className="nav" style={{ marginTop: 16 }}>
              <button className="btn gold">Habilitar QR Code</button>
              <button className="btn">Liberar manual</button>
            </div>
          </div>
          <aside className="card side">
            <h2>Última leitura</h2>
            <p>Nenhuma leitura realizada nesta sessão.</p>
          </aside>
          <section className="card full">
            <h2>Lista rápida</h2>
            <div className="list">
              {guests.map((guest) => <GuestCard key={guest.id} guest={guest} />)}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
