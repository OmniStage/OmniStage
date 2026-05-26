"use client";

import { GiftCard } from "@/components/GiftCard";

const mockPresentes = [
  {
    id: "1",
    fotoUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop",
    nomeConvidado: "Maria Silva",
    grupo: "Familia da Noiva",
    etiquetaCodigo: "A-001",
    categoriaDetectada: "Eletrodoméstico",
    marcaDetectada: "Tramontina",
    iaProcessado: true,
    notaFiscalUrl: "https://example.com/nf.pdf",
    status: "ativo",
    criadoEm: "2024-03-15T14:30:00Z",
  },
  {
    id: "2",
    fotoUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=300&fit=crop",
    nomeConvidado: "João Santos",
    grupo: "Amigos do Noivo",
    etiquetaCodigo: "B-042",
    categoriaDetectada: null,
    marcaDetectada: null,
    iaProcessado: false,
    status: "pendente",
    criadoEm: "2024-03-14T10:15:00Z",
  },
  {
    id: "3",
    fotoUrl: null,
    nomeConvidado: "Ana Costa",
    grupo: "Colegas de Trabalho",
    etiquetaCodigo: "C-103",
    categoriaDetectada: null,
    marcaDetectada: null,
    iaProcessado: null,
    status: "ativo",
    criadoEm: "2024-03-13T16:45:00Z",
  },
  {
    id: "4",
    fotoUrl: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400&h=300&fit=crop",
    nomeConvidado: "Pedro Oliveira",
    grupo: "Família do Noivo",
    etiquetaCodigo: "A-055",
    categoriaDetectada: "Decoração",
    marcaDetectada: "Tok&Stok",
    iaProcessado: true,
    status: "cancelado",
    criadoEm: "2024-03-12T09:00:00Z",
  },
];

const mockListaPresentes = [
  {
    id: "5",
    fotoUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    nomeConvidado: "Carlos Mendes",
    grupo: "Padrinhos",
    valorPresenteado: 350.0,
    status: "confirmado",
    criadoEm: "2024-03-10T11:20:00Z",
  },
  {
    id: "6",
    fotoUrl: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop",
    nomeConvidado: "Lucia Ferreira",
    grupo: "Tios",
    valorPresenteado: 500.0,
    status: "pendente",
    criadoEm: "2024-03-09T08:30:00Z",
  },
];

export default function V0PreviewPage() {
  const handleAction = (action: string, id: string) => {
    alert(`Ação: ${action} - ID: ${id}`);
  };

  return (
    <div className="v0-preview">
      <style>{styles}</style>

      <header className="v0-preview__header">
        <h1 className="v0-preview__title">GiftCard Component Preview</h1>
        <p className="v0-preview__subtitle">
          Visualização do componente com dados mock em todas as variantes
        </p>
      </header>

      <main className="v0-preview__main">
        {/* Variante Físico */}
        <section className="v0-preview__section">
          <div className="v0-preview__section-header">
            <h2 className="v0-preview__section-title">Variante: Físico</h2>
            <code className="v0-preview__code">variant=&quot;fisico&quot;</code>
          </div>
          <p className="v0-preview__section-desc">
            Para presentes recebidos no evento com detecção de IA e suporte a nota fiscal.
          </p>

          <div className="v0-preview__grid v0-preview__grid--3">
            {mockPresentes.map((presente) => (
              <GiftCard
                key={presente.id}
                {...presente}
                variant="fisico"
                onVerDetalhes={() => handleAction("Ver Detalhes", presente.id)}
                onAlterar={() => handleAction("Alterar", presente.id)}
                onIncluirNF={() => handleAction("Incluir NF", presente.id)}
                onCancelar={() => handleAction("Cancelar", presente.id)}
              />
            ))}
          </div>
        </section>

        {/* Variante Lista */}
        <section className="v0-preview__section">
          <div className="v0-preview__section-header">
            <h2 className="v0-preview__section-title">Variante: Lista</h2>
            <code className="v0-preview__code">variant=&quot;lista&quot;</code>
          </div>
          <p className="v0-preview__section-desc">
            Para lista de presentes com exibição de valor presenteado.
          </p>

          <div className="v0-preview__grid v0-preview__grid--3">
            {mockListaPresentes.map((presente) => (
              <GiftCard
                key={presente.id}
                {...presente}
                variant="lista"
                onVerDetalhes={() => handleAction("Ver Detalhes", presente.id)}
              />
            ))}
          </div>
        </section>

        {/* Variante Compacto */}
        <section className="v0-preview__section">
          <div className="v0-preview__section-header">
            <h2 className="v0-preview__section-title">Variante: Compacto</h2>
            <code className="v0-preview__code">variant=&quot;compacto&quot;</code>
          </div>
          <p className="v0-preview__section-desc">
            Layout horizontal para listagens densas ou sidebars.
          </p>

          <div className="v0-preview__grid v0-preview__grid--2">
            {mockPresentes.slice(0, 2).map((presente) => (
              <GiftCard
                key={presente.id}
                {...presente}
                variant="compacto"
                onVerDetalhes={() => handleAction("Ver Detalhes", presente.id)}
              />
            ))}
          </div>
        </section>

        {/* Estados */}
        <section className="v0-preview__section">
          <div className="v0-preview__section-header">
            <h2 className="v0-preview__section-title">Estados de Status</h2>
          </div>
          <p className="v0-preview__section-desc">
            Demonstração dos diferentes estados visuais do componente.
          </p>

          <div className="v0-preview__grid v0-preview__grid--4">
            <GiftCard
              id="demo-1"
              fotoUrl="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop"
              nomeConvidado="Status Ativo"
              grupo="Demonstração"
              status="ativo"
              variant="fisico"
              iaProcessado={true}
              categoriaDetectada="Utensílios"
              marcaDetectada="Tramontina"
            />
            <GiftCard
              id="demo-2"
              fotoUrl="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=300&fit=crop"
              nomeConvidado="Status Confirmado"
              grupo="Demonstração"
              status="confirmado"
              variant="fisico"
              iaProcessado={true}
              categoriaDetectada="Decoração"
              marcaDetectada="Etna"
            />
            <GiftCard
              id="demo-3"
              fotoUrl="https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400&h=300&fit=crop"
              nomeConvidado="Status Pendente"
              grupo="Demonstração"
              status="pendente"
              variant="fisico"
              iaProcessado={false}
            />
            <GiftCard
              id="demo-4"
              nomeConvidado="Status Cancelado"
              grupo="Demonstração"
              status="cancelado"
              variant="fisico"
            />
          </div>
        </section>
      </main>

      <footer className="v0-preview__footer">
        <p>Página temporária de preview - GiftCard Component</p>
      </footer>
    </div>
  );
}

const styles = `
  .v0-preview {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 40px 24px;
  }

  .v0-preview__header {
    max-width: 1400px;
    margin: 0 auto 48px;
    text-align: center;
  }

  .v0-preview__title {
    margin: 0;
    font-size: 36px;
    font-weight: 950;
    color: #0f172a;
    letter-spacing: -0.03em;
  }

  .v0-preview__subtitle {
    margin: 12px 0 0;
    font-size: 16px;
    color: #64748b;
    font-weight: 500;
  }

  .v0-preview__main {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  .v0-preview__section {
    background: #fff;
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 4px 24px rgba(15,23,42,.04);
    border: 1px solid rgba(226,232,240,.8);
  }

  .v0-preview__section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
  }

  .v0-preview__section-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }

  .v0-preview__code {
    padding: 6px 12px;
    background: #ede9fe;
    color: #6d28d9;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    font-family: monospace;
  }

  .v0-preview__section-desc {
    margin: 0 0 24px;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
  }

  .v0-preview__grid {
    display: grid;
    gap: 24px;
  }

  .v0-preview__grid--2 {
    grid-template-columns: repeat(2, 1fr);
  }

  .v0-preview__grid--3 {
    grid-template-columns: repeat(3, 1fr);
  }

  .v0-preview__grid--4 {
    grid-template-columns: repeat(4, 1fr);
  }

  .v0-preview__footer {
    max-width: 1400px;
    margin: 48px auto 0;
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 600;
  }

  @media (max-width: 1200px) {
    .v0-preview__grid--4 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 900px) {
    .v0-preview__grid--3 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .v0-preview {
      padding: 24px 16px;
    }

    .v0-preview__section {
      padding: 20px;
    }

    .v0-preview__grid--2,
    .v0-preview__grid--3,
    .v0-preview__grid--4 {
      grid-template-columns: 1fr;
    }

    .v0-preview__section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
`;
