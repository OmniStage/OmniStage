"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  nome: string | null;
  tenant_id: string | null;
};

type GiftItem = {
  id: string;
  nome: string | null;
  tipo: string | null;
  valor_sugerido: number | null;
  imagem_url: string | null;
};

type GiftReservation = {
  id: string;
  gift_item_id: string;
  evento_id: string;
  tenant_id: string;
  nome_presenteador: string;
  telefone_presenteador: string | null;
  mensagem: string | null;
  valor_presenteado: number | null;
  status: string | null;
  created_at: string | null;
  gift_items: GiftItem | GiftItem[] | null;
};

function formatarMoeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "R$ 0,00";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  try {
    return new Date(data).toLocaleString("pt-BR", {
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

function labelTipo(tipo: string | null | undefined) {
  if (tipo === "presente") return "Presente físico";
  if (tipo === "experiencia") return "Experiência";
  if (tipo === "presente_valor" || tipo === "cota_pix") return "Presente em valor";
  return "Presente";
}

function labelStatus(status: string | null | undefined) {
  if (status === "presenteado") return "Presenteado";
  if (status === "confirmado") return "Confirmado";
  if (status === "recebido") return "Recebido";
  if (status === "cancelado") return "Cancelado";
  return "Registrado";
}

function limparTelefone(telefone: string | null | undefined) {
  return String(telefone || "").replace(/\D/g, "");
}

function getGiftItem(reserva: GiftReservation) {
  const item = reserva.gift_items;

  if (Array.isArray(item)) return item[0] || null;

  return item || null;
}

export default function PresentesRecebidosPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.eventId || "");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [evento, setEvento] = useState<Evento | null>(null);
  const [reservas, setReservas] = useState<GiftReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  useEffect(() => {
    if (eventId) carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function carregarTudo() {
    setLoading(true);

    const { data: eventoData, error: eventoError } = await supabase
      .from("eventos")
      .select("id, nome, tenant_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventoError) {
      alert("Erro ao carregar evento: " + eventoError.message);
      setLoading(false);
      return;
    }

    setEvento((eventoData || null) as Evento | null);

    const { data: reservasData, error: reservasError } = await supabase
      .from("gift_reservations")
      .select(`
        id,
        gift_item_id,
        evento_id,
        tenant_id,
        nome_presenteador,
        telefone_presenteador,
        mensagem,
        valor_presenteado,
        status,
        created_at,
        gift_items (
          id,
          nome,
          tipo,
          valor_sugerido,
          imagem_url
        )
      `)
      .eq("evento_id", eventId)
      .order("created_at", { ascending: false });

    if (reservasError) {
      alert("Erro ao carregar presentes recebidos: " + reservasError.message);
      setLoading(false);
      return;
    }

    setReservas((reservasData || []) as GiftReservation[]);
    setLoading(false);
  }

  async function atualizarStatus(reserva: GiftReservation, novoStatus: string) {
    const { error } = await supabase
      .from("gift_reservations")
      .update({ status: novoStatus })
      .eq("id", reserva.id);

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    setReservas((old) =>
      old.map((item) =>
        item.id === reserva.id ? { ...item, status: novoStatus } : item
      )
    );
  }

  const reservasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return reservas.filter((reserva) => {
      const item = getGiftItem(reserva);

      const passouStatus =
        statusFiltro === "todos" || String(reserva.status || "registrado") === statusFiltro;

      if (!passouStatus) return false;

      if (!termo) return true;

      return [
        reserva.nome_presenteador,
        reserva.telefone_presenteador,
        reserva.mensagem,
        reserva.status,
        item?.nome,
        item?.tipo,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [busca, reservas, statusFiltro]);

  const resumo = useMemo(() => {
    const totalValor = reservas.reduce(
      (soma, reserva) => soma + Number(reserva.valor_presenteado || 0),
      0
    );

    const totalConfirmados = reservas.filter(
      (reserva) =>
        reserva.status === "presenteado" ||
        reserva.status === "confirmado" ||
        reserva.status === "recebido"
    ).length;

    const totalRecebidos = reservas.filter((reserva) => reserva.status === "recebido").length;

    const pessoasUnicas = new Set(
      reservas.map((reserva) => reserva.nome_presenteador.trim().toLowerCase()).filter(Boolean)
    ).size;

    return {
      total: reservas.length,
      totalValor,
      totalConfirmados,
      totalRecebidos,
      pessoasUnicas,
    };
  }, [reservas]);

  if (loading) {
    return <div style={loadingStyle}>Carregando presentes recebidos...</div>;
  }

  return (
    <div className="received-page">
      <style>{`
        .received-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .hero,
        .metric,
        .panel,
        .gift-row {
          background: #fff;
          border: 1px solid rgba(226,232,240,.95);
          box-shadow: 0 24px 70px rgba(15,23,42,.08);
        }

        .hero {
          border-radius: 30px;
          padding: 32px;
          background:
            radial-gradient(circle at 5% 0%, rgba(124,58,237,.12), transparent 34%),
            radial-gradient(circle at 95% 0%, rgba(16,185,129,.10), transparent 30%),
            #fff;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .eyebrow {
          display: inline-block;
          color: #7c3aed;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .14em;
          margin-bottom: 10px;
        }

        .title {
          margin: 0;
          color: #0f172a;
          font-size: 44px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -.06em;
        }

        .subtitle {
          margin: 13px 0 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.6;
          max-width: 760px;
          font-weight: 750;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .primary,
        .secondary,
        .success,
        .danger {
          border: none;
          border-radius: 16px;
          font-weight: 950;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 16px;
          transition: transform .16s ease;
          font-family: inherit;
          font-size: 14px;
        }

        .primary:hover,
        .secondary:hover,
        .success:hover,
        .danger:hover {
          transform: translateY(-1px);
        }

        .primary {
          color: #fff;
          background: linear-gradient(135deg,#7c3aed,#5b21b6);
          box-shadow: 0 18px 38px rgba(124,58,237,.22);
        }

        .secondary {
          background: #fff;
          color: #0f172a;
          border: 1px solid rgba(203,213,225,.95);
        }

        .success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid rgba(22,101,52,.12);
        }

        .danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }

        .metric {
          border-radius: 22px;
          padding: 18px;
        }

        .metric-label {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .metric-value {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 30px;
          font-weight: 950;
        }

        .panel {
          border-radius: 26px;
          padding: 22px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
        }

        .input,
        .select {
          width: 100%;
          padding: 15px 16px;
          border-radius: 17px;
          border: 1px solid rgba(203,213,225,.95);
          background: #fff;
          color: #0f172a;
          outline: none;
          font-size: 14px;
          font-weight: 800;
        }

        .input:focus,
        .select:focus {
          border-color: rgba(124,58,237,.45);
          box-shadow: 0 0 0 4px rgba(124,58,237,.10);
        }

        .received-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gift-row {
          border-radius: 24px;
          padding: 16px;
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 16px;
        }

        .gift-img {
          width: 112px;
          height: 112px;
          border-radius: 20px;
          border: 1px solid rgba(226,232,240,.95);
          object-fit: cover;
          background: linear-gradient(135deg,#f1f5f9,#fff);
        }

        .gift-placeholder {
          width: 112px;
          height: 112px;
          border-radius: 20px;
          border: 1px solid rgba(226,232,240,.95);
          background: linear-gradient(135deg,#f1f5f9,#fff);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-weight: 950;
          text-align: center;
          padding: 10px;
        }

        .row-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .gift-title {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -.035em;
        }

        .presenter {
          margin-top: 6px;
          color: #334155;
          font-weight: 900;
          line-height: 1.5;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .badge {
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .badge-purple { background: #ede9fe; color: #6d28d9; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-gray { background: #f1f5f9; color: #475569; }

        .message {
          margin-top: 12px;
          color: #64748b;
          line-height: 1.55;
          font-weight: 750;
          background: #f8fafc;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 18px;
          padding: 12px 14px;
        }

        .row-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .empty {
          background: #fff;
          border: 1px dashed rgba(148,163,184,.45);
          border-radius: 26px;
          padding: 40px;
          color: #64748b;
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 900px) {
          .hero {
            padding: 24px;
            border-radius: 24px;
          }

          .title {
            font-size: 34px;
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .gift-row {
            grid-template-columns: 1fr;
          }

          .gift-img,
          .gift-placeholder {
            width: 100%;
            height: 190px;
          }

          .actions a,
          .actions button,
          .row-actions a,
          .row-actions button {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">Lista de Presentes</span>
          <h1 className="title">Presentes recebidos</h1>
          <p className="subtitle">
            Acompanhe quem presenteou, qual item foi escolhido, valor, mensagem e status
            do evento <strong>{evento?.nome || "sem nome"}</strong>.
          </p>
        </div>

        <div className="actions">
          <button
            className="secondary"
            onClick={() => router.push(`/app/eventos/${eventId}/lista-presentes`)}
          >
            Voltar para lista
          </button>

          <button className="secondary" onClick={carregarTudo}>
            Atualizar
          </button>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Presentes registrados" value={resumo.total} />
        <Metric label="Pessoas que presentearam" value={resumo.pessoasUnicas} />
        <Metric label="Presentes confirmados" value={resumo.totalConfirmados} />
        <Metric label="Marcados como recebidos" value={resumo.totalRecebidos} />
        <Metric label="Valor informado" value={formatarMoeda(resumo.totalValor)} />
      </section>

      <section className="panel">
        <div className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por presente, nome, telefone, mensagem ou status"
          />

          <select
            className="select"
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value)}
          >
            <option value="todos">Todos os status</option>
            <option value="presenteado">Presenteado</option>
            <option value="confirmado">Confirmado</option>
            <option value="recebido">Recebido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </section>

      {reservasFiltradas.length === 0 ? (
        <div className="empty">
          Nenhum presente recebido encontrado.
        </div>
      ) : (
        <section className="received-list">
          {reservasFiltradas.map((reserva) => {
            const item = getGiftItem(reserva);
            const telefoneLimpo = limparTelefone(reserva.telefone_presenteador);
            const whatsappUrl = telefoneLimpo
              ? `https://wa.me/${telefoneLimpo}`
              : "";

            return (
              <article key={reserva.id} className="gift-row">
                {item?.imagem_url ? (
                  <img
                    className="gift-img"
                    src={item.imagem_url}
                    alt={item.nome || "Presente"}
                  />
                ) : (
                  <div className="gift-placeholder">
                    {labelTipo(item?.tipo)}
                  </div>
                )}

                <div>
                  <div className="row-head">
                    <div>
                      <h2 className="gift-title">
                        {item?.nome || "Presente não identificado"}
                      </h2>

                      <div className="presenter">
                        Presenteado por: {reserva.nome_presenteador}
                      </div>
                    </div>

                    <span className="badge badge-green">
                      {labelStatus(reserva.status)}
                    </span>
                  </div>

                  <div className="meta">
                    <span className="badge badge-purple">{labelTipo(item?.tipo)}</span>
                    <span className="badge badge-yellow">
                      {formatarMoeda(reserva.valor_presenteado)}
                    </span>
                    <span className="badge badge-gray">
                      {formatarData(reserva.created_at)}
                    </span>

                    {reserva.telefone_presenteador && (
                      <span className="badge badge-gray">
                        {reserva.telefone_presenteador}
                      </span>
                    )}
                  </div>

                  {reserva.mensagem && (
                    <div className="message">
                      “{reserva.mensagem}”
                    </div>
                  )}

                  <div className="row-actions">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary"
                      >
                        Chamar no WhatsApp
                      </a>
                    )}

                    <button
                      className="success"
                      onClick={() => atualizarStatus(reserva, "recebido")}
                    >
                      Marcar como recebido
                    </button>

                    <button
                      className="secondary"
                      onClick={() => atualizarStatus(reserva, "confirmado")}
                    >
                      Confirmar
                    </button>

                    <button
                      className="danger"
                      onClick={() => atualizarStatus(reserva, "cancelado")}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric">
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
    </article>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f172a",
  fontWeight: 900,
};
