"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  slug: string | null;
  nome: string | null;
  data_evento: string | null;
  cidade: string | null;
  categoria_evento: string | null;
  status_aprovacao: string | null;
  lista_presentes_ativa: boolean | null;
  presentes_fisicos_enabled: boolean | null;
  experiencias_enabled: boolean | null;
  presentes_valor_enabled: boolean | null;
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
  nome_presenteador: string;
  telefone_presenteador: string | null;
  mensagem: string | null;
  valor_presenteado: number | null;
  status: string | null;
  created_at: string | null;
  gift_items: GiftItem | GiftItem[] | null;
};

function getGiftItem(r: GiftReservation) {
  const item = r.gift_items;
  if (Array.isArray(item)) return item[0] || null;
  return item || null;
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";
  const [ano, mes, dia] = data.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano.slice(2)}`;
  return data;
}

function formatarDataHora(data: string | null) {
  if (!data) return "-";
  return new Date(data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatarMoeda(valor: number | null | undefined) {
  if (!valor) return "R$ 0,00";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function labelStatusEvento(status: string | null) {
  if (status === "aprovado") return "Aprovado";
  if (status === "bloqueado") return "Bloqueado";
  if (status === "reprovado") return "Reprovado";
  if (status === "aguardando_aprovacao") return "Aguardando aprovação";
  return "Rascunho";
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

function limparTelefone(t: string | null | undefined) {
  return String(t || "").replace(/\D/g, "");
}

function gerarUrlPublicaLista(evento: Evento) {
  const identificador = evento.slug || evento.id;
  const caminho = `/lista-presentes/${identificador}`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  if (!baseUrl) return caminho;
  return `${baseUrl.replace(/\/$/, "")}${caminho}`;
}

export default function ListaPresentesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [evento, setEvento] = useState<Evento | null>(null);
  const [reservas, setReservas] = useState<GiftReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome_presenteador: "", telefone_presenteador: "", valor_presenteado: "", mensagem: "", status: "" });
  const [confirmandoCancelId, setConfirmandoCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function carregarTudo() {
    setLoading(true);

    const { data } = await supabase
      .from("eventos")
      .select("id, slug, nome, data_evento, cidade, categoria_evento, status_aprovacao, lista_presentes_ativa, presentes_fisicos_enabled, experiencias_enabled, presentes_valor_enabled")
      .eq("id", eventId)
      .maybeSingle();

    if (!data) { setLoading(false); return; }
    setEvento(data as Evento);

    const { data: reservasData } = await supabase
      .from("gift_reservations")
      .select(`id, nome_presenteador, telefone_presenteador, mensagem, valor_presenteado, status, created_at, gift_items ( id, nome, tipo, valor_sugerido, imagem_url )`)
      .eq("evento_id", eventId)
      .order("created_at", { ascending: false });

    setReservas((reservasData || []) as GiftReservation[]);
    setLoading(false);
  }

  async function atualizarStatus(reserva: GiftReservation, novoStatus: string) {
    const { data, error } = await supabase
      .from("gift_reservations")
      .update({ status: novoStatus })
      .eq("id", reserva.id)
      .select("id, status")
      .maybeSingle();

    if (error) { alert("Erro ao atualizar: " + error.message); return; }
    if (!data) { alert("Não foi possível atualizar — verifique as permissões (RLS) da tabela gift_reservations."); return; }
    setReservas((old) => old.map((r) => r.id === reserva.id ? { ...r, status: novoStatus } : r));
  }

  function abrirEdicao(reserva: GiftReservation) {
    setEditandoId(reserva.id);
    setEditForm({
      nome_presenteador: reserva.nome_presenteador || "",
      telefone_presenteador: reserva.telefone_presenteador || "",
      valor_presenteado: reserva.valor_presenteado != null ? String(reserva.valor_presenteado) : "",
      mensagem: reserva.mensagem || "",
      status: reserva.status || "presenteado",
    });
  }

  async function salvarEdicao(reservaId: string) {
    const payload = {
      nome_presenteador: editForm.nome_presenteador.trim(),
      telefone_presenteador: editForm.telefone_presenteador.trim() || null,
      valor_presenteado: editForm.valor_presenteado ? Number(editForm.valor_presenteado.replace(",", ".")) : null,
      mensagem: editForm.mensagem.trim() || null,
      status: editForm.status,
    };
    const { error } = await supabase.from("gift_reservations").update(payload).eq("id", reservaId);
    if (error) { alert("Erro ao salvar: " + error.message); return; }
    setReservas((old) => old.map((r) => r.id === reservaId ? { ...r, ...payload } : r));
    setEditandoId(null);
  }

  const reservasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return reservas.filter((r) => {
      const item = getGiftItem(r);
      const passouStatus = statusFiltro === "todos" || String(r.status || "registrado") === statusFiltro;
      if (!passouStatus) return false;
      if (!termo) return true;
      return [r.nome_presenteador, r.telefone_presenteador, r.mensagem, r.status, item?.nome, item?.tipo]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [busca, reservas, statusFiltro]);

  const resumo = useMemo(() => {
    const totalValor = reservas.reduce((s, r) => s + Number(r.valor_presenteado || 0), 0);
    const totalConfirmados = reservas.filter((r) => ["presenteado", "confirmado", "recebido"].includes(r.status || "")).length;
    const totalRecebidos = reservas.filter((r) => r.status === "recebido").length;
    const pessoasUnicas = new Set(reservas.map((r) => r.nome_presenteador.trim().toLowerCase()).filter(Boolean)).size;
    const valorRecebido = reservas.filter((r) => r.status === "recebido").reduce((s, r) => s + Number(r.valor_presenteado || 0), 0);
    return { total: reservas.length, totalValor, totalConfirmados, totalRecebidos, pessoasUnicas, valorRecebido };
  }, [reservas]);

  if (loading) {
    return <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#0f172a", fontWeight: 900, fontSize: 18 }}>Carregando...</div>;
  }

  if (!evento) {
    return (
      <div style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#64748b", fontWeight: 800 }}>Evento não encontrado.</p>
        <button onClick={() => router.back()} style={btnSecStyle}>Voltar</button>
      </div>
    );
  }

  const linkPublico = gerarUrlPublicaLista(evento);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <style>{`
        .lp-hero { background:radial-gradient(circle at top left,rgba(124,58,237,.10),transparent 34%),radial-gradient(circle at top right,rgba(16,185,129,.08),transparent 28%),#ffffff; border:1px solid rgba(226,232,240,.95); border-radius:30px; padding:34px; box-shadow:0 28px 80px rgba(15,23,42,.07); }
        .lp-eyebrow { display:inline-block; color:#7c3aed; font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.12em; margin-bottom:12px; }
        .lp-title { margin:0; color:#0f172a; font-size:44px; line-height:1; font-weight:950; letter-spacing:-.05em; }
        .lp-subtitle { margin-top:14px; color:#64748b; font-size:17px; line-height:1.65; }
        .lp-card { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:28px; padding:24px; box-shadow:0 20px 60px rgba(15,23,42,.06); display:flex; flex-direction:column; gap:18px; }
        .lp-name { margin:0; color:#0f172a; font-size:30px; line-height:1.05; font-weight:950; letter-spacing:-.04em; }
        .lp-meta { display:flex; flex-wrap:wrap; gap:10px; }
        .lp-badge { padding:8px 12px; border-radius:999px; font-size:12px; font-weight:900; }
        .lp-purple { background:#ede9fe; color:#6d28d9; }
        .lp-green { background:#dcfce7; color:#166534; }
        .lp-yellow { background:#fef3c7; color:#92400e; }
        .lp-neutral { background:#e2e8f0; color:#475569; }
        .lp-info { color:#475569; line-height:1.7; font-weight:750; }
        .lp-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .lp-sum-card { border:1px solid rgba(226,232,240,.95); background:#f8fafc; border-radius:20px; padding:14px; }
        .lp-sum-label { color:#64748b; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.05em; }
        .lp-sum-value { margin-top:6px; color:#0f172a; font-size:24px; line-height:1; font-weight:950; }
        .lp-sum-caption { margin-top:6px; color:#64748b; font-size:12px; font-weight:750; }
        .lp-modules { display:flex; flex-wrap:wrap; gap:10px; }
        .lp-pill { border-radius:999px; padding:9px 12px; background:#f8fafc; border:1px solid rgba(226,232,240,.95); color:#334155; font-size:12px; font-weight:900; }
        .lp-actions { display:flex; gap:12px; flex-wrap:wrap; }
        .lp-btn-primary { text-decoration:none; background:linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; padding:14px 18px; border-radius:16px; font-weight:900; font-size:14px; transition:transform .16s; display:inline-flex; align-items:center; border:none; cursor:pointer; font-family:inherit; }
        .lp-btn-primary:hover { transform:translateY(-1px); }
        .lp-btn-sec { text-decoration:none; background:#fff; color:#0f172a; border:1px solid rgba(226,232,240,.95); padding:13px 16px; border-radius:16px; font-weight:900; font-size:14px; transition:transform .16s; display:inline-flex; align-items:center; cursor:pointer; font-family:inherit; }
        .lp-btn-sec:hover { transform:translateY(-1px); }

        /* métricas */
        .lp-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; }
        .lp-metric { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:22px; padding:18px; box-shadow:0 8px 24px rgba(15,23,42,.05); }
        .lp-metric-label { margin:0; color:#64748b; font-size:12px; font-weight:900; }
        .lp-metric-value { display:block; margin-top:8px; color:#0f172a; font-size:28px; font-weight:950; }

        /* lista */
        .lp-panel { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:26px; padding:22px; box-shadow:0 8px 24px rgba(15,23,42,.05); }
        .lp-toolbar { display:grid; grid-template-columns:1fr 200px; gap:12px; }
        .lp-input,.lp-select { width:100%; padding:14px 16px; border-radius:16px; border:1px solid rgba(203,213,225,.95); background:#fff; color:#0f172a; outline:none; font-size:14px; font-weight:800; font-family:inherit; box-sizing:border-box; }
        .lp-input:focus,.lp-select:focus { border-color:rgba(124,58,237,.45); box-shadow:0 0 0 4px rgba(124,58,237,.10); }
        .lp-list { display:flex; flex-direction:column; gap:14px; margin-top:16px; }
        .lp-row { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:24px; padding:16px; display:grid; grid-template-columns:112px minmax(0,1fr); gap:16px; box-shadow:0 8px 24px rgba(15,23,42,.05); }
        .lp-img { width:112px; height:112px; border-radius:20px; border:1px solid rgba(226,232,240,.95); object-fit:cover; background:#f1f5f9; }
        .lp-placeholder { width:112px; height:112px; border-radius:20px; border:1px solid rgba(226,232,240,.95); background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-weight:950; font-size:12px; text-align:center; padding:10px; box-sizing:border-box; }
        .lp-row-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
        .lp-row-title { margin:0; color:#0f172a; font-size:20px; font-weight:950; letter-spacing:-.03em; }
        .lp-presenter { margin-top:5px; color:#334155; font-weight:900; font-size:14px; }
        .lp-row-meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
        .lp-chip { border-radius:999px; padding:7px 10px; font-size:11px; font-weight:950; }
        .lp-chip-purple { background:#ede9fe; color:#6d28d9; }
        .lp-chip-yellow { background:#fef3c7; color:#92400e; }
        .lp-chip-gray { background:#f1f5f9; color:#475569; }
        .lp-chip-green { background:#dcfce7; color:#166534; }
        .lp-chip-blue { background:#dbeafe; color:#1e40af; }
        .lp-msg { margin-top:12px; color:#64748b; line-height:1.55; font-weight:750; background:#f8fafc; border:1px solid rgba(226,232,240,.95); border-radius:18px; padding:12px 14px; font-size:14px; }
        .lp-row-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
        .lp-act { border:none; border-radius:14px; font-weight:950; cursor:pointer; font-family:inherit; font-size:13px; padding:11px 14px; transition:transform .16s; display:inline-flex; align-items:center; text-decoration:none; }
        .lp-act:hover { transform:translateY(-1px); }
        .lp-act-sec { background:#fff; color:#0f172a; border:1px solid rgba(203,213,225,.95); }
        .lp-act-success { background:#dcfce7; color:#166534; }
        .lp-act-danger { background:#fee2e2; color:#991b1b; }
        .lp-empty { background:#fff; border:1px dashed rgba(148,163,184,.45); border-radius:26px; padding:40px; color:#64748b; font-weight:800; text-align:center; margin-top:16px; }
        .lp-edit-box { margin-top:14px; background:#f8fafc; border:1px solid rgba(226,232,240,.95); border-radius:20px; padding:16px; display:flex; flex-direction:column; gap:10px; }
        .lp-edit-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .lp-edit-label { font-size:11px; font-weight:950; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        .lp-edit-input,.lp-edit-textarea { width:100%; padding:11px 14px; border-radius:14px; border:1px solid rgba(203,213,225,.95); background:#fff; color:#0f172a; font-size:14px; font-weight:800; font-family:inherit; box-sizing:border-box; outline:none; }
        .lp-edit-input:focus,.lp-edit-textarea:focus { border-color:rgba(124,58,237,.45); box-shadow:0 0 0 3px rgba(124,58,237,.10); }
        .lp-edit-textarea { resize:vertical; min-height:70px; }
        .lp-edit-actions { display:flex; gap:8px; justify-content:flex-end; }
        .lp-act-primary { background:linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; }
        .lp-modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.45); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; }
        .lp-modal { background:#fff; border-radius:28px; padding:32px; max-width:400px; width:100%; box-shadow:0 32px 80px rgba(15,23,42,.18); display:flex; flex-direction:column; gap:20px; }
        .lp-modal-icon { width:52px; height:52px; border-radius:999px; background:#fee2e2; display:flex; align-items:center; justify-content:center; font-size:24px; }
        .lp-modal-title { margin:0; color:#0f172a; font-size:22px; font-weight:950; letter-spacing:-.03em; }
        .lp-modal-body { color:#64748b; font-size:15px; font-weight:750; line-height:1.6; margin:0; }
        .lp-modal-actions { display:flex; gap:10px; justify-content:flex-end; }
        @media (max-width:900px) {
          .lp-hero{padding:24px;border-radius:24px} .lp-title{font-size:34px}
          .lp-summary{grid-template-columns:1fr} .lp-toolbar{grid-template-columns:1fr}
          .lp-actions .lp-btn-primary,.lp-actions .lp-btn-sec{width:100%}
          .lp-row{grid-template-columns:1fr} .lp-img,.lp-placeholder{width:100%;height:180px}
          .lp-row-actions .lp-act{width:100%}
        }
      `}</style>

      {/* Hero */}
      <section className="lp-hero">
        <span className="lp-eyebrow">OmniStage App</span>
        <h1 className="lp-title">Lista de Presentes</h1>
        <p className="lp-subtitle">Gerencie presentes antes e durante o evento — lista pública, físicos, experiências e em valor.</p>
      </section>

      {/* Card do evento */}
      <article className="lp-card">
        <h2 className="lp-name">{evento.nome || "Evento sem nome"}</h2>

        <div className="lp-meta">
          <span className="lp-badge lp-purple">{evento.categoria_evento || "Sem categoria"}</span>
          <span className="lp-badge lp-neutral">{labelStatusEvento(evento.status_aprovacao)}</span>
          <span className={evento.lista_presentes_ativa ? "lp-badge lp-green" : "lp-badge lp-yellow"}>
            {evento.lista_presentes_ativa ? "Lista ativa" : "Lista desativada"}
          </span>
        </div>

        <div className="lp-info">
          <div><strong>Data:</strong> {formatarData(evento.data_evento)}</div>
          <div><strong>Cidade:</strong> {evento.cidade || "Não informada"}</div>
        </div>

        <div className="lp-summary">
          <div className="lp-sum-card">
            <div className="lp-sum-label">Itens na lista</div>
            <div className="lp-sum-value">{reservas.filter((r) => r.status !== "cancelado").length}</div>
            <div className="lp-sum-caption">Reservas e presenteados</div>
          </div>
          <div className="lp-sum-card">
            <div className="lp-sum-label">Status da lista</div>
            <div className="lp-sum-value" style={{ fontSize: 16, marginTop: 10 }}>{evento.lista_presentes_ativa ? "✓ Ativa" : "✗ Inativa"}</div>
            <div className="lp-sum-caption">Visível para convidados</div>
          </div>
        </div>

        {(evento.presentes_fisicos_enabled || evento.experiencias_enabled || evento.presentes_valor_enabled) && (
          <div className="lp-modules">
            {evento.presentes_fisicos_enabled && <span className="lp-pill">Presentes físicos</span>}
            {evento.experiencias_enabled && <span className="lp-pill">Experiências</span>}
            {evento.presentes_valor_enabled && <span className="lp-pill">Presentes em valor</span>}
          </div>
        )}

        <div className="lp-actions">
          <Link href={`/app/eventos/${evento.id}/lista-presentes`} className="lp-btn-primary">Configurar lista</Link>
          <a href={linkPublico} target="_blank" rel="noopener noreferrer" className="lp-btn-sec">Abrir lista pública</a>
          <button type="button" className="lp-btn-sec" onClick={() => { navigator.clipboard.writeText(linkPublico).then(() => alert("Link copiado.")).catch(() => window.prompt("Copie:", linkPublico)); }}>Copiar link público</button>
          <button type="button" className="lp-btn-sec" onClick={() => router.push("/app/presentes")}>Voltar</button>
        </div>
      </article>

      {/* Métricas */}
      <div className="lp-metrics">
        <article className="lp-metric"><p className="lp-metric-label">Presentes registrados</p><strong className="lp-metric-value">{resumo.total}</strong></article>
        <article className="lp-metric"><p className="lp-metric-label">Pessoas que presentearam</p><strong className="lp-metric-value">{resumo.pessoasUnicas}</strong></article>
        <article className="lp-metric"><p className="lp-metric-label">Marcados como recebidos</p><strong className="lp-metric-value">{resumo.totalRecebidos}</strong></article>
        <article className="lp-metric"><p className="lp-metric-label">Valor informado</p><strong className="lp-metric-value" style={{ fontSize: 20 }}>{formatarMoeda(resumo.totalValor)}</strong></article>
        <article className="lp-metric"><p className="lp-metric-label">Valor recebido</p><strong className="lp-metric-value" style={{ fontSize: 20 }}>{formatarMoeda(resumo.valorRecebido)}</strong></article>
      </div>

      {/* Lista */}
      <section className="lp-panel">
        <div className="lp-toolbar">
          <input className="lp-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por presente, nome, telefone, mensagem ou status" />
          <select className="lp-select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="presenteado">Presenteado</option>
            <option value="recebido">Recebido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {reservasFiltradas.length === 0 ? (
          <div className="lp-empty">{busca ? "Nenhum resultado para essa busca." : "Nenhum presente recebido ainda."}</div>
        ) : (
          <div className="lp-list">
            {reservasFiltradas.map((reserva) => {
              const item = getGiftItem(reserva);
              const telefoneLimpo = limparTelefone(reserva.telefone_presenteador);
              const whatsappUrl = telefoneLimpo ? `https://wa.me/${telefoneLimpo}` : "";
              const statusChip = reserva.status === "recebido" ? "lp-chip-green"
                : reserva.status === "confirmado" ? "lp-chip-blue"
                : reserva.status === "cancelado" ? "lp-chip-gray"
                : "lp-chip-yellow";

              return (
                <article key={reserva.id} className="lp-row">
                  {item?.imagem_url
                    ? <img className="lp-img" src={item.imagem_url} alt={item.nome || "Presente"} />
                    : <div className="lp-placeholder">{labelTipo(item?.tipo)}</div>
                  }
                  <div>
                    <div className="lp-row-head">
                      <div>
                        <h2 className="lp-row-title">{item?.nome || "Presente não identificado"}</h2>
                        <div className="lp-presenter">Presenteado por: {reserva.nome_presenteador}</div>
                      </div>
                      <span className={`lp-chip ${statusChip}`}>{labelStatus(reserva.status)}</span>
                    </div>
                    <div className="lp-row-meta">
                      <span className="lp-chip lp-chip-purple">{labelTipo(item?.tipo)}</span>
                      <span className="lp-chip lp-chip-yellow">{formatarMoeda(reserva.valor_presenteado)}</span>
                      <span className="lp-chip lp-chip-gray">{formatarDataHora(reserva.created_at)}</span>
                      {reserva.telefone_presenteador && <span className="lp-chip lp-chip-gray">{reserva.telefone_presenteador}</span>}
                    </div>
                    {reserva.mensagem && editandoId !== reserva.id && <div className="lp-msg">"{reserva.mensagem}"</div>}

                    {editandoId === reserva.id ? (
                      <div className="lp-edit-box">
                        <div className="lp-edit-row">
                          <div>
                            <div className="lp-edit-label">Nome do presenteador</div>
                            <input className="lp-edit-input" value={editForm.nome_presenteador} onChange={(e) => setEditForm((f) => ({ ...f, nome_presenteador: e.target.value }))} placeholder="Nome" />
                          </div>
                          <div>
                            <div className="lp-edit-label">Telefone</div>
                            <input className="lp-edit-input" value={editForm.telefone_presenteador} onChange={(e) => setEditForm((f) => ({ ...f, telefone_presenteador: e.target.value }))} placeholder="55219XXXXXXXX" />
                          </div>
                        </div>
                        <div className="lp-edit-row">
                          <div>
                            <div className="lp-edit-label">Valor presenteado (R$)</div>
                            <input className="lp-edit-input" value={editForm.valor_presenteado} onChange={(e) => setEditForm((f) => ({ ...f, valor_presenteado: e.target.value }))} placeholder="0,00" type="text" />
                          </div>
                          <div>
                            <div className="lp-edit-label">Status</div>
                            <select className="lp-edit-input" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                              <option value="presenteado">Presenteado</option>
                              <option value="recebido">Recebido</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <div className="lp-edit-label">Mensagem</div>
                          <textarea className="lp-edit-textarea" value={editForm.mensagem} onChange={(e) => setEditForm((f) => ({ ...f, mensagem: e.target.value }))} placeholder="Mensagem do presenteador..." />
                        </div>
                        <div className="lp-edit-actions">
                          <button type="button" className="lp-act lp-act-sec" onClick={() => setEditandoId(null)}>Cancelar</button>
                          <button type="button" className="lp-act lp-act-primary" onClick={() => salvarEdicao(reserva.id)}>Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="lp-row-actions">
                        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="lp-act lp-act-sec">Chamar no WhatsApp</a>}
                        <button type="button" className="lp-act lp-act-sec" onClick={() => abrirEdicao(reserva)}>Alterar</button>
                        <button type="button" className="lp-act lp-act-success" onClick={() => atualizarStatus(reserva, "recebido")}>Marcar como recebido</button>
                        <button type="button" className="lp-act lp-act-danger" onClick={() => setConfirmandoCancelId(reserva.id)}>Cancelar</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {/* Modal de confirmação de cancelamento */}
      {confirmandoCancelId && (
        <div className="lp-modal-backdrop" onClick={() => setConfirmandoCancelId(null)}>
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal-icon">⚠️</div>
            <h2 className="lp-modal-title">Cancelar presente?</h2>
            <p className="lp-modal-body">Esta ação marcará o presente como cancelado. O registro continuará visível mas não será contabilizado nas métricas.</p>
            <div className="lp-modal-actions">
              <button type="button" className="lp-act lp-act-sec" onClick={() => setConfirmandoCancelId(null)}>Voltar</button>
              <button type="button" className="lp-act lp-act-danger" onClick={async () => {
                const id = confirmandoCancelId;
                setConfirmandoCancelId(null);
                await atualizarStatus(reservas.find((r) => r.id === id)!, "cancelado");
              }}>Sim, cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnSecStyle: React.CSSProperties = {
  background: "#fff", color: "#0f172a", border: "1px solid rgba(226,232,240,.95)",
  borderRadius: 16, padding: "13px 18px", fontWeight: 900, cursor: "pointer", fontSize: 14,
};
