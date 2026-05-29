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
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string>("");

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

    const eventosCarregados = (eventosData || []) as Evento[];

    setEventos(eventosCarregados);
    setEventoSelecionadoId((atual) => atual || eventosCarregados[0]?.id || "");
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

  const eventoSelecionado = useMemo(() => {
    return eventos.find((evento) => evento.id === eventoSelecionadoId) || eventos[0] || null;
  }, [eventos, eventoSelecionadoId]);

  const metricasSelecionadas = useMemo(() => {
    if (!eventoSelecionado?.id) {
      return {
        lista: 0,
        valor: 0,
        fisicos: 0,
        comFoto: 0,
        iaProcessados: 0,
        total: 0,
      };
    }

    return metricasEvento(eventoSelecionado.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoSelecionado?.id, reservas, payments, presentesFisicos]);

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
        .actions { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; }
        .hero-event-control { min-width:320px; max-width:440px; display:grid; gap:10px; }
        .hero-event-control label { color:#334155; font-size:14px; font-weight:950; }
        .hero-event-select { width:100%; min-height:56px; padding:0 16px; border-radius:18px; border:1px solid rgba(203,213,225,.95); background:#fff; color:#0f172a; outline:none; font-size:16px; font-weight:950; box-shadow:0 12px 28px rgba(15,23,42,.05); }
        .hero-event-select:focus { border-color:rgba(124,58,237,.55); box-shadow:0 0 0 4px rgba(124,58,237,.10); }
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
        .module-note { color:#64748b; font-weight:800; line-height:1.55; }
        .module-note strong { display:block; color:#0f172a; font-size:16px; font-weight:950; margin-bottom:4px; }
        .module-note p { margin:0; }
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
        .event-numbers { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .event-number { border:1px solid rgba(226,232,240,.95); background:#f8fafc; border-radius:20px; padding:14px; }
        .event-number-label { color:#64748b; font-size:11px; font-weight:950; text-transform:uppercase; letter-spacing:.06em; }
        .event-number-value { margin-top:6px; color:#0f172a; font-size:24px; font-weight:950; }
        .event-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:auto; }
        .event-action-wide { grid-column:auto; }
        .module-action-card { min-height:124px; border-radius:22px; padding:20px; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:12px; text-align:left; background:#f8fafc; border:1px solid rgba(226,232,240,.95); color:#374151; box-shadow:none; }
        .module-action-card:hover { background:#f5f3ff; border-color:rgba(124,58,237,.35); box-shadow:0 14px 34px rgba(15,23,42,.08); }
        .module-action-icon { width:32px; height:32px; color:#4b5563; }
        .module-action-card strong { display:block; color:#374151; font-size:21px; line-height:1.14; font-weight:950; letter-spacing:-.035em; }
        .module-action-card span { display:none; }
        .btn.primary.module-action-card, .btn.green.module-action-card, .btn.orange.module-action-card { background:#f8fafc; color:#374151; border-color:rgba(226,232,240,.95); box-shadow:none; }
        .btn.primary.module-action-card:hover, .btn.green.module-action-card:hover, .btn.orange.module-action-card:hover { background:#f5f3ff; border-color:rgba(124,58,237,.35); }
        .empty { background:#fff; border:1px dashed rgba(148,163,184,.45); border-radius:28px; padding:42px; text-align:center; color:#64748b; font-weight:850; }
        @media (max-width:860px){ .hero{padding:24px;border-radius:26px}.title{font-size:38px}.toolbar{grid-template-columns:1fr}.event-actions{grid-template-columns:1fr}.event-numbers{grid-template-columns:1fr}.btn{width:100%}.hero-event-control{width:100%;max-width:none;min-width:0}.module-action-card{min-height:96px} }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">OmniStage</span>
          <h1 className="title">Presentes</h1>
          <p className="subtitle">
            Centralize lista de presentes, recebidos antes do evento e presentes recebidos
            durante a operação do evento.
          </p>
        </div>

        <div className="actions">
          <div className="hero-event-control">
            <label htmlFor="presentes-evento-selecionado">Evento</label>
            <select
              id="presentes-evento-selecionado"
              className="hero-event-select"
              value={eventoSelecionado?.id || ""}
              onChange={(event) => setEventoSelecionadoId(event.target.value)}
            >
              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nome || "Evento sem nome"}
                </option>
              ))}
            </select>
          </div>

          <button className="btn" onClick={carregarTudo}>Atualizar</button>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Eventos" value={resumo.eventos} />
        <Metric label="Lista de presentes" value={resumo.lista} />
        <Metric label="Presentes no Evento" value={resumo.fisicos} />
        <Metric label="Valor confirmado" value={formatarMoeda(resumo.valor)} />
      </section>

      {eventoSelecionado && (
        <section className="event-card">
          <div>
            <h2 className="event-title">{eventoSelecionado.nome || "Evento sem nome"}</h2>
            <div className="event-meta">
              <span className="badge badge-purple">{eventoSelecionado.categoria_evento || eventoSelecionado.tipo_evento || "Evento"}</span>
              <span className="badge badge-gray">{formatarData(eventoSelecionado.data_evento)}</span>
              {eventoSelecionado.cidade && <span className="badge badge-gray">{eventoSelecionado.cidade}</span>}
              <span className="badge badge-green">{labelStatusAprovacao(eventoSelecionado.status_aprovacao)}</span>
              {eventoSelecionado.lista_presentes_ativa && <span className="badge badge-orange">Lista ativa</span>}
            </div>
          </div>

          <div className="event-numbers">
            <div className="event-number">
              <div className="event-number-label">Lista de Presentes</div>
              <div className="event-number-value">{metricasSelecionadas.lista}</div>
            </div>
            <div className="event-number">
              <div className="event-number-label">Presentes no Evento</div>
              <div className="event-number-value">{metricasSelecionadas.fisicos}</div>
            </div>
          </div>

          <div className="event-actions">
            <button className="btn module-action-card" onClick={() => router.push(`/app/presentes/${eventoSelecionado.id}/lista`)}>
              <IconLista />
              <strong>Lista de Presentes</strong>
              <span>Lista pública, reservas e presenteados.</span>
            </button>
            <button className="btn module-action-card" onClick={() => router.push(`/app/presentes/${eventoSelecionado.id}/presenteados`)}>
              <IconCaixa />
              <strong>Recebidos Antes</strong>
              <span>Registrar presentes entregues antes do evento.</span>
            </button>
            <button className="btn module-action-card" onClick={() => router.push(`/app/presentes/${eventoSelecionado.id}/fisicos`)}>
              <IconCalendario />
              <strong>No Evento</strong>
              <span>Recepção, etiqueta, foto, NF e controle físico.</span>
            </button>
          </div>
        </section>
      )}

      <section className="panel module-note">
        <strong>Controle centralizado do evento selecionado</strong>
        <p>
          Use os cards acima para acessar lista de presentes, recebidos antes do evento
          e presentes recebidos durante a operação.
        </p>
      </section>

    </main>
  );
}

function IconLista() {
  return (
    <svg className="module-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 18h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 6.2l1.2 1.2L6.6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12.2l1.2 1.2L6.6 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 18.2l1.2 1.2L6.6 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCaixa() {
  return (
    <svg className="module-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 21 8l-9 5-9-5 9-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 13v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m7.5 5.5 9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendario() {
  return (
    <svg className="module-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
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
