export default function AdminListaPresentesPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 32,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7c3aed",
            marginBottom: 10,
          }}
        >
          Admin OmniStage
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 950,
            color: "#0f172a",
            letterSpacing: "-0.05em",
          }}
        >
          Lista de Presentes
        </h1>

        <p
          style={{
            marginTop: 12,
            color: "#64748b",
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          Gerencie o módulo de presentes, experiências e pagamentos
          via PIX da plataforma OmniStage.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 18,
        }}
      >
        <Card
          title="Presentes físicos"
          text="Itens tradicionais cadastrados pelos clientes."
        />

        <Card
          title="Experiências"
          text="Viagens, passeios, jantares, museus e experiências especiais."
        />

        <Card
          title="PIX"
          text="Pagamentos diretos para aniversariante ou anfitrião."
        />
      </div>
    </div>
  );
}

function Card({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: 22,
        border: "1px solid #e2e8f0",
        boxShadow: "0 16px 40px rgba(15,23,42,0.05)",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          marginTop: 10,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}
