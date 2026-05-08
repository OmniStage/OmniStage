export default function AdminListaPresentesPage() {
  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Admin OmniStage</span>
          <h1 style={titleStyle}>Lista de Presentes</h1>
          <p style={subtitleStyle}>
            Gerencie o módulo de presentes físicos, experiências e presentes em valor.
            A liberação principal continua por cliente, e cada evento poderá escolher
            quais opções ficam habilitadas para os convidados.
          </p>
        </div>

        <div style={heroBadgeStyle}>Módulo premium</div>
      </section>

      <section style={cardsGridStyle}>
        <Card
          title="Presentes físicos"
          text="Itens tradicionais cadastrados pelo cliente, como produtos, brinquedos, decoração ou itens personalizados."
        />

        <Card
          title="Experiências"
          text="Passeios, viagens, jantares, visitas a museus, hospedagens e momentos especiais."
        />

        <Card
          title="Presentes em valor"
          text="Contribuições em dinheiro para sonhos, viagens, experiências e objetivos especiais, pagas via PIX."
        />
      </section>

      <section style={panelStyle}>
        <div>
          <span style={eyebrowStyle}>Como vai funcionar</span>
          <h2 style={sectionTitleStyle}>Liberação por cliente e configuração por evento</h2>
          <p style={sectionTextStyle}>
            No admin, você libera o módulo para o cliente. Depois, dentro de cada evento,
            o cliente escolhe se quer usar presentes físicos, experiências, presentes em valor
            ou uma combinação das três opções.
          </p>
        </div>

        <div style={flowGridStyle}>
          <FlowItem
            number="1"
            title="Admin libera o módulo"
            text="A empresa recebe acesso à Lista de Presentes no cadastro do cliente."
          />

          <FlowItem
            number="2"
            title="Cliente ativa no evento"
            text="O cliente define quais tipos de presentes estarão disponíveis naquele evento."
          />

          <FlowItem
            number="3"
            title="Convidado presenteia"
            text="O convidado escolhe um item ou presente em valor e recebe os dados de PIX."
          />
        </div>
      </section>

      <section style={panelStyle}>
        <div>
          <span style={eyebrowStyle}>Campos por evento</span>
          <h2 style={sectionTitleStyle}>Opções habilitadas no evento</h2>
          <p style={sectionTextStyle}>
            Estes campos serão salvos na tabela de eventos e controlarão o que aparece
            no app do cliente e no convite público.
          </p>
        </div>

        <div style={togglePreviewStyle}>
          <PreviewToggle label="Presentes físicos" />
          <PreviewToggle label="Experiências" />
          <PreviewToggle label="Presentes em valor" />
        </div>
      </section>
    </div>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <article style={cardStyle}>
      <h3 style={cardTitleStyle}>{title}</h3>
      <p style={cardTextStyle}>{text}</p>
    </article>
  );
}

function FlowItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article style={flowItemStyle}>
      <div style={flowNumberStyle}>{number}</div>
      <div>
        <h3 style={flowTitleStyle}>{title}</h3>
        <p style={flowTextStyle}>{text}</p>
      </div>
    </article>
  );
}

function PreviewToggle({ label }: { label: string }) {
  return (
    <div style={previewToggleStyle}>
      <span style={fakeCheckboxStyle}>✓</span>
      <strong>{label}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const heroStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 28,
  padding: 32,
  border: "1px solid #e2e8f0",
  boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 10px",
  fontSize: 42,
  fontWeight: 950,
  letterSpacing: "-0.055em",
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.6,
  maxWidth: 820,
};

const heroBadgeStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
  color: "#6d28d9",
  fontWeight: 950,
  fontSize: 13,
  border: "1px solid rgba(124,58,237,0.16)",
};

const cardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 24,
  padding: 24,
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 48px rgba(15,23,42,0.06)",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const cardTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.55,
};

const panelStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 26,
  padding: 28,
  border: "1px solid #e2e8f0",
  boxShadow: "0 20px 60px rgba(15,23,42,0.06)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "8px 0 8px",
  color: "#0f172a",
  fontSize: 28,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const sectionTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.6,
  maxWidth: 860,
};

const flowGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
  marginTop: 22,
};

const flowItemStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  padding: 18,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  background: "#fbfdff",
};

const flowNumberStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 13,
  background: "#ede9fe",
  color: "#6d28d9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  flex: "0 0 auto",
};

const flowTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 950,
};

const flowTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const togglePreviewStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginTop: 22,
};

const previewToggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 16,
  borderRadius: 18,
  background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(37,99,235,0.04))",
  border: "1px solid rgba(124,58,237,0.16)",
  color: "#0f172a",
};

const fakeCheckboxStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 8,
  background: "#7c3aed",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 950,
};
