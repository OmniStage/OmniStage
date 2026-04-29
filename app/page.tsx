
import { Header } from "@/components/Header";

export default function HomePage() {
  return (
    <main className="page">
      <div className="shell">
        <Header />
        <section className="grid">
          <div className="card hero">
            <p>Base profissional</p>
            <h1>Sistema OmniStage</h1>
            <p>
              Estrutura inicial em Next.js para convite digital, check-in com QR Code,
              dashboard do evento e futura integração com Supabase.
            </p>
            <div className="nav" style={{ marginTop: 18 }}>
              <a className="btn gold" href="/dashboard">Abrir dashboard</a>
              <a className="btn" href="/checkin">Ir para check-in</a>
            </div>
          </div>
          <aside className="card side">
            <h2>Módulos</h2>
            <p>Convite digital</p>
            <p>Check-in</p>
            <p>Painel de resultados</p>
            <p>Supabase pronto para conectar</p>
          </aside>
        </section>
      </div>
    </main>
  );
}
