"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  total: number;
  confirmados: number;
  pendentes: number;
  entradas: number;
  restantes: number;
  ausentes: number;
  criancas: number;
  criancasViaResponsavel: number;
  contatosPrincipais: number;
  enviosGrupo: number;
};

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
  crianca?: string | null;
  mae?: string | null;
  responsavel?: string | null;
  responsavel_telefone?: string | null;
  idade_crianca?: number | string | null;
  contato_principal?: boolean | null;
  recebe_convite?: boolean | null;
  tipo_convite?: string | null;
  observacoes?: string | null;
  status_rsvp: string | null;
  status_envio?: string | null;
  status_checkin: string | null;
  token?: string | null;
  created_at?: string | null;
  data_hora_rsvp?: string | null;
  data_resposta?: string | null;
  data_hora_checkin?: string | null;
};

type FiltroStatus =
  | "todos"
  | "confirmados"
  | "pendentes"
  | "entraram"
  | "faltam"
  | "nao"
  | "criancas"
  | "criancas_responsavel"
  | "contato_principal"
  | "recebe_convite"
  | "grupo"
  | "individual";
type ModoVisualizacao = "grupo" | "individual";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmados: 0,
    pendentes: 0,
    entradas: 0,
    restantes: 0,
    ausentes: 0,
    criancas: 0,
    criancasViaResponsavel: 0,
    contatosPrincipais: 0,
    enviosGrupo: 0,
  });

  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>("grupo");
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [convidadosAbertos, setConvidadosAbertos] = useState<Record<string, boolean>>({});
  const [modoAoVivo, setModoAoVivo] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("--:--");
  const [pulseLive, setPulseLive] = useState(false);
  const statsAnteriorRef = useRef<Stats | null>(null);

  async function carregarDashboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select("*")
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar dashboard: " + error.message);
      setLoading(false);
      return;
    }

    const lista = (data || []) as Convidado[];

    const total = lista.length;
    const confirmados = lista.filter((c) => c.status_rsvp === "confirmado").length;
    const pendentes = lista.filter((c) => c.status_rsvp === "pendente").length;
    const entradas = lista.filter((c) => c.status_checkin === "entrou").length;
    const ausentes = lista.filter((c) => c.status_rsvp === "nao").length;
    const criancas = lista.filter((c) => convidadoEhCrianca(c)).length;
    const criancasViaResponsavel = lista.filter((c) =>
      convidadoEhCriancaViaResponsavel(c, lista)
    ).length;
    const contatosPrincipais = lista.filter((c) => {
      const temGrupo = Boolean((c.grupo || "").trim());
      return temGrupo && c.tipo_convite !== "individual" && Boolean(c.contato_principal);
    }).length;
    const enviosGrupo = lista.filter((c) => Boolean(c.recebe_convite)).length;
    const restantes = Math.max(confirmados - entradas, 0);

    const novasStats = {
      total,
      confirmados,
      pendentes,
      entradas,
      restantes,
      ausentes,
      criancas,
      criancasViaResponsavel,
      contatosPrincipais,
      enviosGrupo,
    };
    const statsAnterior = statsAnteriorRef.current;

    if (
      statsAnterior &&
      (statsAnterior.entradas !== entradas ||
        statsAnterior.confirmados !== confirmados ||
        statsAnterior.pendentes !== pendentes ||
        statsAnterior.ausentes !== ausentes ||
        statsAnterior.criancas !== criancas ||
        statsAnterior.enviosGrupo !== enviosGrupo)
    ) {
      setPulseLive(true);
      window.setTimeout(() => setPulseLive(false), 900);
    }

    statsAnteriorRef.current = novasStats;
    setConvidados(lista);
    setStats(novasStats);
    setUltimaAtualizacao(
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
    setLoading(false);
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  useEffect(() => {
    if (!modoAoVivo) return;

    const interval = window.setInterval(() => {
      carregarDashboard();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [modoAoVivo]);

  const percentualConfirmados =
    stats.total > 0 ? Math.round((stats.confirmados / stats.total) * 100) : 0;

  const percentualEntradas =
    stats.confirmados > 0 ? Math.round((stats.entradas / stats.confirmados) * 100) : 0;

  const percentualAusentes =
    stats.total > 0 ? Math.round((stats.ausentes / stats.total) * 100) : 0;

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return convidados.filter((c) => {
      const matchBusca = convidadoCombinaComBusca(c, termo, convidados);

      if (!matchBusca) return false;

      return convidadoCombinaComFiltro(c, filtro, convidados);
    });
  }, [convidados, filtro, busca]);

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapaCompleto = new Map<string, Convidado[]>();

    convidados.forEach((c) => {
      const grupo = (c.grupo || "").trim() ? normalizarGrupo(c.grupo) : `__individual__${c.id}`;
      const lista = mapaCompleto.get(grupo) || [];
      lista.push(c);
      mapaCompleto.set(grupo, lista);
    });

    return Array.from(mapaCompleto.entries())
      .map(([grupo, listaCompleta]) => {
        const grupoCombinaComBusca =
          !termo ||
          listaCompleta.some((convidado) => convidadoCombinaComBusca(convidado, termo, convidados));

        if (!grupoCombinaComBusca) {
          return null;
        }

        const lista = listaCompleta
          .filter((convidado) => convidadoCombinaComFiltro(convidado, filtro, convidados))
          .sort(ordenarPorTelefoneDepoisNome);

        if (lista.length === 0) {
          return null;
        }

        return { grupo, lista };
      })
      .filter(Boolean) as { grupo: string; lista: Convidado[] }[];
  }, [convidados, filtro, busca]);

  const totalItensExibidos = modoVisualizacao === "grupo"
    ? grupos.reduce((total, grupo) => total + grupo.lista.length, 0)
    : convidadosFiltrados.length;

  const cards = [
    {
      label: "Total de convidados",
      value: stats.total,
      detail: "Base completa do evento",
      color: "#6d28d9",
      bg: "#ede9fe",
    },
    {
      label: "Crianças",
      value: stats.criancas,
      detail: "Convidados marcados como criança",
      color: "#9333ea",
      bg: "#f3e8ff",
    },
    {
      label: "Via responsável",
      value: stats.criancasViaResponsavel,
      detail: "Convite enviado ao responsável",
      color: "#be185d",
      bg: "#fce7f3",
    },
    {
      label: "Contatos principais",
      value: stats.contatosPrincipais,
      detail: "Pessoas que representam o grupo",
      color: "#7c3aed",
      bg: "#ede9fe",
    },
    {
      label: "Recebem convite",
      value: stats.enviosGrupo,
      detail: "Destinatários de envio por WhatsApp",
      color: "#0f766e",
      bg: "#ccfbf1",
    },
    {
      label: "Confirmados",
      value: stats.confirmados,
      detail: `${percentualConfirmados}% da lista`,
      color: "#16a34a",
      bg: "#dcfce7",
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      detail: "Aguardando resposta",
      color: "#f59e0b",
      bg: "#fef3c7",
    },
    {
      label: "Ausência confirmada",
      value: stats.ausentes,
      detail: `${percentualAusentes}% da lista`,
      color: "#dc2626",
      bg: "#fee2e2",
    },
    {
      label: "Entradas",
      value: stats.entradas,
      detail: `${percentualEntradas}% dos confirmados`,
      color: "#2563eb",
      bg: "#dbeafe",
    },
    {
      label: "No-show atual",
      value: stats.restantes,
      detail: "Confirmados que ainda não entraram",
      color: "#7c3aed",
      bg: "#ede9fe",
    },
    {
      label: "Presença real",
      value: stats.entradas,
      detail: "Check-ins realizados",
      color: "#059669",
      bg: "#d1fae5",
    },
    {
      label: "Total para buffet",
      value: stats.confirmados,
      detail: "Base operacional: confirmados",
      color: "#0f172a",
      bg: "#e2e8f0",
    },
  ];

  const tabs: { key: FiltroStatus; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "confirmados", label: "Confirmados" },
    { key: "pendentes", label: "Pendentes" },
    { key: "criancas", label: "Crianças" },
    { key: "criancas_responsavel", label: "Via responsável" },
    { key: "contato_principal", label: "Contato principal" },
    { key: "recebe_convite", label: "Recebe convite" },
    { key: "entraram", label: "Entraram" },
    { key: "faltam", label: "Faltam entrar" },
    { key: "nao", label: "Ausência confirmada" },
  ];

  function toggleGrupo(grupo: string) {
    setGruposAbertos((current) => ({ ...current, [grupo]: !current[grupo] }));
  }

  function abrirTodosGrupos() {
    const aberto: Record<string, boolean> = {};
    grupos.forEach(({ grupo }) => {
      aberto[grupo] = true;
    });
    setGruposAbertos(aberto);
  }

  function fecharTodosGrupos() {
    setGruposAbertos({});
    setConvidadosAbertos({});
  }

  function toggleConvidado(id: string) {
    setConvidadosAbertos((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes groupReveal {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.985);
            max-height: 0;
            filter: blur(2px);
          }
          70% {
            opacity: 1;
            transform: translateY(1px) scale(1.002);
            max-height: 1200px;
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            max-height: 1200px;
            filter: blur(0);
          }
        }

        @keyframes guestReveal {
          0% {
            opacity: 0;
            transform: translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .omni-group-card {
          transition:
            transform 180ms cubic-bezier(.2,.8,.2,1),
            box-shadow 180ms cubic-bezier(.2,.8,.2,1),
            border-color 180ms ease,
            background 180ms ease !important;
          will-change: transform;
        }

        .omni-group-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08) !important;
          border-color: rgba(109, 40, 217, 0.22) !important;
          background: #f8fafc !important;
        }

        .omni-group-card:active {
          transform: translateY(0) scale(0.996) !important;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06) !important;
          background: #f1f5f9 !important;
        }

        .omni-group-header {
          transition:
            background 180ms ease,
            transform 180ms cubic-bezier(.2,.8,.2,1) !important;
        }

        .omni-group-card:hover .omni-group-header {
          background: #f1f5f9 !important;
        }

        .omni-group-card:active .omni-group-header {
          background: #e2e8f0 !important;
        }

        .omni-group-body {
          animation: groupReveal 280ms cubic-bezier(.2,.8,.2,1) both !important;
          transform-origin: top;
          overflow: hidden;
        }

        .omni-guest-card {
          transition:
            transform 160ms cubic-bezier(.2,.8,.2,1),
            box-shadow 160ms ease,
            border-color 160ms ease,
            background 160ms ease !important;
          animation: guestReveal 220ms cubic-bezier(.2,.8,.2,1) both !important;
          will-change: transform;
        }

        .omni-guest-card:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07) !important;
          border-color: rgba(148,163,184,0.3) !important;
          background: #f9fafb !important;
        }

        .omni-guest-card:active {
          transform: scale(0.996) !important;
          background: #f1f5f9 !important;
        }

        .omni-chevron {
          display: inline-flex;
          transition:
            transform 190ms cubic-bezier(.2,.8,.2,1),
            opacity 180ms ease !important;
        }

        .omni-group-card:hover .omni-chevron,
        .omni-guest-card:hover .omni-chevron {
          opacity: 1 !important;
          transform: translateY(-1px) !important;
        }

        .omni-live-pulse article {
          animation: livePulse 850ms ease both;
        }

        @keyframes livePulse {
          0% {
            transform: scale(1);
            box-shadow: 0 14px 40px rgba(15,23,42,0.05);
          }
          35% {
            transform: scale(1.015);
            box-shadow: 0 20px 55px rgba(109,40,217,0.16);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 14px 40px rgba(15,23,42,0.05);
          }
        }

        @keyframes liveDotPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(22,163,74,0.45);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(22,163,74,0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(22,163,74,0);
          }
        }

        button:focus-visible,
        a:focus-visible {
          outline: 3px solid rgba(109, 40, 217, 0.22);
          outline-offset: 3px;
        }
      `}</style>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage Dashboard</span>
          <h1 style={titleStyle}>Visão geral do evento</h1>
          <p style={subtitleStyle}>
            Acompanhe confirmações, pendências e entradas em tempo real.
          </p>
        </div>

        <div style={liveActionsStyle}>
          <div style={liveStatusStyle}>
            <span style={modoAoVivo ? liveDotActiveStyle : liveDotPausedStyle} />
            <span>{modoAoVivo ? "Ao vivo" : "Pausado"}</span>
            <small style={liveTimeStyle}>Atualizado às {ultimaAtualizacao}</small>
          </div>

          <button
            onClick={() => setModoAoVivo((current) => !current)}
            style={modoAoVivo ? liveToggleActiveStyle : liveToggleStyle}
          >
            {modoAoVivo ? "Pausar ao vivo" : "Ativar ao vivo"}
          </button>

          <button onClick={carregarDashboard} style={refreshButtonStyle}>
            {loading ? "Atualizando..." : "Atualizar agora"}
          </button>
        </div>
      </section>

      <section className={pulseLive ? "omni-live-pulse" : ""} style={gridStyle}>
        {cards.map((card) => (
          <article key={card.label} style={metricCardStyle}>
            <div
              style={{
                ...iconBubbleStyle,
                background: card.bg,
                color: card.color,
              }}
            >
              ●
            </div>

            <p style={metricLabelStyle}>{card.label}</p>

            <strong style={metricValueStyle}>{loading ? "..." : card.value}</strong>

            <p style={metricDetailStyle}>{card.detail}</p>
          </article>
        ))}
      </section>

      <section style={contentGridStyle}>
        <article style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Confirmações</h2>
              <p style={panelTextStyle}>Progresso geral de RSVP</p>
            </div>

            <strong style={percentStyle}>{percentualConfirmados}%</strong>
          </div>

          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressBarStyle,
                width: `${percentualConfirmados}%`,
                background: "#6d28d9",
              }}
            />
          </div>

          <div style={miniStatsStyle}>
            <span>{stats.confirmados} confirmados</span>
            <span>{stats.pendentes} pendentes</span>
            <span>{stats.ausentes} ausências</span>
            <span>{stats.criancas} crianças</span>
          </div>
        </article>

        <article style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Check-in</h2>
              <p style={panelTextStyle}>Entradas realizadas no evento</p>
            </div>

            <strong style={percentStyle}>{percentualEntradas}%</strong>
          </div>

          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressBarStyle,
                width: `${percentualEntradas}%`,
                background: "#16a34a",
              }}
            />
          </div>

          <div style={miniStatsStyle}>
            <span>{stats.entradas} entradas</span>
            <span>{stats.restantes} restantes</span>
          </div>
        </article>
      </section>

      <section style={largePanelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Última entrada</h2>
            <p style={panelTextStyle}>Registro mais recente do check-in</p>
          </div>

          <span style={statusPillStyle}>Ao vivo</span>
        </div>

        <div style={emptyStateStyle}>
          {modoAoVivo
            ? "Modo ao vivo ativo. O painel atualiza automaticamente a cada 10 segundos."
            : "Modo ao vivo pausado. Use Atualizar agora para buscar os dados mais recentes."}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Convidados</h2>
            <p style={panelTextStyle}>
              Filtre, visualize por grupo ou veja os convidados individualmente.
            </p>
          </div>

          <div style={viewToggleStyle}>
            <button
              onClick={() => setModoVisualizacao("grupo")}
              style={modoVisualizacao === "grupo" ? viewToggleActiveButtonStyle : viewToggleButtonStyle}
            >
              Por grupo
            </button>
            <button
              onClick={() => setModoVisualizacao("individual")}
              style={modoVisualizacao === "individual" ? viewToggleActiveButtonStyle : viewToggleButtonStyle}
            >
              Individual
            </button>
          </div>
        </div>

        <div style={tabsStyle}>
          {tabs.map((tab) => {
            const active = filtro === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key)}
                style={active ? tabActiveStyle : tabStyle}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={searchRowStyle}>
          <input
            placeholder="Buscar por nome, responsável, criança, grupo, telefone, e-mail ou token"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={searchInputStyle}
          />

          <div style={counterStyle}>{totalItensExibidos} itens</div>
        </div>

        {modoVisualizacao === "grupo" && (
          <div style={groupActionsStyle}>
            <button onClick={abrirTodosGrupos} style={ghostButtonStyle}>Expandir todos</button>
            <button onClick={fecharTodosGrupos} style={ghostButtonStyle}>Recolher todos</button>
          </div>
        )}

        {modoVisualizacao === "grupo" ? (
          <div style={listStyle}>
            {grupos.map(({ grupo, lista }) => {
              const aberto = !!gruposAbertos[grupo];
              const isIndividual = grupo.startsWith("__individual__");
              const principal = isIndividual
                ? null
                : lista.find((c) => Boolean(c.contato_principal)) ||
                  lista.find((c) => !!normalizarTelefone(c.telefone)) ||
                  lista[0];
              const resumoGrupo = [
                `${lista.length} integrante${lista.length === 1 ? "" : "s"}`,
                contarCriancas(lista) > 0
                  ? `${contarCriancas(lista)} criança${contarCriancas(lista) === 1 ? "" : "s"}`
                  : null,
                principal?.nome
                  ? `contato principal: ${principal.nome}${principal.telefone ? ` (${principal.telefone})` : ""}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <article key={grupo} className="omni-group-card" style={groupCardStyle}>
                  <button onClick={() => toggleGrupo(grupo)} className="omni-group-header" style={groupHeaderStyle}>
                    <div style={groupHeaderTextStyle}>
                      <p style={groupTitleStyle}>
                        {!isIndividual && <span style={groupLabelStyle}>Integrantes: </span>}
                        <span style={groupNamesStyle}>{nomesIntegrantes(lista)}</span>
                      </p>
                      <p style={groupContactStyle}>{resumoGrupo}</p>
                    </div>

                    <div style={groupRightStyle}>
                      <span style={smallCountStyle}>{contarConfirmados(lista)} confirmados</span>
                      <span className="omni-chevron" style={chevronStyle}>{aberto ? "⌃" : "⌄"}</span>
                    </div>
                  </button>

                  {aberto && (
                    <div className="omni-group-body" style={groupBodyStyle}>
                      {lista.map((convidado) => (
                        <GuestCard
                          key={convidado.id}
                          convidado={convidado}
                          todosConvidados={convidados}
                          aberto={!!convidadosAbertos[convidado.id]}
                          onToggle={() => toggleConvidado(convidado.id)}
                        />
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div style={listStyle}>
            {convidadosFiltrados.map((convidado) => (
              <GuestCard
                key={convidado.id}
                convidado={convidado}
                todosConvidados={convidados}
                aberto={!!convidadosAbertos[convidado.id]}
                onToggle={() => toggleConvidado(convidado.id)}
              />
            ))}
          </div>
        )}

        {convidadosFiltrados.length === 0 && (
          <div style={emptyStateStyle}>Nenhum convidado encontrado com estes filtros.</div>
        )}
      </section>
    </div>
  );
}

function GuestCard({
  convidado,
  todosConvidados,
  aberto,
  onToggle,
}: {
  convidado: Convidado;
  todosConvidados: Convidado[];
  aberto: boolean;
  onToggle: () => void;
}) {
  const nome = convidado.nome || "Sem nome";
  const grupoOriginal = (convidado.grupo || "").trim();
  const isIndividual = !grupoOriginal || convidado.tipo_convite === "individual";
  const grupo = grupoOriginal ? normalizarGrupo(grupoOriginal) : "Individual";
  const telefoneResponsavel = convidado.responsavel_telefone?.trim() || "";
  const telefone = convidado.telefone || "Sem telefone";
  const telefoneMeta = convidado.telefone
    ? convidado.telefone
    : telefoneResponsavel
      ? `Responsável: ${telefoneResponsavel}`
      : "Sem telefone";
  const token = convidado.token || "Sem token";
  const linkCartao = gerarLinkCartao(convidado);
  const linkWhatsApp = gerarLinkWhatsApp(convidado);
  const isCrianca = convidadoEhCrianca(convidado);
  const isContatoPrincipal = !isIndividual && Boolean(convidado.contato_principal);
  const recebeConvite = Boolean(convidado.recebe_convite);
  const mae = convidado.mae?.trim() || "";
  const responsavelConvite = resolverResponsavelConvite(convidado, todosConvidados);
  const idadeCrianca = convidado.idade_crianca ? String(convidado.idade_crianca) : "";

  async function copiarNome() {
    await navigator.clipboard.writeText(nome);
    alert("Nome copiado.");
  }

  return (
    <article className="omni-guest-card" style={guestCardStyle}>
      <button onClick={onToggle} style={guestHeaderButtonStyle}>
        <div style={guestMainInfoStyle}>
          <strong style={guestNameStyle}>{nome}</strong>
          <span style={guestMetaStyle}>{grupo} • {telefoneMeta}</span>
          {(isCrianca || mae || idadeCrianca) && (
            <span style={childMetaStyle}>
              {isCrianca ? "Criança" : "Convidado"}
              {idadeCrianca ? ` · ${idadeCrianca} anos` : ""}
              {responsavelConvite
                ? ` · responsável: ${responsavelConvite}${
                    telefoneResponsavel ? ` (${telefoneResponsavel})` : ""
                  }`
                : ""}
            </span>
          )}
        </div>

        <div style={guestStatusRowStyle}>
          {isCrianca && <span style={badgeStyle("#9333ea")}>Criança</span>}
          {isContatoPrincipal && <span style={outlineBadgeStyle("#7c3aed")}>Contato principal</span>}
          {recebeConvite && <span style={outlineBadgeStyle("#0f766e")}>Recebe convite</span>}
          {convidado.status_checkin === "entrou" && <span style={badgeStyle("#2563eb")}>Entrou</span>}
          {convidado.status_rsvp === "confirmado" && <span style={badgeStyle("#16a34a")}>Confirmado</span>}
          {convidado.status_rsvp === "pendente" && <span style={badgeStyle("#f59e0b")}>Pendente</span>}
          {convidado.status_rsvp === "nao" && <span style={badgeStyle("#dc2626")}>Ausência confirmada</span>}
          <span className="omni-chevron" style={guestChevronStyle}>{aberto ? "⌃" : "⌄"}</span>
        </div>
      </button>

      {aberto && (
        <div style={guestExpandedStyle}>
          <div style={infoGridStyle}>
            <InfoBox label="Tipo" value={isIndividual ? "Individual" : "Grupo"} />
            {!isIndividual && <InfoBox label="Grupo" value={grupo} />}
            <InfoBox label="Telefone do convidado" value={telefone} />
            {telefoneResponsavel && (
              <InfoBox label="Telefone do responsável" value={telefoneResponsavel} />
            )}
            <InfoBox label="Status RSVP" value={labelRsvp(convidado.status_rsvp)} />
            <InfoBox label="Check-in" value={labelCheckin(convidado.status_checkin)} />
            <InfoBox label="E-mail" value={convidado.email || "Sem e-mail"} />
            <InfoBox label="Criança" value={isCrianca ? "Sim" : "Não"} />
            <InfoBox label="Responsável do convite" value={responsavelConvite || "Sem responsável informado"} />
            {!isIndividual && <InfoBox label="Contato principal" value={isContatoPrincipal ? "Sim" : "Não"} />}
            <InfoBox label="Recebe convite" value={recebeConvite ? "Sim" : "Não"} />
            <InfoBox label="Idade da criança" value={idadeCrianca || "Não informada"} />
            <InfoBox label="Token" value={token} />
          </div>

          {(convidado.observacoes || convidado.data_hora_rsvp || convidado.data_resposta) && (
            <div style={detailsTextStyle}>
              {convidado.data_hora_rsvp || convidado.data_resposta ? (
                <p style={{ margin: 0 }}>
                  Confirmação: {convidado.data_hora_rsvp || convidado.data_resposta}
                </p>
              ) : null}
              {convidado.observacoes ? <p style={{ margin: "6px 0 0" }}>{convidado.observacoes}</p> : null}
            </div>
          )}

          <div style={quickActionsStyle}>
            <button onClick={copiarNome} style={actionButtonStyle}>Copiar nome</button>
            {linkWhatsApp ? (
              <a href={linkWhatsApp} target="_blank" rel="noreferrer" style={actionButtonStyle}>
                WhatsApp
              </a>
            ) : (
              <button disabled style={{ ...actionButtonStyle, opacity: 0.45, cursor: "not-allowed" }}>
                WhatsApp
              </button>
            )}
            <a href={linkCartao} target="_blank" rel="noreferrer" style={actionButtonStyle}>
              Ver cartão
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBoxStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={infoValueStyle}>{value}</strong>
    </div>
  );
}

function convidadoCombinaComBusca(convidado: Convidado, termo: string, todosConvidados: Convidado[]) {
  if (!termo) return true;

  return [
    convidado.nome,
    convidado.grupo,
    convidado.telefone,
    convidado.email,
    convidado.token,
    convidado.mae,
    convidado.responsavel,
    convidado.responsavel_telefone,
    convidado.crianca,
    convidado.idade_crianca,
    resolverResponsavelConvite(convidado, todosConvidados),
    convidado.contato_principal ? "contato principal" : "",
    convidado.recebe_convite ? "recebe convite" : "",
  ]
    .filter(Boolean)
    .some((valor) => String(valor).toLowerCase().includes(termo));
}

function convidadoCombinaComFiltro(convidado: Convidado, filtro: FiltroStatus, todosConvidados: Convidado[]) {
  if (filtro === "todos") return true;
  if (filtro === "confirmados") return convidado.status_rsvp === "confirmado";
  if (filtro === "pendentes") return convidado.status_rsvp === "pendente";
  if (filtro === "criancas") return convidadoEhCrianca(convidado);
  if (filtro === "criancas_responsavel") {
    return convidadoEhCriancaViaResponsavel(convidado, todosConvidados);
  }
  if (filtro === "grupo") return Boolean((convidado.grupo || "").trim());
  if (filtro === "individual") return !Boolean((convidado.grupo || "").trim());
  if (filtro === "contato_principal") {
    return Boolean((convidado.grupo || "").trim()) &&
      convidado.tipo_convite !== "individual" &&
      Boolean(convidado.contato_principal);
  }
  if (filtro === "recebe_convite") return Boolean(convidado.recebe_convite);
  if (filtro === "entraram") return convidado.status_checkin === "entrou";
  if (filtro === "faltam") {
    return convidado.status_rsvp === "confirmado" && convidado.status_checkin !== "entrou";
  }
  if (filtro === "nao") return convidado.status_rsvp === "nao";

  return true;
}


function resolverResponsavelConvite(convidado: Convidado, todosConvidados: Convidado[]) {
  const responsavelInformado = convidado.responsavel?.trim() || convidado.mae?.trim();

  if (responsavelInformado) {
    return responsavelInformado;
  }

  const grupoOriginal = (convidado.grupo || "").trim();

  if (!grupoOriginal || convidado.tipo_convite === "individual") {
    return null;
  }

  const integrantesGrupo = todosConvidados.filter(
    (item) => normalizarGrupo(item.grupo) === normalizarGrupo(grupoOriginal),
  );

  const contatoPrincipal = integrantesGrupo.find((item) => Boolean(item.contato_principal));

  if (contatoPrincipal?.nome?.trim()) {
    return contatoPrincipal.nome.trim();
  }

  const primeiroComTelefone = integrantesGrupo.find((item) => Boolean(normalizarTelefone(item.telefone)));

  if (primeiroComTelefone?.nome?.trim()) {
    return primeiroComTelefone.nome.trim();
  }

  return null;
}


function convidadoEhCriancaViaResponsavel(convidado: Convidado, todosConvidados: Convidado[]) {
  const grupoOriginal = (convidado.grupo || "").trim();
  const integrantesGrupo = grupoOriginal
    ? todosConvidados.filter((item) => normalizarGrupo(item.grupo) === normalizarGrupo(grupoOriginal))
    : todosConvidados.filter((item) => item.id === convidado.id);

  const temResponsavelInformado = Boolean(
    convidado.responsavel?.trim() || convidado.mae?.trim()
  );

  return (
    convidadoEhCrianca(convidado) &&
    temResponsavelInformado &&
    integrantesGrupo.length === 1
  );
}

function normalizarTextoChave(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function convidadoEhCrianca(convidado: Convidado) {
  const crianca = normalizarTextoChave(convidado.crianca);
  return (
    crianca === "sim" ||
    crianca === "s" ||
    crianca === "true" ||
    Boolean(convidado.mae?.trim()) ||
    Boolean(convidado.responsavel?.trim()) ||
    Boolean(convidado.idade_crianca)
  );
}

function contarCriancas(lista: Convidado[]) {
  return lista.filter((c) => convidadoEhCrianca(c)).length;
}

function normalizarGrupo(grupo: string | null | undefined) {
  const texto = (grupo || "").trim().replace(/\s+/g, "_");
  return texto || "Sem grupo";
}

function normalizarTelefone(telefone: string | null | undefined) {
  return (telefone || "").replace(/\D/g, "");
}

function ordenarPorTelefoneDepoisNome(a: Convidado, b: Convidado) {
  const telefoneA = normalizarTelefone(a.telefone) ? 0 : 1;
  const telefoneB = normalizarTelefone(b.telefone) ? 0 : 1;

  if (telefoneA !== telefoneB) return telefoneA - telefoneB;

  return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function nomesIntegrantes(lista: Convidado[]) {
  return lista
    .map((convidado) => convidado.nome?.trim())
    .filter(Boolean)
    .join(" · ");
}

function contarConfirmados(lista: Convidado[]) {
  return lista.filter((c) => c.status_rsvp === "confirmado").length;
}

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Ausência confirmada";
  return "Pendente";
}

function labelCheckin(status: string | null) {
  if (status === "entrou") return "Entrou";
  return "Não entrou";
}

function gerarLinkCartao(convidado: Convidado) {
  const nome = encodeURIComponent(convidado.nome || "");
  const token = encodeURIComponent(convidado.token || "");
  return `https://omnistageproducoes.com.br/valentinaxv/cartao/?nome=${nome}&token=${token}`;
}

function gerarLinkWhatsApp(convidado: Convidado) {
  const telefone = normalizarTelefone(convidado.telefone);
  if (!telefone) return "";

  const linkCartao = gerarLinkCartao(convidado);
  const mensagem = `Olá ${convidado.nome || ""} ✨\n\nSegue o cartão de entrada:\n${linkCartao}`;

  return `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: color,
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function outlineBadgeStyle(color: string): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${color}33`,
    background: `${color}12`,
    color,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const heroStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 24,
  padding: 28,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontWeight: 800,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 8px",
  fontSize: 34,
  fontWeight: 900,
  color: "var(--text)",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--muted)",
  fontSize: 16,
};

const refreshButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#6d28d9",
  color: "#fff",
  padding: "13px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const liveActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const liveStatusStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.78)",
  border: "1px solid var(--line)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 900,
};

const liveDotActiveStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: 999,
  background: "#16a34a",
  animation: "liveDotPulse 1.4s infinite",
};

const liveDotPausedStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: 999,
  background: "#94a3b8",
};

const liveTimeStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontWeight: 800,
};

const liveToggleStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  padding: "13px 18px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const liveToggleActiveStyle: React.CSSProperties = {
  ...liveToggleStyle,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid rgba(22,163,74,0.22)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
};

const iconBubbleStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
  fontSize: 18,
};

const metricLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 700,
};

const metricValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 36,
  fontWeight: 900,
  color: "var(--text)",
};

const metricDetailStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--muted)",
  fontSize: 13,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
};

const largePanelStyle: React.CSSProperties = {
  ...panelStyle,
  minHeight: 180,
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "var(--text)",
};

const panelTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
};

const percentStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontSize: 24,
  fontWeight: 900,
};

const progressTrackStyle: React.CSSProperties = {
  width: "100%",
  height: 10,
  background: "#e2e8f0",
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 24,
};

const progressBarStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

const miniStatsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 14,
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 700,
};

const statusPillStyle: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#16a34a",
  fontSize: 12,
  fontWeight: 900,
};

const emptyStateStyle: React.CSSProperties = {
  marginTop: 24,
  border: "1px dashed var(--line)",
  borderRadius: 16,
  padding: 22,
  color: "var(--muted)",
};

const viewToggleStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: 4,
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "rgba(148,163,184,0.08)",
};

const viewToggleButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 800,
  cursor: "pointer",
};

const viewToggleActiveButtonStyle: React.CSSProperties = {
  ...viewToggleButtonStyle,
  background: "#6d28d9",
  color: "#fff",
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 18,
};

const tabStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  fontWeight: 800,
  cursor: "pointer",
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  background: "#6d28d9",
  color: "#fff",
  border: "1px solid #6d28d9",
};

const searchRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 260,
  padding: 13,
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  outline: "none",
};

const counterStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 14,
  background: "var(--card)",
  border: "1px solid var(--line)",
  color: "var(--text)",
  fontWeight: 900,
};

const groupActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 14,
  flexWrap: "wrap",
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 800,
  cursor: "pointer",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  marginTop: 16,
};

const groupCardStyle: React.CSSProperties = {
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: 20,
  overflow: "hidden",
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 10px 30px rgba(15,23,42,0.045)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
};

const groupHeaderStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.84))",
  padding: "15px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  cursor: "pointer",
  textAlign: "left",
};

const groupHeaderTextStyle: React.CSSProperties = {
  minWidth: 0,
};

const groupTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.45,
  letterSpacing: "-0.01em",
};

const groupLabelStyle: React.CSSProperties = {
  color: "#374151",
  fontWeight: 850,
};

const groupNamesStyle: React.CSSProperties = {
  color: "#4b5563",
  fontWeight: 520,
};

const groupSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontWeight: 700,
};

const groupContactStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 750,
};

const groupRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const smallCountStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "rgba(109,40,217,0.08)",
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const chevronStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontSize: 16,
  fontWeight: 900,
  opacity: 0.72,
};

const groupBodyStyle: React.CSSProperties = {
  padding: "10px 14px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  borderTop: "1px solid rgba(226,232,240,0.72)",
  overflow: "hidden",
};

const guestCardStyle: React.CSSProperties = {
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.72)",
  overflow: "hidden",
  boxShadow: "0 4px 18px rgba(15,23,42,0.035)",
};

const guestHeaderButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  cursor: "pointer",
  textAlign: "left",
};

const guestMainInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  minWidth: 0,
};

const guestNameStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 16,
  fontWeight: 900,
};

const guestMetaStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 700,
};

const childMetaStyle: React.CSSProperties = {
  color: "#7c3aed",
  fontSize: 13,
  fontWeight: 900,
};

const guestStatusRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const guestChevronStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontSize: 18,
  fontWeight: 900,
};

const guestExpandedStyle: React.CSSProperties = {
  borderTop: "1px solid var(--line)",
  padding: 15,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const infoBoxStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 13,
  background: "var(--card)",
};

const infoLabelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const infoValueStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 15,
  fontWeight: 900,
  wordBreak: "break-word",
};

const detailsTextStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "rgba(109,40,217,0.06)",
  color: "var(--muted)",
  fontWeight: 700,
};

const quickActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const actionButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(109,40,217,0.24)",
  background: "#ede9fe",
  color: "#6d28d9",
  padding: "10px 13px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};
