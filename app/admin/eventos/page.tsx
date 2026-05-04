"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  cidade: string | null;
  cliente_id: string | null;
  status_aprovacao: string | null;
  ativo: boolean | null;
  created_at: string | null;
  cliente?: { id: string; nome: string; email: string | null } | null;
};

type Cliente = { id: string; nome: string; email: string | null };

export default function AdminEventosPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarEventos(), carregarClientes()]);
    setLoading(false);
  }

  async function carregarEventos() {
    const { data, error } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        local,
        cidade,
        cliente_id,
        status_aprovacao,
        ativo,
        created_at,
        cliente:clientes!eventos_cliente_id_fkey (
          id,
          nome,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    const normalizados = (data || []).map((item: any) => ({
      ...item,
      cliente: Array.isArray(item.cliente) ? item.cliente[0] || null : item.cliente || null,
    })) as Evento[];

    setEventos(normalizados);
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,email")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar cliente: " + error.message);
      return;
    }

    setClientes((data || []) as Cliente[]);
  }

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      const buscaOk =
        !termo ||
        [evento.nome, evento.local, evento.cidade, evento.cliente?.nome, evento.cliente?.email]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      const filtroOk = filtro === "todos" || evento.status_aprovacao === filtro;
      return buscaOk && filtroOk;
    });
  }, [eventos, busca, filtro]);

  const stats = useMemo(() => ({
    total: eventos.length,
    aprovados: eventos.filter((e) => e.status_aprovacao === "aprovado").length,
    aguardando: eventos.filter((e) => e.status_aprovacao === "aguardando_aprovacao").length,
    bloqueados: eventos.filter((e) => e.status_aprovacao === "bloqueado").length,
  }), [eventos]);

  async function atualizarEvento(id: string, campos: Record<string, any>) {
    const { error } = await supabase.from("eventos").update(campos).eq("id", id);
    if (error) {
      alert("Erro ao atualizar evento: " + error.message);
      return;
    }
    await carregarEventos();
  }

  return (
    <div className="admin-events-page">
      <style>{`
        .admin-events-page { display: flex; flex-direction: column; gap: 22px; }
        .hero, .panel, .metric-card { background: #fff; border: 1px solid rgba(226,232,240,.95); box-shadow: 0 24px 70px rgba(15,23,42,.08); }
        .hero { border-radius: 26px; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
        .eyebrow { color: #7c3aed; font-weight: 950; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
        .title { margin: 8px 0; font-size: 36px; font-weight: 950; color: #0f172a; letter-spacing: -.05em; }
        .subtitle { margin: 0; color: #64748b; font-size: 16px; line-height: 1.45; }
        .primary { border: none; background: linear-gradient(135deg,#7c3aed,#5b21b6); color: #fff; padding: 13px 18px; border-radius: 15px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 26px rgba(124,58,237,.24); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(170px,1fr)); gap: 14px; }
        .metric-card { border-radius: 22px; padding: 18px; }
        .metric-icon { width: 32px; height: 32px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .metric-label { margin: 0; color: #64748b; font-size: 12px; font-weight: 900; }
        .metric-value { display: block; margin-top: 7px; font-size: 32px; line-height: 1; font-weight: 950; color: #0f172a; }
        .metric-detail { margin: 8px 0 0; color: #64748b; font-size: 12px; }
        .panel { border-radius: 24px; padding: 24px; }
        .panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .panel-title { margin: 0; font-size: 22px; font-weight: 950; color: #0f172a; }
        .panel-text { margin: 6px 0 0; color: #64748b; line-height: 1.4; }
        .counter { padding: 9px 13px; border-radius: 999px; background: rgba(124,58,237,.08); color: #7c3aed; font-size: 13px; font-weight: 950; }
        .filters { display: grid; grid-template-columns: 1fr 260px; gap: 10px; margin-top: 18px; }
        .input, .mini-select { border: 1px solid rgba(226,232,240,.95); background: #f8fafc; color: #0f172a; outline: none; font-weight: 850; }
        .input { width: 100%; padding: 13px 15px; border-radius: 15px; }
        .mini-select { padding: 10px 11px; border-radius: 999px; max-width: 220px; }
        .list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .event-card { border: 1px solid rgba(226,232,240,.95); border-radius: 20px; background: #fbfdff; padding: 16px; display: grid; grid-template-columns: minmax(280px,1fr) auto; gap: 14px; align-items: center; transition: transform .17s cubic-bezier(.2,.8,.2,1), box-shadow .17s ease, border-color .17s ease; }
        .event-card:hover { transform: translateY(-1px); box-shadow: 0 18px 42px rgba(15,23,42,.08); border-color: rgba(124,58,237,.22); }
        .title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .item-title { color: #0f172a; font-size: 17px; font-weight: 950; }
        .item-meta { color: #334155; font-size: 14px; font-weight: 850; margin-top: 4px; }
        .small-line { color: #64748b; font-size: 12px; margin-top: 6px; }
        .id { color: #94a3b8; font-size: 10px; font-weight: 700; word-break: break-all; display: block; margin-top: 6px; }
        .actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }
        .approve, .block, .danger { padding: 10px 13px; border-radius: 999px; font-weight: 900; cursor: pointer; }
        .approve { border: 1px solid rgba(22,163,74,.24); background: #dcfce7; color: #166534; }
        .block { border: 1px solid rgba(245,158,11,.24); background: #fef3c7; color: #92400e; }
        .danger { border: 1px solid rgba(220,38,38,.24); background: #fee2e2; color: #991b1b; }
        .badge { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 950; }
        .badge.active { background: #dcfce7; color: #166534; }
        .badge.blocked { background: #fee2e2; color: #991b1b; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        .badge.neutral { background: #e2e8f0; color: #475569; }
        .empty { padding: 18px; border-radius: 16px; border: 1px dashed rgba(148,163,184,.5); color: #64748b; }
        @media (max-width: 900px) { .event-card, .filters { grid-template-columns: 1fr; } .actions { justify-content: flex-start; } }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">Admin OmniStage</span>
          <h1 className="title">Eventos</h1>
          <p className="subtitle">Aprove eventos criados por clientes, vincule empresas e controle liberação.</p>
        </div>
        <button onClick={carregarTudo} className="primary">{loading ? "Atualizando..." : "Atualizar eventos"}</button>
      </section>

      <section className="stats">
        <MetricCard label="Eventos" value={stats.total} detail="Total" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Aprovados" value={stats.aprovados} detail="Liberados" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Aguardando" value={stats.aguardando} detail="Em análise" color="#f59e0b" bg="#fef3c7" />
        <MetricCard label="Bloqueados" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><h2 className="panel-title">Lista de eventos</h2><p className="panel-text">Eventos criados no app do cliente aparecem aqui.</p></div>
          <span className="counter">{eventosFiltrados.length} exibidos</span>
        </div>
        <div className="filters">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por evento, cliente, local ou cidade" className="input" />
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="input">
            <option value="todos">Todos os status</option>
            <option value="aguardando_aprovacao">Aguardando aprovação</option>
            <option value="aprovado">Aprovado</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="reprovado">Reprovado</option>
            <option value="rascunho">Rascunho</option>
          </select>
        </div>
        <div className="list">
          {eventosFiltrados.map((evento) => (
            <article key={evento.id} className="event-card">
              <div>
                <div className="title-line"><strong className="item-title">{evento.nome}</strong><span className={getStatusClass(evento.status_aprovacao)}>{labelStatus(evento.status_aprovacao)}</span></div>
                <div className="item-meta">Cliente: <strong>{evento.cliente?.nome || "Sem cliente vinculado"}</strong></div>
                <div className="small-line">Data: <strong>{evento.data_evento ? formatarData(evento.data_evento) : "Não definida"}</strong> · Local: <strong>{evento.local || "Não informado"}</strong> · Cidade: <strong>{evento.cidade || "Não informada"}</strong></div>
                <small className="id">ID: {evento.id}</small>
              </div>
              <div className="actions">
                <select value={evento.cliente_id || ""} onChange={(e) => atualizarEvento(evento.id, { cliente_id: e.target.value || null })} className="mini-select">
                  <option value="">Sem cliente</option>
                  {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                </select>
                {evento.status_aprovacao !== "aprovado" && <button onClick={() => atualizarEvento(evento.id, { status_aprovacao: "aprovado", ativo: true })} className="approve">Aprovar</button>}
                {evento.status_aprovacao !== "bloqueado" && <button onClick={() => atualizarEvento(evento.id, { status_aprovacao: "bloqueado", ativo: false })} className="block">Bloquear</button>}
                {evento.status_aprovacao !== "reprovado" && <button onClick={() => atualizarEvento(evento.id, { status_aprovacao: "reprovado", ativo: false })} className="danger">Reprovar</button>}
              </div>
            </article>
          ))}
          {!loading && eventosFiltrados.length === 0 && <div className="empty">Nenhum evento encontrado.</div>}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, color, bg }: { label: string; value: number; detail: string; color: string; bg: string }) {
  return <article className="metric-card"><div className="metric-icon" style={{ background: bg, color }}>●</div><p className="metric-label">{label}</p><strong className="metric-value">{value}</strong><p className="metric-detail">{detail}</p></article>;
}
function labelStatus(status: string | null) { if (status === "aprovado") return "Aprovado"; if (status === "bloqueado") return "Bloqueado"; if (status === "reprovado") return "Reprovado"; if (status === "aguardando_aprovacao") return "Aguardando aprovação"; return "Rascunho"; }
function getStatusClass(status: string | null) { if (status === "aprovado") return "badge active"; if (status === "bloqueado" || status === "reprovado") return "badge blocked"; if (status === "aguardando_aprovacao") return "badge pending"; return "badge neutral"; }
function formatarData(data: string | null) { if (!data) return "Não informado"; return new Date(data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }
