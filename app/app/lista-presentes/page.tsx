"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type TenantMember = {
  tenant_id: string;
};

type Evento = {
  id: string;
  nome: string | null;
  data_evento: string | null;
  cidade: string | null;
  categoria_evento: string | null;
  status_aprovacao: string | null;
  lista_presentes_ativa: boolean | null;
  presentes_fisicos_enabled: boolean | null;
  experiencias_enabled: boolean | null;
  presentes_valor_enabled: boolean | null;
  created_at: string | null;
};

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  const [ano, mes, dia] = data.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano.slice(2)}`;

  return data;
}

function labelStatus(status: string | null) {
  if (status === "aprovado") return "Aprovado";
  if (status === "bloqueado") return "Bloqueado";
  if (status === "reprovado") return "Reprovado";
  if (status === "aguardando_aprovacao") return "Aguardando aprovação";
  return "Rascunho";
}

export default function ListaPresentesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarEventos() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data: membros, error: membroError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id);

    if (membroError) {
      alert("Erro ao carregar vínculo do tenant: " + membroError.message);
      setLoading(false);
      return;
    }

    const tenantIds = ((membros || []) as TenantMember[])
      .map((membro) => membro.tenant_id)
      .filter(Boolean);

    if (tenantIds.length === 0) {
      setEventos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        cidade,
        categoria_evento,
        status_aprovacao,
        lista_presentes_ativa,
        presentes_fisicos_enabled,
        experiencias_enabled,
        presentes_valor_enabled,
        created_at
      `)
      .in("tenant_id", tenantIds)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      setLoading(false);
      return;
    }

    setEventos((data || []) as Evento[]);
    setLoading(false);
  }

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return eventos;

    return eventos.filter((evento) =>
      [
        evento.nome,
        evento.cidade,
        evento.categoria_evento,
        evento.status_aprovacao,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }, [busca, eventos]);

  return (
    <div className="gift-events-page">
      <style>{`
        .gift-events-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .hero {
          background:
            radial-gradient(circle at top left, rgba(124,58,237,.10), transparent 34%),
            radial-gradient(circle at top right, rgba(16,185,129,.08), transparent 28%),
            #ffffff;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 30px;
          padding: 34px;
          box-shadow: 0 28px 80px rgba(15,23,42,.07);
        }

        .eyebrow {
          display: inline-block;
          color: #7c3aed;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .12em;
          margin-bottom: 12px;
        }

        .title {
          margin: 0;
          color: #0f172a;
          font-size: 44px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -.05em;
        }

        .subtitle {
          margin-top: 14px;
          color: #64748b;
          font-size: 17px;
          line-height: 1.65;
          max-width: 860px;
        }

        .search-box {
          background: #fff;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 24px;
          padding: 16px 20px;
          box-shadow: 0 14px 40px rgba(15,23,42,.05);
        }

        .search-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #0f172a;
          font-size: 18px;
          font-weight: 850;
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(340px,1fr));
          gap: 18px;
        }

        .event-card {
          background: #fff;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(15,23,42,.06);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .event-name {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -.04em;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .badge {
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .purple {
          background: #ede9fe;
          color: #6d28d9;
        }

        .green {
          background: #dcfce7;
          color: #166534;
        }

        .yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .neutral {
          background: #e2e8f0;
          color: #475569;
        }

        .info {
          color: #475569;
          line-height: 1.7;
          font-weight: 750;
        }

        .modules {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .module-pill {
          border-radius: 999px;
          padding: 9px 12px;
          background: #f8fafc;
          border: 1px solid rgba(226,232,240,.95);
          color: #334155;
          font-size: 12px;
          font-weight: 900;
        }

        .actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
          flex-wrap: wrap;
        }

        .primary,
        .secondary {
          text-decoration: none;
          border-radius: 16px;
          font-weight: 900;
          transition: transform .16s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .primary:hover,
        .secondary:hover {
          transform: translateY(-1px);
        }

        .primary {
          background: linear-gradient(135deg,#7c3aed,#5b21b6);
          color: #fff;
          padding: 14px 18px;
          box-shadow: 0 18px 38px rgba(124,58,237,.24);
        }

        .secondary {
          background: #fff;
          color: #0f172a;
          border: 1px solid rgba(226,232,240,.95);
          padding: 13px 16px;
        }

        .empty {
          background: #fff;
          border: 1px dashed rgba(148,163,184,.45);
          border-radius: 28px;
          padding: 40px;
          color: #64748b;
          font-weight: 800;
          text-align: center;
        }

        .loading {
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          font-weight: 900;
          font-size: 18px;
        }

        @media (max-width: 900px) {
          .hero {
            padding: 24px;
            border-radius: 24px;
          }

          .title {
            font-size: 34px;
          }

          .events-grid {
            grid-template-columns: 1fr;
          }

          .actions a {
            width: 100%;
          }
        }
      `}</style>

      <section className="hero">
        <span className="eyebrow">OmniStage App</span>

        <h1 className="title">Lista de Presentes</h1>

        <p className="subtitle">
          Configure presentes físicos, experiências e presentes em valor para cada evento.
          Seus convidados poderão visualizar a lista diretamente no convite digital.
        </p>
      </section>

      <section className="search-box">
        <input
          className="search-input"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por evento, cidade, categoria ou status"
        />
      </section>

      {loading ? (
        <div className="loading">Carregando eventos...</div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="empty">
          Nenhum evento encontrado para configurar lista de presentes.
        </div>
      ) : (
        <section className="events-grid">
          {eventosFiltrados.map((evento) => (
            <article key={evento.id} className="event-card">
              <div>
                <h2 className="event-name">{evento.nome || "Evento sem nome"}</h2>
              </div>

              <div className="meta">
                <span className="badge purple">
                  {evento.categoria_evento || "Sem categoria"}
                </span>

                <span className="badge neutral">
                  {labelStatus(evento.status_aprovacao)}
                </span>

                <span
                  className={
                    evento.lista_presentes_ativa
                      ? "badge green"
                      : "badge yellow"
                  }
                >
                  {evento.lista_presentes_ativa
                    ? "Lista ativa"
                    : "Lista desativada"}
                </span>
              </div>

              <div className="info">
                <div>
                  <strong>Data:</strong> {formatarData(evento.data_evento)}
                </div>

                <div>
                  <strong>Cidade:</strong> {evento.cidade || "Não informada"}
                </div>
              </div>

              <div className="modules">
                {evento.presentes_fisicos_enabled && (
                  <span className="module-pill">Presentes físicos</span>
                )}

                {evento.experiencias_enabled && (
                  <span className="module-pill">Experiências</span>
                )}

                {evento.presentes_valor_enabled && (
                  <span className="module-pill">Presentes em valor</span>
                )}
              </div>

              <div className="actions">
                <Link
                  href={`/app/eventos/${evento.id}/lista-presentes`}
                  className="primary"
                >
                  Configurar lista
                </Link>

                <Link href="/app/eventos" className="secondary">
                  Ver eventos
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
