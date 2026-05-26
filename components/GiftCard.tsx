"use client";

import { useState } from "react";

export type GiftCardProps = {
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
    return {
      label: "Sem foto",
      className: "gift-card__ia-badge gift-card__ia-badge--empty",
    };
  }

  if (!iaProcessado) {
    return {
      label: "Processando IA",
      className: "gift-card__ia-badge gift-card__ia-badge--processing",
    };
  }

  return {
    label: "IA detectada",
    className: "gift-card__ia-badge gift-card__ia-badge--success",
  };
}

function getStatusBadge(status: string | null | undefined) {
  const normalizado = String(status || "ativo")
    .trim()
    .toLowerCase();

  if (normalizado === "cancelado") {
    return {
      label: "Cancelado",
      className: "gift-card__status-badge gift-card__status-badge--cancelado",
    };
  }

  if (["pago", "paid", "confirmado", "approved"].includes(normalizado)) {
    return {
      label: "Confirmado",
      className: "gift-card__status-badge gift-card__status-badge--confirmado",
    };
  }

  if (["pendente", "pending"].includes(normalizado)) {
    return {
      label: "Pendente",
      className: "gift-card__status-badge gift-card__status-badge--pendente",
    };
  }

  return {
    label: "Ativo",
    className: "gift-card__status-badge gift-card__status-badge--ativo",
  };
}

export function GiftCard({
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
      <style>{styles}</style>

      {/* Seção de Foto */}
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
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        )}
      </div>

      {/* Corpo do Card */}
      <div className="gift-card__body">
        {/* Cabeçalho */}
        <div className="gift-card__header">
          <div className="gift-card__info">
            <h3 className="gift-card__nome">{nomeConvidado || "Convidado"}</h3>
            <p className="gift-card__grupo">{grupo || "Sem grupo"}</p>
          </div>

          <div className="gift-card__badges">
            {etiquetaCodigo && (
              <span className="gift-card__etiqueta">{etiquetaCodigo}</span>
            )}
            <span className={statusBadge.className}>{statusBadge.label}</span>
          </div>
        </div>

        {/* Informações de IA (apenas para presentes físicos) */}
        {variant === "fisico" && (
          <div className="gift-card__ai-grid">
            <div className="gift-card__ai-box">
              <span className="gift-card__ai-label">Categoria detectada</span>
              <strong className="gift-card__ai-value">
                {categoriaDetectada || "Aguardando IA"}
              </strong>
            </div>

            <div className="gift-card__ai-box">
              <span className="gift-card__ai-label">Marca detectada</span>
              <strong className="gift-card__ai-value">
                {marcaDetectada || "Aguardando IA"}
              </strong>
            </div>
          </div>
        )}

        {/* Informações de Valor (apenas para lista de presentes) */}
        {variant === "lista" && valorPresenteado != null && (
          <div className="gift-card__valor-section">
            <span className="gift-card__valor-label">Valor presenteado</span>
            <strong className="gift-card__valor">{formatarMoeda(valorPresenteado)}</strong>
          </div>
        )}

        {/* Data de criação */}
        {criadoEm && (
          <p className="gift-card__data">Registrado em {formatarData(criadoEm)}</p>
        )}

        {/* Ações */}
        {temAcoes && (
          <div className="gift-card__actions">
            {onVerDetalhes && (
              <button
                type="button"
                className="gift-card__action gift-card__action--primary"
                onClick={onVerDetalhes}
              >
                Ver detalhes
              </button>
            )}

            {onAlterar && (
              <button
                type="button"
                className="gift-card__action gift-card__action--secondary"
                onClick={onAlterar}
              >
                Alterar
              </button>
            )}

            {onIncluirNF && (
              <button
                type="button"
                className="gift-card__action gift-card__action--nf"
                onClick={onIncluirNF}
              >
                {notaFiscalUrl ? "Ver NF" : "Incluir NF"}
              </button>
            )}

            {onCancelar && (
              <button
                type="button"
                className="gift-card__action gift-card__action--danger"
                onClick={onCancelar}
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

const styles = `
  .gift-card {
    background: var(--card, #fff);
    border: 1px solid var(--line, rgba(226,232,240,.95));
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

  /* Variante compacta */
  .gift-card--compacto {
    flex-direction: row;
    border-radius: 18px;
  }

  .gift-card--compacto .gift-card__photo-section {
    width: 120px;
    min-height: 120px;
    aspect-ratio: auto;
  }

  .gift-card--compacto .gift-card__body {
    padding: 16px;
  }

  /* Seção de Foto */
  .gift-card__photo-section {
    position: relative;
    aspect-ratio: 4 / 3;
    background: linear-gradient(135deg, var(--primary-soft, #ede9fe), rgba(124,58,237,.08));
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
    color: var(--muted, #64748b);
  }

  .gift-card__photo-placeholder svg {
    opacity: 0.5;
  }

  .gift-card__photo-placeholder span {
    font-size: 13px;
    font-weight: 700;
  }

  /* Badges na foto */
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

  .gift-card__ia-badge--empty {
    background: rgba(100, 116, 139, 0.85);
    color: #fff;
  }

  .gift-card__ia-badge--processing {
    background: rgba(245, 158, 11, 0.9);
    color: #fff;
    animation: pulse-ia 2s infinite;
  }

  .gift-card__ia-badge--success {
    background: rgba(22, 163, 74, 0.9);
    color: #fff;
  }

  @keyframes pulse-ia {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Indicador de NF */
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

  /* Corpo */
  .gift-card__body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
  }

  /* Cabeçalho */
  .gift-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .gift-card__info {
    flex: 1;
    min-width: 0;
  }

  .gift-card__nome {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: var(--text, #0f172a);
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gift-card__grupo {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--muted, #64748b);
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
    background: var(--primary-soft, #ede9fe);
    color: var(--primary, #6d28d9);
    font-family: monospace;
  }

  /* Status badges */
  .gift-card__status-badge {
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gift-card__status-badge--ativo {
    background: var(--green-soft, #dcfce7);
    color: var(--green, #16a34a);
  }

  .gift-card__status-badge--confirmado {
    background: var(--green-soft, #dcfce7);
    color: var(--green, #16a34a);
  }

  .gift-card__status-badge--pendente {
    background: var(--yellow-soft, #fef3c7);
    color: var(--yellow, #f59e0b);
  }

  .gift-card__status-badge--cancelado {
    background: var(--red-soft, #fee2e2);
    color: var(--red, #dc2626);
  }

  /* Grid de IA */
  .gift-card__ai-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .gift-card__ai-box {
    padding: 12px;
    border-radius: 14px;
    background: var(--bg, #f8fafc);
    border: 1px solid var(--line, rgba(226,232,240,.95));
  }

  .gift-card__ai-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gift-card__ai-value {
    display: block;
    margin-top: 4px;
    font-size: 14px;
    font-weight: 800;
    color: var(--text, #0f172a);
    text-transform: capitalize;
  }

  /* Seção de valor */
  .gift-card__valor-section {
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--green-soft, #dcfce7), rgba(22,163,74,.08));
    text-align: center;
  }

  .gift-card__valor-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gift-card__valor {
    display: block;
    margin-top: 4px;
    font-size: 24px;
    font-weight: 950;
    color: var(--green, #16a34a);
    letter-spacing: -0.02em;
  }

  /* Data */
  .gift-card__data {
    margin: 0;
    font-size: 12px;
    color: var(--muted, #64748b);
    font-weight: 600;
  }

  /* Ações */
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
    border: 1px solid var(--line, rgba(226,232,240,.95));
    background: var(--card, #fff);
    color: var(--text, #0f172a);
    transition: all 0.15s ease;
  }

  .gift-card__action:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15,23,42,.08);
  }

  .gift-card__action--primary {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, var(--primary, #6d28d9), var(--primary-strong, #5b21b6));
    color: #fff;
    border: none;
    box-shadow: 0 8px 20px rgba(109,40,217,.25);
  }

  .gift-card__action--primary:hover {
    box-shadow: 0 12px 28px rgba(109,40,217,.35);
  }

  .gift-card__action--secondary {
    background: var(--primary-soft, #ede9fe);
    color: var(--primary, #6d28d9);
    border-color: transparent;
  }

  .gift-card__action--nf {
    background: var(--yellow-soft, #fef3c7);
    color: #92400e;
    border-color: transparent;
  }

  .gift-card__action--danger {
    background: var(--red-soft, #fee2e2);
    color: var(--red, #dc2626);
    border-color: transparent;
  }

  /* Responsivo */
  @media (max-width: 480px) {
    .gift-card__ai-grid {
      grid-template-columns: 1fr;
    }

    .gift-card__actions {
      grid-template-columns: 1fr;
    }

    .gift-card__action--primary {
      grid-column: auto;
    }

    .gift-card--compacto {
      flex-direction: column;
    }

    .gift-card--compacto .gift-card__photo-section {
      width: 100%;
      aspect-ratio: 4 / 3;
    }
  }
`;

export default GiftCard;
