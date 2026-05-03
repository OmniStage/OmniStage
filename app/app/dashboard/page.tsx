"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  total: number;
  confirmados: number;
  pendentes: number;
  entradas: number;
  restantes: number;
};

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
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

type FiltroStatus = "todos" | "confirmados" | "pendentes" | "entraram" | "faltam" | "nao";
type ModoVisualizacao = "grupo" | "individual";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmados: 0,
    pendentes: 0,
    entradas: 0,
    restantes: 0,
  });

  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>("grupo");
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [convidadoAbertoId, setConvidadoAbertoId] = useState<string | null>(null);

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
    const restantes = Math.max(confirmados - entradas, 0);

    setConvidados(lista);
    setStats({ total, confirmados, pendentes, entradas, restantes });
    setLoading(false);
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  const percentualConfirmados =
    stats.total > 0 ? Math.round((stats.confirmados / stats.total) * 100) : 0;

  const percentualEntradas =
    stats.confirmados > 0 ? Math.round((stats.entradas / stats.confirmados) * 100) : 0;

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return convidados.filter((c) => {
      const matchBusca =
        !termo ||
        [c.nome, c.grupo, c.telefone, c.email, c.token]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!matchBusca) return false;

      if (filtro === "todos") return true;
      if (filtro === "confirmados") return c.status_rsvp === "confirmado";
      if (filtro === "pendentes") return c.status_rsvp === "pendente";
      if (filtro === "entraram") return c.status_checkin === "entrou";
      if (filtro === "faltam") return c.status_rsvp === "confirmado" && c.status_checkin !== "entrou";
      if (filtro === "nao") return c.status_rsvp === "nao";

      return true;
    });
  }, [convidados, filtro, busca]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Convidado[]>();

    convidadosFiltrados.forEach((c) => {
      const grupo = normalizarGrupo(c.grupo);
      const lista = mapa.get(grupo) || [];
      lista.push(c);
      mapa.set(grupo, lista);
    });

    return Array.from(mapa.entries()).map(([grupo, lista]) => ({
      grupo,
      lista: lista.sort(ordenarPorTelefoneDepoisNome),
    }));
  }, [convidadosFiltrados]);

  const cards = [
    {
      label: "Total de convidados",
      value: stats.total,
      detail: "Base completa do evento",
      color: "#6d28d9",
      bg: "#ede9fe",
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
      label: "Entradas",
      value: stats.entradas,
      detail: `${percentualEntradas}% dos confirmados`,
      color: "#2563eb",
      bg: "#dbeafe",
    },
  ];

  const tabs: { key: FiltroStatus; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "confirmados", label: "Confirmados" },
    { key: "pendentes", label: "Pendentes" },
    { key: "entraram", label: "Entraram" },
    { key: "faltam", label: "Faltam entrar" },
    { key: "nao", label: "Não vão" },
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
    setConvidadoAbertoId(null);
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage Dashboard</span>
          <h1 style={titleStyle}>Visão geral do evento</h1>
          <p style={subtitleStyle}>
            Acompanhe confirmações, pendências e entradas em tempo real.
          </p>
        </div>

        <button onClick={carregarDashboard} style={refreshButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar dados"}
        </button>
      </section>

      <section style={gridStyle}>
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

        <div style={emptyStateStyle}>Nenhuma entrada registrada ainda.</div>
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
            placeholder="Buscar por nome, grupo, telefone, e-mail ou token"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={searchInputStyle}
          />

          <div style={counterStyle}>{convidadosFiltrados.length} itens</div>
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
              const principal = lista.find((c) => !!normalizarTelefone(c.telefone)) || lista[0];

              return (
                <article key={grupo} style={groupCardStyle}>
                  <button onClick={() => toggleGrupo(grupo)} style={groupHeaderStyle}>
                    <div>
                      <strong style={groupTitleStyle}>{grupo}</strong>
                      <p style={groupSubtitleStyle}>
                        {lista.length} integrante{lista.length === 1 ? "" : "s"}
                        {principal?.telefone ? ` • contato: ${principal.telefone}` : " • sem telefone principal"}
                      </p>
                    </div>

                    <div style={groupRightStyle}>
                      <span style={smallCountStyle}>{contarConfirmados(lista)} confirmados</span>
                      <span style={chevronStyle}>{aberto ? "⌃" : "⌄"}</span>
                    </div>
                  </button>

                  {aberto && (
                    <div style={groupBodyStyle}>
                      {lista.map((convidado) => (
                        <GuestCard
                          key={convidado.id}
                          convidado={convidado}
                          aberto={convidadoAbertoId === convidado.id}
                          onToggle={() =>
                            setConvidadoAbertoId((current) =>
                              current === convidado.id ? null : convidado.id
                            )
                          }
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
                aberto={convidadoAbertoId === convidado.id}
                onToggle={() =>
                  setConvidadoAbertoId((current) =>
                    current === convidado.id ? null : convidado.id
                  )
                }
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
  aberto,
  onToggle,
}: {
  convidado: Convidado;
  aberto: boolean;
  onToggle: () => void;
}) {
  const nome = convidado.nome || "Sem nome";
  const grupo = normalizarGrupo(convidado.grupo);
  const telefone = convidado.telefone || "Sem telefone";
  const token = convidado.token || "Sem token";
  const linkCartao = gerarLinkCartao(convidado);
  const linkWhatsApp = gerarLinkWhatsApp(convidado);

  async function copiarNome() {
    await navigator.clipboard.writeText(nome);
    alert("Nome copiado.");
  }

  return (
    <article style={guestCardStyle}>
      <button onClick={onToggle} style={guestHeaderButtonStyle}>
        <div style={guestMainInfoStyle}>
          <strong style={guestNameStyle}>{nome}</strong>
          <span style={guestMetaStyle}>{grupo} • {telefone}</span>
        </div>

        <div style={guestStatusRowStyle}>
          {convidado.status_checkin === "entrou" && <span style={badgeStyle("#2563eb")}>Entrou</span>}
          {convidado.status_rsvp === "confirmado" && <span style={badgeStyle("#16a34a")}>Confirmado</span>}
          {convidado.status_rsvp === "pendente" && <span style={badgeStyle("#f59e0b")}>Pendente</span>}
          {convidado.status_rsvp === "nao" && <span style={badgeStyle("#dc2626")}>Não vai</span>}
          <span style={guestChevronStyle}>{aberto ? "⌃" : "⌄"}</span>
        </div>
      </button>

      {aberto && (
        <div style={guestExpandedStyle}>
          <div style={infoGridStyle}>
            <InfoBox label="Grupo" value={grupo} />
            <InfoBox label="Telefone" value={telefone} />
            <InfoBox label="Status RSVP" value={labelRsvp(convidado.status_rsvp)} />
            <InfoBox label="Check-in" value={labelCheckin(convidado.status_checkin)} />
            <InfoBox label="E-mail" value={convidado.email || "Sem e-mail"} />
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

function normalizarGrupo(grupo: string | null | undefined) {
  return grupo?.trim() || "Sem grupo";
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

function contarConfirmados(lista: Convidado[]) {
  return lista.filter((c) => c.status_rsvp === "confirmado").length;
}

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Não vai";
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
  gap: 12,
  marginTop: 16,
};

const groupCardStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 18,
  overflow: "hidden",
  background: "var(--card)",
};

const groupHeaderStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  cursor: "pointer",
  textAlign: "left",
};

const groupTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#6d28d9",
};

const groupSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontWeight: 700,
};

const groupRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const smallCountStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const chevronStyle: React.CSSProperties = {
  color: "#6d28d9",
  fontSize: 20,
  fontWeight: 900,
};

const groupBodyStyle: React.CSSProperties = {
  padding: "0 14px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const guestCardStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 16,
  background: "rgba(148,163,184,0.06)",
  overflow: "hidden",
};

const guestHeaderButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 15,
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
