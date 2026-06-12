"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── tipos ────────────────────────────────────────────────────────────────────
type Perfil = { nome: string | null; email: string | null };
type Evento = {
  id: string;
  nome?: string | null;
  data_evento?: string | null;
  data_inicio?: string | null;
  hora_inicio?: string | null;
  ativo?: boolean | null;
};
type Convidado = {
  id: string;
  nome: string | null;
  status_rsvp: string | null;
  status_checkin: string | null;
  created_at?: string | null;
  data_hora_rsvp?: string | null;
  data_resposta?: string | null;
  evento_id?: string | null;
};
type ExtraStats = {
  fornecedoresConfirmados: number;
  valorPendente: number;
  tarefasAbertas: number;
};

// ─── definição de todos os cards disponíveis ──────────────────────────────────
type CardId =
  | "eventos_ativos"
  | "total_convidados"
  | "confirmados"
  | "pendentes"
  | "checkins"
  | "proximo_evento"
  | "realizados"
  | "a_realizar"
  | "rsvp_medio"
  | "atividade_recente"
  | "recusados"
  | "taxa_checkin"
  | "eventos_ano"
  | "fornecedores"
  | "financeiro"
  | "tarefas";

const TODOS_CARDS: { id: CardId; label: string; descricao: string }[] = [
  { id: "eventos_ativos",    label: "Eventos ativos",          descricao: "Total de eventos em andamento" },
  { id: "total_convidados",  label: "Total convidados",        descricao: "Soma de convidados em todos os eventos" },
  { id: "confirmados",       label: "Confirmados",             descricao: "Confirmações de RSVP recebidas" },
  { id: "pendentes",         label: "Pendentes",               descricao: "Convidados que ainda não responderam" },
  { id: "recusados",         label: "Recusados",               descricao: "Convidados que disseram não" },
  { id: "checkins",          label: "Check-ins",               descricao: "Entradas registradas" },
  { id: "taxa_checkin",      label: "Taxa de check-in",        descricao: "% dos confirmados que já entraram" },
  { id: "rsvp_medio",        label: "RSVP médio",              descricao: "Percentual médio de confirmações" },
  { id: "proximo_evento",    label: "Próximo evento",          descricao: "Contagem regressiva para o próximo evento" },
  { id: "realizados",        label: "Realizados no mês",       descricao: "Eventos já ocorridos este mês" },
  { id: "a_realizar",        label: "A realizar no mês",       descricao: "Eventos futuros deste mês" },
  { id: "eventos_ano",       label: "Eventos este ano",        descricao: "Total de eventos no ano corrente" },
  { id: "fornecedores",      label: "Fornecedores confirmados",descricao: "Fornecedores com contrato fechado" },
  { id: "financeiro",        label: "Pendências financeiras",  descricao: "Valor total ainda não pago em contratos" },
  { id: "tarefas",           label: "Tarefas abertas",         descricao: "Ações de produção em andamento" },
  { id: "atividade_recente", label: "Atividade recente",       descricao: "Últimas confirmações e check-ins" },
];

const CARDS_PADRAO: CardId[] = [
  "eventos_ativos", "total_convidados", "confirmados", "pendentes", "checkins", "proximo_evento", "atividade_recente",
];

const LS_KEY = "omnistage-home-cards";

// ─── helpers ──────────────────────────────────────────────────────────────────
function normalizeRsvp(s: string | null | undefined) {
  const v = (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (["confirmado","confirmada","sim","s","yes"].includes(v)) return "confirmado";
  if (["nao","nao","ausente","recusado"].includes(v)) return "nao";
  return "pendente";
}
function normalizeCheckin(s: string | null | undefined) {
  const v = (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return ["entrou","entrada","checkin","check-in","presente"].includes(v) ? "entrou" : "nao";
}
function formatData(raw: string | null | undefined) {
  if (!raw) return "";
  const d = new Date(`${String(raw).slice(0,10)}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}
function formatDataHora(raw: string | null | undefined) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  const eHoje  = d.toDateString() === hoje.toDateString();
  const eOntem = d.toDateString() === ontem.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (eHoje)  return `Hoje ${hora}`;
  if (eOntem) return `Ontem ${hora}`;
  return `${d.toLocaleDateString("pt-BR")} ${hora}`;
}
function diaInicio(ev: Evento) {
  const raw = ev.data_inicio || ev.data_evento;
  if (!raw) return null;
  return new Date(`${String(raw).slice(0,10)}T00:00:00`);
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function AppHome() {
  const [perfil, setPerfil]       = useState<Perfil | null>(null);
  const [eventos, setEventos]     = useState<Evento[]>([]);
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [extraStats, setExtraStats] = useState<ExtraStats>({ fornecedoresConfirmados: 0, valorPendente: 0, tarefasAbertas: 0 });
  const [loading, setLoading]     = useState(true);
  const [cardsAtivos, setCardsAtivos] = useState<CardId[]>(CARDS_PADRAO);
  const [personalizando, setPersonalizando] = useState(false);
  const [draft, setDraft]         = useState<CardId[]>([]);

  // carrega preferência salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setCardsAtivos(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from("perfis").select("nome, email").eq("id", user.id).maybeSingle();
      setPerfil({
        nome: p?.nome || user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Cliente",
        email: p?.email || user.email || null,
      });

      const { data: memberships } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", user.id);
      const tenantIds = [...new Set((memberships || []).map((m: any) => m.tenant_id).filter(Boolean))];

      if (tenantIds.length === 0) { setLoading(false); return; }

      const { data: evs } = await supabase
        .from("eventos")
        .select("id, nome, data_evento, data_inicio, hora_inicio, ativo")
        .in("tenant_id", tenantIds)
        .order("data_inicio", { ascending: true });

      const listaEventos = (evs || []) as Evento[];
      setEventos(listaEventos);

      const eventoIds = listaEventos.map((e) => e.id);
      if (eventoIds.length > 0) {
        const [cvRes, fornRes, contrRes, tarefRes] = await Promise.all([
          supabase.from("convidados")
            .select("id, nome, status_rsvp, status_checkin, created_at, data_hora_rsvp, data_resposta, evento_id")
            .in("evento_id", eventoIds)
            .order("created_at", { ascending: false }),
          supabase.from("organizacao_fornecedores_evento")
            .select("id, status")
            .in("evento_id", eventoIds),
          supabase.from("organizacao_contratacoes")
            .select("valor_contratado, valor_pago, status")
            .in("evento_id", eventoIds),
          supabase.from("organizacao_producao")
            .select("id, status")
            .in("tenant_id", tenantIds),
        ]);

        setConvidados((cvRes.data || []) as Convidado[]);

        const fornecedoresConfirmados = (fornRes.data || []).filter(
          (f: any) => ["contratado", "confirmado"].includes(f.status)
        ).length;

        const valorPendente = (contrRes.data || [])
          .filter((c: any) => ["pendente", "parcial", "vencido"].includes(c.status))
          .reduce((sum: number, c: any) => sum + (Number(c.valor_contratado || 0) - Number(c.valor_pago || 0)), 0);

        const tarefasAbertas = (tarefRes.data || []).filter(
          (t: any) => ["a_fazer", "em_andamento", "aguardando_terceiro"].includes(t.status)
        ).length;

        setExtraStats({ fornecedoresConfirmados, valorPendente, tarefasAbertas });
      }

      setLoading(false);
    }
    carregar();
  }, []);

  // ── métricas derivadas ───────────────────────────────────────────────────────
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const eventosDoMes = eventos.filter((e) => {
    const d = diaInicio(e); return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const realizados   = eventosDoMes.filter((e) => { const d = diaInicio(e); return d && d < hoje; });
  const aRealizar    = eventosDoMes.filter((e) => { const d = diaInicio(e); return d && d >= hoje; });
  const ativos       = eventos.filter((e) => e.ativo !== false);

  const confirmados  = convidados.filter((c) => normalizeRsvp(c.status_rsvp) === "confirmado").length;
  const pendentes    = convidados.filter((c) => normalizeRsvp(c.status_rsvp) === "pendente").length;
  const recusados    = convidados.filter((c) => normalizeRsvp(c.status_rsvp) === "nao").length;
  const checkins     = convidados.filter((c) => normalizeCheckin(c.status_checkin) === "entrou").length;
  const rsvpMedio    = convidados.length > 0 ? Math.round((confirmados / convidados.length) * 100) : 0;
  const taxaCheckin  = confirmados > 0 ? Math.round((checkins / confirmados) * 100) : 0;
  const eventosAno   = eventos.filter((e) => { const d = diaInicio(e); return d && d.getFullYear() === anoAtual; }).length;

  const proximoEvento = eventos
    .filter((e) => { const d = diaInicio(e); return d && d >= hoje; })
    .sort((a, b) => (diaInicio(a)!.getTime()) - (diaInicio(b)!.getTime()))[0];
  const diasRestantes = proximoEvento
    ? Math.ceil((diaInicio(proximoEvento)!.getTime() - hoje.getTime()) / 86400000)
    : null;

  const atividadeRecente = convidados
    .filter((c) => normalizeRsvp(c.status_rsvp) === "confirmado" || normalizeCheckin(c.status_checkin) === "entrou")
    .slice(0, 6);

  // ── personalização ───────────────────────────────────────────────────────────
  function abrirPersonalizacao() {
    setDraft([...cardsAtivos]);
    setPersonalizando(true);
  }
  function toggleDraft(id: CardId) {
    setDraft((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function salvarPersonalizacao() {
    const ordenados = TODOS_CARDS.map((c) => c.id).filter((id) => draft.includes(id)) as CardId[];
    setCardsAtivos(ordenados);
    localStorage.setItem(LS_KEY, JSON.stringify(ordenados));
    setPersonalizando(false);
  }

  // ── saudação ─────────────────────────────────────────────────────────────────
  const primeiroNome = perfil?.nome?.split(" ")[0] || "Cliente";
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  // ── renderizar um card ────────────────────────────────────────────────────────
  function renderCard(id: CardId) {
    switch (id) {
      case "eventos_ativos":
        return <StatCard key={id} label="Eventos ativos" value={ativos.length} color="#6d28d9" bg="#ede9fe" />;
      case "total_convidados":
        return <StatCard key={id} label="Total convidados" value={convidados.length} color="#0f766e" bg="#ccfbf1" />;
      case "confirmados":
        return <StatCard key={id} label="Confirmados" value={confirmados} color="#16a34a" bg="#dcfce7" />;
      case "pendentes":
        return <StatCard key={id} label="Pendentes" value={pendentes} color="#f59e0b" bg="#fef3c7" />;
      case "checkins":
        return <StatCard key={id} label="Check-ins" value={checkins} color="#2563eb" bg="#dbeafe" />;
      case "realizados":
        return <StatCard key={id} label="Realizados" value={realizados.length} color="#64748b" bg="#f1f5f9" detail="eventos já ocorridos" />;
      case "a_realizar":
        return <StatCard key={id} label="A realizar" value={aRealizar.length} color="#0891b2" bg="#e0f2fe" detail="eventos futuros" />;
      case "rsvp_medio":
        return <StatCard key={id} label="RSVP médio" value={`${rsvpMedio}%`} color="#7c3aed" bg="#f3e8ff" detail="confirmados / convidados" />;
      case "recusados":
        return <StatCard key={id} label="Recusados" value={recusados} color="#dc2626" bg="#fee2e2" detail="disseram que não virão" />;
      case "taxa_checkin":
        return <StatCard key={id} label="Taxa de check-in" value={`${taxaCheckin}%`} color="#0891b2" bg="#e0f2fe" detail="dos confirmados já entraram" />;
      case "eventos_ano":
        return <StatCard key={id} label="Eventos este ano" value={eventosAno} color="#64748b" bg="#f1f5f9" detail={`em ${anoAtual}`} />;
      case "fornecedores":
        return <StatCard key={id} label="Fornecedores" value={extraStats.fornecedoresConfirmados} color="#0d9488" bg="#ccfbf1" detail="contratos fechados" />;
      case "financeiro":
        return (
          <div key={id} style={cardBoxStyle}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, fontSize: 14, color: "#d97706" }}>●</div>
            <strong style={{ display: "block", fontSize: 22, fontWeight: 900, color: "#d97706", lineHeight: 1, marginBottom: 4 }}>
              {extraStats.valorPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </strong>
            <p style={cardLabelStyle}>Pendências financeiras</p>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 11 }}>valor ainda não pago</p>
          </div>
        );
      case "tarefas":
        return <StatCard key={id} label="Tarefas abertas" value={extraStats.tarefasAbertas} color="#7c3aed" bg="#ede9fe" detail="ações de produção em andamento" />;
      case "proximo_evento":
        return (
          <div key={id} style={cardBoxStyle}>
            <p style={cardLabelStyle}>Próximo evento</p>
            {proximoEvento ? (
              <>
                <strong style={{ fontSize: 28, fontWeight: 900, color: "#6d28d9", lineHeight: 1 }}>
                  {diasRestantes === 0 ? "Hoje!" : `${diasRestantes}d`}
                </strong>
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0", fontWeight: 700 }}>
                  {proximoEvento.nome?.trim() || "Evento"} · {formatData(proximoEvento.data_inicio || proximoEvento.data_evento)}
                </p>
              </>
            ) : (
              <strong style={{ fontSize: 28, color: "var(--muted)" }}>--</strong>
            )}
          </div>
        );
      case "atividade_recente":
        return (
          <div key={id} style={{ ...cardBoxStyle, gridColumn: "span 2", minWidth: 0 }}>
            <p style={{ ...cardLabelStyle, marginBottom: 12 }}>Atividade recente</p>
            {atividadeRecente.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhuma confirmação recente.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {atividadeRecente.map((c) => {
                  const ck = normalizeCheckin(c.status_checkin) === "entrou";
                  const dataHora = formatDataHora(c.data_hora_rsvp || c.data_resposta || c.created_at);
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{ck ? "✅" : "✓"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 14, color: "var(--text)", display: "block" }}>{c.nome || "Convidado"}</strong>
                        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{ck ? "Check-in realizado" : "RSVP confirmado"}</span>
                      </div>
                      {dataHora && (
                        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {dataHora}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      default: return null;
    }
  }

  if (loading) return <div style={{ padding: 40, color: "var(--muted)", fontWeight: 700 }}>Carregando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Modal de personalização */}
      {personalizando && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--text)" }}>Personalizar início</h2>
              <button onClick={() => setPersonalizando(false)} style={btnFecharStyle}>✕</button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
              Escolha quais cards aparecem na sua página inicial.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {TODOS_CARDS.map((card) => {
                const ativo = draft.includes(card.id);
                return (
                  <label key={card.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, border: `1.5px solid ${ativo ? "#6d28d9" : "var(--line)"}`, background: ativo ? "rgba(109,40,217,0.05)" : "var(--card)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={() => toggleDraft(card.id)}
                      style={{ width: 18, height: 18, accentColor: "#6d28d9" }}
                    />
                    <div>
                      <strong style={{ color: "var(--text)", fontSize: 14 }}>{card.label}</strong>
                      <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>{card.descricao}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={salvarPersonalizacao} style={{ flex: 1, background: "#6d28d9", color: "#fff", border: "none", borderRadius: 13, padding: "13px", fontWeight: 900, cursor: "pointer", fontSize: 15 }}>
                Salvar
              </button>
              <button onClick={() => setPersonalizando(false)} style={{ flex: 1, background: "none", border: "1px solid var(--line)", borderRadius: 13, padding: "13px", fontWeight: 800, cursor: "pointer", color: "var(--muted)", fontSize: 15 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boas-vindas */}
      <section style={heroStyle}>
        <div>
          <p style={saudacaoStyle}>{saudacao}, {primeiroNome} 👋</p>
          <h1 style={tituloStyle}>Bem-vindo ao OmniStage</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>Sua plataforma para criar e gerenciar eventos.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={abrirPersonalizacao} style={btnSecStyle}>⚙️ Personalizar</button>
          <Link href="/app/eventos" style={btnPrimaryStyle}>+ Criar evento</Link>
        </div>
      </section>

      {/* Grid de cards personalizáveis */}
      {cardsAtivos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 20px", border: "1.5px dashed var(--line)", borderRadius: 18, color: "var(--muted)" }}>
          <p style={{ margin: "0 0 12px" }}>Nenhum card selecionado.</p>
          <button onClick={abrirPersonalizacao} style={btnPrimaryStyle}>Personalizar início</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {cardsAtivos.map((id) => renderCard(id))}
        </div>
      )}

      {/* Seus eventos */}
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={sectionTitleStyle}>Seus eventos</h2>
          <Link href="/app/eventos" style={{ color: "#6d28d9", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>Ver todos →</Link>
        </div>
        {eventos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 20px", border: "1.5px dashed var(--line)", borderRadius: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 17, margin: "0 0 8px", color: "var(--text)" }}>Nenhum evento ainda</p>
            <p style={{ color: "var(--muted)", margin: "0 0 18px" }}>Crie seu primeiro evento e comece a gerenciar convidados, RSVP e check-in.</p>
            <Link href="/app/eventos" style={btnPrimaryStyle}>Criar meu primeiro evento</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {eventos.slice(0, 5).map((ev) => {
              const cvs = convidados.filter((c) => c.evento_id === ev.id);
              const evConf  = cvs.filter((c) => normalizeRsvp(c.status_rsvp) === "confirmado").length;
              const evPend  = cvs.filter((c) => normalizeRsvp(c.status_rsvp) === "pendente").length;
              const evCk    = cvs.filter((c) => normalizeCheckin(c.status_checkin) === "entrou").length;
              const diaEv   = diaInicio(ev);
              const dias    = diaEv ? Math.ceil((diaEv.getTime() - hoje.getTime()) / 86400000) : null;
              const passou  = dias !== null && dias < 0;
              const ehHoje  = dias === 0;

              let badgeLabel = "";
              let badgeColor = "#6d28d9";
              let badgeBg    = "#ede9fe";
              if (passou)       { badgeLabel = "Realizado";        badgeColor = "#64748b"; badgeBg = "#f1f5f9"; }
              else if (ehHoje)  { badgeLabel = "Hoje!";            badgeColor = "#16a34a"; badgeBg = "#dcfce7"; }
              else if (dias !== null && dias <= 7)  { badgeLabel = `${dias}d`;  badgeColor = "#d97706"; badgeBg = "#fef3c7"; }
              else if (dias !== null)               { badgeLabel = `${dias}d`;  badgeColor = "#6d28d9"; badgeBg = "#ede9fe"; }

              return (
                <Link key={ev.id} href={`/app/dashboard?eventoId=${ev.id}`} style={eventoCardStyle}>
                  {/* linha superior: nome + badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div>
                      <strong style={{ color: "var(--text)", fontWeight: 900, fontSize: 17 }}>
                        {ev.nome?.trim() || "Evento sem nome"}
                      </strong>
                      {(ev.data_inicio || ev.data_evento) && (
                        <span style={{ color: "var(--muted)", fontSize: 15, marginLeft: 8 }}>
                          {formatData(ev.data_inicio || ev.data_evento)}
                          {ev.hora_inicio ? ` · ${ev.hora_inicio.slice(0,5)}` : ""}
                        </span>
                      )}
                    </div>
                    {badgeLabel && (
                      <span style={{ background: badgeBg, color: badgeColor, fontWeight: 900, fontSize: 14, padding: "4px 12px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {ehHoje ? "🎉 Hoje!" : passou ? "✓ Realizado" : `⏳ ${badgeLabel}`}
                      </span>
                    )}
                  </div>

                  {/* linha inferior: métricas */}
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <MetricPill emoji="👥" label="Convidados" value={cvs.length} color="var(--muted)" />
                    <MetricPill emoji="✅" label="Confirmados" value={evConf} color="#16a34a" />
                    {evPend > 0 && <MetricPill emoji="⏳" label="Pendentes" value={evPend} color="#f59e0b" />}
                    {evCk > 0   && <MetricPill emoji="🚪" label="Check-ins" value={evCk}  color="#2563eb" />}
                    {evPend === 0 && evCk === 0 && cvs.length === 0 && (
                      <span style={{ fontSize: 14, color: "var(--muted)", fontStyle: "italic" }}>Sem convidados cadastrados</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Atalhos rápidos */}
      <section>
        <h2 style={sectionTitleStyle}>Acesso rápido</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Eventos",       href: "/app/eventos",       emoji: "🎉" },
            { label: "Convidados",    href: "/app/convidados",    emoji: "👥" },
            { label: "Dashboard",     href: "/app/dashboard",     emoji: "📊" },
            { label: "Convite Digital",href: "/app/convite",      emoji: "✉️" },
            { label: "Check-in",      href: "/app/checkin",       emoji: "✅" },
            { label: "RSVP",          href: "/app/rsvp",          emoji: "📋" },
            { label: "Organização",   href: "/app/organizacao",   emoji: "📁" },
            { label: "Calendário",    href: "/app/calendario",    emoji: "📅" },
          ].map((a) => (
            <Link key={a.href} href={a.href} style={atalhoCardStyle}>
              <span style={{ fontSize: 24, marginBottom: 8, display: "block" }}>{a.emoji}</span>
              <strong style={{ color: "var(--text)", fontWeight: 900, fontSize: 13 }}>{a.label}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── sub-componente MetricPill ────────────────────────────────────────────────
function MetricPill({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <strong style={{ fontSize: 15, fontWeight: 900, color }}>{value}</strong>
      <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// ─── sub-componente StatCard ──────────────────────────────────────────────────
function StatCard({ label, value, color, bg, detail }: { label: string; value: number | string; color: string; bg: string; detail?: string }) {
  return (
    <div style={cardBoxStyle}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, fontSize: 14, color }}>●</div>
      <strong style={{ display: "block", fontSize: 30, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{value}</strong>
      <p style={cardLabelStyle}>{label}</p>
      {detail && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 11 }}>{detail}</p>}
    </div>
  );
}

// ─── estilos ──────────────────────────────────────────────────────────────────
const heroStyle: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24,
  padding: "28px 26px", display: "flex", justifyContent: "space-between",
  alignItems: "center", gap: 16, flexWrap: "wrap",
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
};
const saudacaoStyle: React.CSSProperties = {
  margin: "0 0 4px", color: "#6d28d9", fontWeight: 800, fontSize: 13,
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const tituloStyle: React.CSSProperties = {
  margin: "0 0 6px", fontSize: 28, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.03em",
};
const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-block", background: "#6d28d9", color: "#fff",
  padding: "12px 20px", borderRadius: 13, fontWeight: 900, textDecoration: "none",
  border: "none", cursor: "pointer", fontSize: 14, whiteSpace: "nowrap",
};
const btnSecStyle: React.CSSProperties = {
  display: "inline-block", background: "none", color: "var(--text)",
  padding: "12px 18px", borderRadius: 13, fontWeight: 800, textDecoration: "none",
  border: "1px solid var(--line)", cursor: "pointer", fontSize: 14, whiteSpace: "nowrap",
};
const cardBoxStyle: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20,
  padding: "20px 18px", boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
};
const cardLabelStyle: React.CSSProperties = {
  margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700,
};
const cardStyle: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: 22,
  padding: 22, boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
};
const sectionTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: 17, fontWeight: 900, color: "var(--text)",
};
const eventoItemStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "13px 15px", borderRadius: 13, border: "1px solid var(--line)",
  textDecoration: "none", background: "rgba(109,40,217,0.02)", gap: 12,
};
const eventoCardStyle: React.CSSProperties = {
  display: "block", padding: "16px 18px", borderRadius: 16,
  border: "1px solid var(--line)", textDecoration: "none",
  background: "var(--card)", transition: "box-shadow 140ms ease",
  boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
};
const atalhoCardStyle: React.CSSProperties = {
  display: "block", background: "var(--card)", border: "1px solid var(--line)",
  borderRadius: 16, padding: "16px 14px", textDecoration: "none",
  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
};
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
  backdropFilter: "blur(6px)", zIndex: 9000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalStyle: React.CSSProperties = {
  background: "var(--card)", borderRadius: 24, padding: "28px 26px",
  width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
};
const btnFecharStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 20, color: "var(--muted)", lineHeight: 1,
};
