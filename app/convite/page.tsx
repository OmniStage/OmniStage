
import { Header } from "@/components/Header";

export default function ConvitePage() {
  return (
    <main className="page">
      <div className="shell">
        <Header />
        <section className="card hero" style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p>Valentina XV</p>
          <h1>Você é nosso convidado</h1>
          <p>Confirme sua presença e salve seu cartão de entrada para apresentar no evento.</p>
          <div className="nav" style={{ justifyContent: "center", marginTop: 18 }}>
            <button className="btn gold">Confirmar presença</button>
            <button className="btn">Salvar cartão</button>
          </div>
        </section>
      </div>
    </main>
  );
}
