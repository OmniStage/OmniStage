"use client";

import { useState } from "react";

// ============================================
// GiftCard Component (Inline for isolation)
// ============================================

type GiftCardProps = {
  id: string;
  fotoUrl?: string | null;
  nomeConvidado?: string | null;
  grupo?: string | null;
  etiquetaCodigo?: string | null;
  categoriaDetectada?: string | null;
  marcaDetectada?: string | null;
  iaProcessado?: boolean | null;
  notaFiscalUrl?: string | null;
  valorPresenteado?: number | null;
  status?: string | null;
  criadoEm?: string | null;
  onAlterar?: () => void;
  onIncluirNF?: () => void;
  onCancelar?: () => void;
  onVerDetalhes?: () => void;
  variant?: "fisico" | "lista" | "compacto";
};

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string | null | undefined) {
  if (!data) return "-";
  try {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return data;
  }
}

function getIAStatus(fotoUrl: string | null | undefined, iaProcessado: boolean | null | undefined) {
  if (!fotoUrl) {
    return { label: "Sem foto", className: "gift-card__ia-badge gift-card__ia-badge--empty" };
  }
  if (!iaProcessado) {
    return { label: "Processando IA", className: "gift-card__ia-badge gift-card__ia-badge--processing" };
  }
  return { label: "IA detectada", className: "gift-card__ia-badge gift-card__ia-badge--success" };
}

function getStatusBadge(status: string | null | undefined) {
  const normalizado = String(status || "ativo").trim().toLowerCase();
  if (normalizado === "cancelado") {
    return { label: "Cancelado", className: "gift-card__status-badge gift-card__status-badge--cancelado" };
  }
  if (["pago", "paid", "confirmado", "approved"].includes(normalizado)) {
    return { label: "Confirmado", className: "gift-card__status-badge gift-card__status-badge--confirmado" };
  }
  if (["pendente", "pending"].includes(normalizado)) {
    return { label: "Pendente", className: "gift-card__status-badge gift-card__status-badge--pendente" };
  }
  return { label: "Ativo", className: "gift-card__status-badge gift-card__status-badge--ativo" };
}

function GiftCard({
  fotoUrl,
  nomeConvidado,
  grupo,
  etiquetaCodigo,
  categoriaDetectada,
  marcaDetectada,
  iaProcessado,
  notaFiscalUrl,
  valorPresenteado,
  status,
  criadoEm,
  onAlterar,
  onIncluirNF,
  onCancelar,
  onVerDetalhes,
  variant = "fisico",
}: GiftCardProps) {
  const [imagemErro, setImagemErro] = useState(false);
  const iaStatus = getIAStatus(fotoUrl, iaProcessado);
  const statusBadge = getStatusBadge(status);
  const temAcoes = onAlterar || onIncluirNF || onCancelar || onVerDetalhes;

  return (
    <article className={`gift-card gift-card--${variant}`}>
      <div className="gift-card__photo-section">
        {fotoUrl && !imagemErro ? (
          <img
            src={fotoUrl}
            alt={`Presente de ${nomeConvidado || "convidado"}`}
            className="gift-card__photo"
            onError={() => setImagemErro(true)}
          />
        ) : (
          <div className="gift-card__photo-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13" />
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 4.5-4 2.5 2.5 0 0 1 0 5" />
            </svg>
            <span>Sem foto</span>
          </div>
        )}
        {variant === "fisico" && (
          <div className="gift-card__ia-badge-wrap">
            <span className={iaStatus.className}>{iaStatus.label}</span>
          </div>
        )}
        {notaFiscalUrl && (
          <div className="gift-card__nf-indicator" title="Nota fiscal anexada">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        )}
      </div>

      <div className="gift-card__body">
        <div className="gift-card__header">
          <div className="gift-card__info">
            <h3 className="gift-card__nome">{nomeConvidado || "Convidado"}</h3>
            <p className="gift-card__grupo">{grupo || "Sem grupo"}</p>
          </div>
          <div className="gift-card__badges">
            {etiquetaCodigo && <span className="gift-card__etiqueta">{etiquetaCodigo}</span>}
            <span className={statusBadge.className}>{statusBadge.label}</span>
          </div>
        </div>

        {variant === "fisico" && (
          <div className="gift-card__ai-grid">
            <div className="gift-card__ai-box">
              <span className="gift-card__ai-label">Categoria detectada</span>
              <strong className="gift-card__ai-value">{categoriaDetectada || "Aguardando IA"}</strong>
            </div>
            <div className="gift-card__ai-box">
              <span className="gift-card__ai-label">Marca detectada</span>
              <strong className="gift-card__ai-value">{marcaDetectada || "Aguardando IA"}</strong>
            </div>
          </div>
        )}

        {variant === "lista" && valorPresenteado != null && (
          <div className="gift-card__valor-section">
            <span className="gift-card__valor-label">Valor presenteado</span>
            <strong className="gift-card__valor">{formatarMoeda(valorPresenteado)}</strong>
          </div>
        )}

        {criadoEm && <p className="gift-card__data">Registrado em {formatarData(criadoEm)}</p>}

        {temAcoes && (
          <div className="gift-card__actions">
            {onVerDetalhes && (
              <button type="button" className="gift-card__action gift-card__action--primary" onClick={onVerDetalhes}>
                Ver detalhes
              </button>
            )}
            {onAlterar && (
              <button type="button" className="gift-card__action gift-card__action--secondary" onClick={onAlterar}>
                Alterar
              </button>
            )}
            {onIncluirNF && (
              <button type="button" className="gift-card__action gift-card__action--nf" onClick={onIncluirNF}>
                {notaFiscalUrl ? "Ver NF" : "Incluir NF"}
              </button>
            )}
            {onCancelar && (
              <button type="button" className="gift-card__action gift-card__action--danger" onClick={onCancelar}>
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================
// Mock Data
// ============================================

const mockPresentes = [
  {
    id: "1",
    fotoUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop",
    nomeConvidado: "Maria Silva",
    grupo: "Familia da Noiva",
    etiquetaCodigo: "A-001",
    categoriaDetectada: "Eletrodomestico",
    marcaDetectada: "Tramontina",
    iaProcessado: true,
    notaFiscalUrl: "https://example.com/nf.pdf",
    status: "ativo",
    criadoEm: "2024-03-15T14:30:00Z",
  },
  {
    id: "2",
    fotoUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=300&fit=crop",
    nomeConvidado: "Joao Santos",
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
    grupo: "Familia do Noivo",
    etiquetaCodigo: "A-055",
    categoriaDetectada: "Decoracao",
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

// ============================================
// Preview Page
// ============================================

export default function V0PreviewPage() {
  const handleAction = (action: string, id: string) => {
    alert(`Acao: ${action} - ID: ${id}`);
  };

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>GiftCard Preview - Isolated</title>
        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      </head>
      <body>
        <div className="v0-preview">
          <header className="v0-preview__header">
            <h1 className="v0-preview__title">GiftCard Component Preview</h1>
            <p className="v0-preview__subtitle">Visualizacao do componente com dados mock - Pagina isolada</p>
          </header>

          <main className="v0-preview__main">
            {/* Variante Fisico */}
            <section className="v0-preview__section">
              <div className="v0-preview__section-header">
                <h2 className="v0-preview__section-title">Variante: Fisico</h2>
                <code className="v0-preview__code">variant=&quot;fisico&quot;</code>
              </div>
              <p className="v0-preview__section-desc">
                Para presentes recebidos no evento com deteccao de IA e suporte a nota fiscal.
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
                Para lista de presentes com exibicao de valor presenteado.
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
                Demonstracao dos diferentes estados visuais do componente.
              </p>
              <div className="v0-preview__grid v0-preview__grid--4">
                <GiftCard
                  id="demo-1"
                  fotoUrl="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop"
                  nomeConvidado="Status Ativo"
                  grupo="Demonstracao"
                  status="ativo"
                  variant="fisico"
                  iaProcessado={true}
                  categoriaDetectada="Utensilios"
                  marcaDetectada="Tramontina"
                />
                <GiftCard
                  id="demo-2"
                  fotoUrl="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=300&fit=crop"
                  nomeConvidado="Status Confirmado"
                  grupo="Demonstracao"
                  status="confirmado"
                  variant="fisico"
                  iaProcessado={true}
                  categoriaDetectada="Decoracao"
                  marcaDetectada="Etna"
                />
                <GiftCard
                  id="demo-3"
                  fotoUrl="https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400&h=300&fit=crop"
                  nomeConvidado="Status Pendente"
                  grupo="Demonstracao"
                  status="pendente"
                  variant="fisico"
                  iaProcessado={false}
                />
                <GiftCard
                  id="demo-4"
                  nomeConvidado="Status Cancelado"
                  grupo="Demonstracao"
                  status="cancelado"
                  variant="fisico"
                />
              </div>
            </section>
          </main>

          <footer className="v0-preview__footer">
            <p>Pagina temporaria de preview - GiftCard Component (Isolated)</p>
          </footer>
        </div>
      </body>
    </html>
  );
}

// ============================================
// Styles (All inline for complete isolation)
// ============================================

const pageStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    min-height: 100vh;
  }

  .v0-preview {
    min-height: 100vh;
    padding: 40px 24px;
  }

  .v0-preview__header {
    max-width: 1400px;
    margin: 0 auto 48px;
    text-align: center;
  }

  .v0-preview__title {
    font-size: 36px;
    font-weight: 800;
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

  .v0-preview__grid--2 { grid-template-columns: repeat(2, 1fr); }
  .v0-preview__grid--3 { grid-template-columns: repeat(3, 1fr); }
  .v0-preview__grid--4 { grid-template-columns: repeat(4, 1fr); }

  .v0-preview__footer {
    max-width: 1400px;
    margin: 48px auto 0;
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 600;
  }

  /* GiftCard Styles */
  .gift-card {
    background: #fff;
    border: 1px solid rgba(226,232,240,.95);
    border-radius: 24px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 40px rgba(15,23,42,.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .gift-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 50px rgba(15,23,42,.1);
  }

  .gift-card--compacto {
    flex-direction: row;
    border-radius: 18px;
  }

  .gift-card--compacto .gift-card__photo-section {
    width: 120px;
    min-height: 120px;
    aspect-ratio: auto;
  }

  .gift-card--compacto .gift-card__body { padding: 16px; }

  .gift-card__photo-section {
    position: relative;
    aspect-ratio: 4 / 3;
    background: linear-gradient(135deg, #ede9fe, rgba(124,58,237,.08));
    overflow: hidden;
  }

  .gift-card__photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gift-card__photo-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #64748b;
  }

  .gift-card__photo-placeholder svg { opacity: 0.5; }
  .gift-card__photo-placeholder span { font-size: 13px; font-weight: 700; }

  .gift-card__ia-badge-wrap {
    position: absolute;
    top: 12px;
    left: 12px;
  }

  .gift-card__ia-badge {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    backdrop-filter: blur(8px);
  }

  .gift-card__ia-badge--empty { background: rgba(100, 116, 139, 0.85); color: #fff; }
  .gift-card__ia-badge--processing { background: rgba(245, 158, 11, 0.9); color: #fff; animation: pulse-ia 2s infinite; }
  .gift-card__ia-badge--success { background: rgba(22, 163, 74, 0.9); color: #fff; }

  @keyframes pulse-ia {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .gift-card__nf-indicator {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(22, 163, 74, 0.9);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
  }

  .gift-card__body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
  }

  .gift-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .gift-card__info { flex: 1; min-width: 0; }

  .gift-card__nome {
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gift-card__grupo {
    margin: 4px 0 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 600;
  }

  .gift-card__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .gift-card__etiqueta {
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 800;
    background: #ede9fe;
    color: #6d28d9;
    font-family: monospace;
  }

  .gift-card__status-badge {
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gift-card__status-badge--ativo { background: #dcfce7; color: #16a34a; }
  .gift-card__status-badge--confirmado { background: #dcfce7; color: #16a34a; }
  .gift-card__status-badge--pendente { background: #fef3c7; color: #f59e0b; }
  .gift-card__status-badge--cancelado { background: #fee2e2; color: #dc2626; }

  .gift-card__ai-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .gift-card__ai-box {
    padding: 12px;
    border-radius: 14px;
    background: #f8fafc;
    border: 1px solid rgba(226,232,240,.95);
  }

  .gift-card__ai-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gift-card__ai-value {
    display: block;
    margin-top: 4px;
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    text-transform: capitalize;
  }

  .gift-card__valor-section {
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(135deg, #dcfce7, rgba(22,163,74,.08));
    text-align: center;
  }

  .gift-card__valor-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gift-card__valor {
    display: block;
    margin-top: 4px;
    font-size: 24px;
    font-weight: 900;
    color: #16a34a;
    letter-spacing: -0.02em;
  }

  .gift-card__data {
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
  }

  .gift-card__actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: auto;
  }

  .gift-card__action {
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    border: 1px solid rgba(226,232,240,.95);
    background: #fff;
    color: #0f172a;
    transition: all 0.15s ease;
  }

  .gift-card__action:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15,23,42,.08);
  }

  .gift-card__action--primary {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #6d28d9, #5b21b6);
    color: #fff;
    border: none;
    box-shadow: 0 8px 20px rgba(109,40,217,.25);
  }

  .gift-card__action--primary:hover { box-shadow: 0 12px 28px rgba(109,40,217,.35); }
  .gift-card__action--secondary { background: #ede9fe; color: #6d28d9; border-color: transparent; }
  .gift-card__action--nf { background: #fef3c7; color: #92400e; border-color: transparent; }
  .gift-card__action--danger { background: #fee2e2; color: #dc2626; border-color: transparent; }

  @media (max-width: 1200px) {
    .v0-preview__grid--4 { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 900px) {
    .v0-preview__grid--3 { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 640px) {
    .v0-preview { padding: 24px 16px; }
    .v0-preview__section { padding: 20px; }
    .v0-preview__grid--2,
    .v0-preview__grid--3,
    .v0-preview__grid--4 { grid-template-columns: 1fr; }
    .v0-preview__section-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .gift-card__ai-grid { grid-template-columns: 1fr; }
    .gift-card__actions { grid-template-columns: 1fr; }
    .gift-card__action--primary { grid-column: auto; }
    .gift-card--compacto { flex-direction: column; }
    .gift-card--compacto .gift-card__photo-section { width: 100%; aspect-ratio: 4 / 3; }
  }
`;
