"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  nome: string | null;
  tenant_id: string | null;
  data_evento: string | null;
  cidade: string | null;
  tipo_evento: string | null;
  categoria_evento: string | null;
  status_aprovacao: string | null;
  lista_presentes_ativa: boolean | null;
};

type GiftReservation = {
  id: string;
  evento_id: string | null;
  valor_presenteado: number | null;
  status: string | null;
};

type GiftPayment = {
  id: string;
  evento_id: string | null;
  valor: number | null;
  status: string | null;
};

type EventGiftRecord = {
  id: string;
  evento_id: string | null;
  status: string | null;
  foto_url: string | null;
  ia_processado: boolean | null;
};

function normalizar(texto: string | null | undefined) {
  return String(texto || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  try {
    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return data;
  }
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function labelStatusAprovacao(status: string | null) {
  if (status === "aprovado") return "Aprovado";
  if (status === "pendente") return "Pendente";
  if (status === "reprovado") return "Reprovado";
  return "Evento";
}

export default function PresentesPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [reservas, setReservas] = useState<GiftReservation[]>([]);
  const [payments, setPayments] = useState<GiftPayment[]>([]);
  const [presentesFisicos, setPresentesFisicos] = useState<EventGiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "lista" | "fisicos" | "ativos">("todos");

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo() {
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      setLoading(false);
      alert("Usuário não autenticado.");
      return;
    }

    const { data: membro, error: membroError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .in("status", ["ativo", "active"])
      .limit(1)
      .maybeSingle();

    if (membroError || !membro?.tenant_id) {
      setLoading(false);
      alert("Seu usuário ainda não está vinculado a uma empresa ativa.");
      return;
    }

    const tenantId = membro.tenant_id;

    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select(
        "id, nome, tenant_id, data_evento, cidade, tipo_evento, categoria_evento, status_aprovacao, lista_presentes_ativa",
      )
      .eq("tenant_id", tenantId)
      .order("data_evento", { ascending: false });

    if (eventosError) {
      setLoading(false);
      alert("Erro ao carregar eventos: " + eventosError.message);
      return;
    }

    const eventoIds = (eventosData || []).map((evento) => evento.id);

    if (!eventoIds.length) {
      setEventos([]);
      setReservas([]);
      setPayments([]);
      setPresentesFisicos([]);
      setLoading(false);
      return;
    }

    const [reservasResp, paymentsResp, fisicosResp] = await Promise.all([
      supabase
        .from("gift_reservations")
        .select("id, evento_id, valor_presenteado, status")
        .in("evento_id", eventoIds),
      supabase
        .from("gift_payments")
        .select("id, evento_id, valor, status")
        .in("evento_id", eventoIds),
      supabase
        .from("event_gift_records")
        .select("id, evento_id, status, foto_url, ia_processado")
        .in("evento_id", eventoIds),
    ]);

    if (reservasResp.error) {
      alert("Erro ao carregar reservas: " + reservasResp.error.message);
    }

    if (paymentsResp.error) {
      alert("Erro ao carregar pagamentos: " + paymentsResp.error.message);
    }

    if (fisicosResp.error) {
      alert("Erro ao carregar presentes físicos: " + fisicosResp.error.message);
    }

    setEventos((eventosData || []) as Evento[]);
    setReservas((reservasResp.data || []) as GiftReservation[]);
    setPayments((paymentsResp.data || []) as GiftPayment[]);
    setPresentesFisicos((fisicosResp.data || []) as EventGiftRecord[]);
    setLoading(false);
  }

  function metricasEvento(eventoId: string) {
    const reservasEvento = reservas.filter((item) => item.evento_id === eventoId);
    const paymentsEvento = payments.filter((item) => item.evento_id === eventoId);
    const fisicosEvento = presentesFisicos.filter((item) => item.evento_id === eventoId);

    const fisicosAtivos = fisicosEvento.filter(
      (item) => normalizar(item.status || "ativo") !== "cancelado",
    );

    const reservasAtivas = reservasEvento.filter(
      (item) => normalizar(item.status || "") !== "cancelado",
    );

    const valorReservas = reservasAtivas.reduce(
      (total, item) => total + Number(item.valor_presenteado || 0),
      0,
    );

    const valorPayments = paymentsEvento
      .filter((item) => ["pago", "paid", "confirmado", "approved"].includes(normalizar(item.status)))
      .reduce((total, item) => total + Number(item.valor || 0), 0);

    const comFoto = fisicosAtivos.filter((item) => Boolean(item.foto_url)).length;
    const iaProcessados = fisicosAtivos.filter((item) => item.ia_processado === true).length;

    return {
      lista: reservasAtivas.length,
      valor: valorPayments || valorReservas,
      fisicos: fisicosAtivos.length,
      comFoto,
      iaProcessados,
      total: reservasAtivas.length + fisicosAtivos.length,
    };
  }

  const eventosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return eventos.filter((evento) => {
      const metricas = metricasEvento(evento.id);

      if (filtro === "lista" && metricas.lista <= 0 && !evento.lista_presentes_ativa) return false;
      if (filtro === "fisicos" && metricas.fisicos <= 0) return false;
      if (filtro === "ativos" && !evento.lista_presentes_ativa && metricas.total <= 0) return false;

      if (!termo) return true;

      return [
        evento.nome,
        evento.cidade,
        evento.tipo_evento,
        evento.categoria_evento,
        evento.status_aprovacao,
      ]
        .filter(Boolean)
        .some((valor) => normalizar(valor).includes(termo));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, eventos, filtro, reservas, payments, presentesFisicos]);

  const resumo = useMemo(() => {
    const totalLista = reservas.filter(
      (item) => normalizar(item.status || "") !== "cancelado",
    ).length;

    const totalFisicos = presentesFisicos.filter(
      (item) => normalizar(item.status || "ativo") !== "cancelado",
    ).length;

    const totalIa = presentesFisicos.filter((item) => item.ia_processado === true).length;

    const valorPago = payments
      .filter((item) => ["pago", "paid", "confirmado", "approved"].includes(normalizar(item.status)))
      .reduce((total, item) => total + Number(item.valor || 0), 0);

    return {
      eventos: eventos.length,
      lista: totalLista,
      fisicos: totalFisicos,
      ia: totalIa,
      valor: valorPago,
    };
  }, [eventos, reservas, presentesFisicos, payments]);

  if (loading) {
    return <div style={loadingStyle}>Carregando módulo de presentes...</div>;
  }

  return (
    <main className="presentes-page">
      <style>{`
        .presentes-page { display:flex; flex-direction:column; gap:22px; color:#0f172a; }
        .hero, .metric, .panel, .event-card { background:#fff; border:1px solid rgba(226,232,240,.95); box-shadow:0 24px 70px rgba(15,23,42,.08); }
        .hero { border-radius:32px; padding:34px; display:flex; justify-content:space-between; gap:18px; align-items:flex-start; flex-wrap:wrap; background:radial-gradient(circle at 5% 0%, rgba(124,58,237,.13), transparent 34%), radial-gradient(circle at 95% 0%, rgba(249,115,22,.11), transparent 30%), #fff; }
        .eyebrow { display:inline-block; color:#7c3aed; font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.14em; margin-bottom:10px; }
        .title { margin:0; color:#0f172a; font-size:48px; line-height:1; font-weight:950; letter-spacing:-.065em; }
        .subtitle { margin:14px 0 0; color:#64748b; font-size:16px; line-height:1.62; max-width:790px; font-weight:750; }
        .actions { display:flex; gap:10px; flex-wrap:wrap; }
        .btn { border:1px solid rgba(203,213,225,.95); border-radius:16px; background:#fff; color:#0f172a; padding:13px 16px; font-weight:950; cursor:pointer; font-family:inherit; font-size:14px; transition:transform .16s ease, box-shadow .16s ease; }
        .btn:hover { transform:translateY(-1px); box-shadow:0 12px 28px rgba(15,23,42,.07); }
        .btn.primary { border-color:transparent; color:white; background:linear-gradient(135deg,#7c3aed,#5b21b6); box-shadow:0 18px 38px rgba(124,58,237,.22); }
        .btn.orange { border-color:#fed7aa; color:#9a3412; background:#fff7ed; }
        .btn.green { border-color:#bbf7d0; color:#166534; background:#dcfce7; }
        .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; }
        .metric { border-radius:24px; padding:18px; }
        .metric-label { margin:0; color:#64748b; font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.08em; }
        .metric-value { display:block; margin-top:8px; color:#0f172a; font-size:31px; line-height:1; font-weight:950; letter-spacing:-.035em; }
        .panel { border-radius:26px; padding:20px; }
        .toolbar { display:grid; grid-template-columns:1fr 230px; gap:12px; }
        .input, .select { width:100%; padding:15px 16px; border-radius:17px; border:1px solid rgba(203,213,225,.95); background:#fff; color:#0f172a; outline:none; font-size:14px; font-weight:850; }
        .input:focus, .select:focus { border-color:rgba(124,58,237,.45); box-shadow:0 0 0 4px rgba(124,58,237,.10); }
        .events-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; }
        .event-card { border-radius:28px; padding:22px; display:flex; flex-direction:column; gap:18px; }
        .event-title { margin:0; color:#0f172a; font-size:28px; line-height:1.05; font-weight:950; letter-spacing:-.05em; }
        .event-meta { margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; }
        .badge { border-radius:999px; padding:7px 10px; font-size:11px; font-weight:950; text-transform:uppercase; }
        .badge-purple { background:#ede9fe; color:#6d28d9; }
        .badge-green { background:#dcfce7; color:#166534; }
        .badge-orange { background:#ffedd5; color:#9a3412; }
        .badge-gray { background:#f1f5f9; color:#475569; }
        .event-numbers { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .event-number { border:1px solid rgba(226,232,240,.95); background:#f8fafc; border-radius:20px; padding:14px; }
        .event-number-label { color:#64748b; font-size:11px; font-weight:950; text-transform:uppercase; letter-spacing:.06em; }
        .event-number-value { margin-top:6px; color:#0f172a; font-size:24px; font-weight:950; }
        .event-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:auto; }
        .empty { background:#fff; border:1px dashed rgba(148,163,184,.45); border-radius:28px; padding:42px; text-align:center; color:#64748b; font-weight:850; }
        @media (max-width:860px){ .hero{padding:24px;border-radius:26px}.title{font-size:38px}.toolbar{grid-template-columns:1fr}.event-actions{grid-template-columns:1fr}.event-numbers{grid-template-columns:1fr}.btn{width:100%} }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">OmniStage</span>
          <h1 className="title">Presentes</h1>
          <p className="subtitle">
            Centralize lista pública, presentes em valor, experiências, presentes físicos,
            etiquetas, recepção e inteligência artificial em um único módulo.
          </p>
        </div>

        <div className="actions">
          <button className="btn" onClick={carregarTudo}>Atualizar</button>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Eventos" value={resumo.eventos} />
        <Metric label="Lista pública" value={resumo.lista} />
        <Metric label="Físicos no evento" value={resumo.fisicos} />
        <Metric label="IA processados" value={resumo.ia} />
        <Metric label="Valor confirmado" value={formatarMoeda(resumo.valor)} />
      </section>

      <section className="panel">
        <div className="toolbar">
          <input
            className="input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por evento, cidade, categoria, status ou tipo"
          />

          <select
            className="select"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value as typeof filtro)}
          >
            <option value="todos">Todos os eventos</option>
            <option value="ativos">Com presentes/lista ativa</option>
            <option value="lista">Lista pública</option>
            <option value="fisicos">Presentes físicos</option>
          </select>
        </div>
      </section>

      {eventosFiltrados.length === 0 ? (
        <div className="empty">Nenhum evento encontrado no módulo de presentes.</div>
      ) : (
        <section className="events-grid">
          {eventosFiltrados.map((evento) => {
            const metricas = metricasEvento(evento.id);

            return (
              <article key={evento.id} className="event-card">
                <div>
                  <h2 className="event-title">{evento.nome || "Evento sem nome"}</h2>
                  <div className="event-meta">
                    <span className="badge badge-purple">{evento.categoria_evento || evento.tipo_evento || "Evento"}</span>
                    <span className="badge badge-gray">{formatarData(evento.data_evento)}</span>
                    {evento.cidade && <span className="badge badge-gray">{evento.cidade}</span>}
                    <span className="badge badge-green">{labelStatusAprovacao(evento.status_aprovacao)}</span>
                    {evento.lista_presentes_ativa && <span className="badge badge-orange">Lista ativa</span>}
                  </div>
                </div>

                <div className="event-numbers">
                  <div className="event-number">
                    <div className="event-number-label">Lista</div>
                    <div className="event-number-value">{metricas.lista}</div>
                  </div>
                  <div className="event-number">
                    <div className="event-number-label">Físicos</div>
                    <div className="event-number-value">{metricas.fisicos}</div>
                  </div>
                  <div className="event-number">
                    <div className="event-number-label">IA</div>
                    <div className="event-number-value">{metricas.iaProcessados}/{metricas.comFoto}</div>
                  </div>
                </div>

                <div className="event-actions">
                  <button className="btn primary" onClick={() => router.push(`/app/presentes/${evento.id}/lista`)}>
                    Lista pública
                  </button>
                  <button className="btn orange" onClick={() => router.push(`/app/presentes/${evento.id}/fisicos`)}>
                    Físicos
                  </button>
                  <button className="btn green" onClick={() => router.push(`/app/presentes/${evento.id}/presenteados`)}>
                    Presenteados
                  </button>
                  <button className="btn" onClick={() => router.push(`/app/eventos/${evento.id}/checkin`)}>
                    Check-in
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
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
  minHeight: 320,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f172a",
  fontWeight: 950,
};
