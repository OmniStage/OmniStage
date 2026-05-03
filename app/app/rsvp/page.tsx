"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type StatusRsvp = "pendente" | "confirmado" | "nao";
type FiltroRsvp = "todos" | "confirmado" | "pendente" | "nao";
type ModoVisualizacao = "grupo" | "individual";

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_checkin?: string | null;
  token?: string | null;
  observacoes?: string | null;
  data_hora_rsvp?: string | null;
  data_resposta?: string | null;
};

type Stats = {
  total: number;
  confirmados: number;
  pendentes: number;
  ausentes: number;
};

export default function RsvpPage() {
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroRsvp>("todos");
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>("grupo");
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  async function carregarRsvp() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select(`
        id,
        nome,
        telefone,
        email,
        grupo,
        status_rsvp,
        status_checkin,
        token,
        observacoes,
        data_hora_rsvp,
        data_resposta
      `)
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar RSVP: " + error.message);
      setLoading(false);
      return;
    }

    setConvidados((data || []) as Convidado[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarRsvp();
  }, []);

  const stats = useMemo<Stats>(() => {
    const total = convidados.length;
    const confirmados = convidados.filter((c) => c.status_rsvp === "confirmado").length;
    const ausentes = convidados.filter((c) => c.status_rsvp === "nao").length;
    const pendentes = convidados.filter(
      (c) => !c.status_rsvp || c.status_rsvp === "pendente"
    ).length;

    return { total, confirmados, pendentes, ausentes };
  }, [convidados]);

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return convidados.filter((convidado) => {
      const buscaOk =
        !termo ||
        [convidado.nome, convidado.grupo, convidado.telefone, convidado.email, convidado.token]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!buscaOk) return false;

      if (filtro === "todos") return true;
      if (filtro === "pendente") return !convidado.status_rsvp || convidado.status_rsvp === "pendente";

      return convidado.status_rsvp === filtro;
    });
  }, [convidados, busca, filtro]);

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapaCompleto = new Map<string, Convidado[]>();

    convidados.forEach((convidado) => {
      const grupo = normalizarGrupo(convidado.grupo);
      const lista = mapaCompleto.get(grupo) || [];
      lista.push(convidado);
      mapaCompleto.set(grupo, lista);
    });

    return Array.from(mapaCompleto.entries())
      .map(([grupo, listaCompleta]) => {
        const grupoCombinaBusca =
          !termo ||
          listaCompleta.some((convidado) =>
            [convidado.nome, convidado.grupo, convidado.telefone, convidado.email, convidado.token]
              .filter(Boolean)
              .some((valor) => String(valor).toLowerCase().includes(termo))
          );

        if (!grupoCombinaBusca) return null;

        const lista = listaCompleta
          .filter((convidado) => {
            if (filtro === "todos") return true;
            if (filtro === "pendente") {
              return !convidado.status_rsvp || convidado.status_rsvp === "pendente";
            }
            return convidado.status_rsvp === filtro;
          })
          .sort(ordenarPorTelefoneDepoisNome);

        if (lista.length === 0) return null;

        return { grupo, lista };
      })
      .filter(Boolean) as { grupo: string; lista: Convidado[] }[];
  }, [convidados, busca, filtro]);

  const totalExibido =
    modoVisualizacao === "grupo"
      ? grupos.reduce((total, grupo) => total + grupo.lista.length, 0)
      : convidadosFiltrados.length;

  async function atualizarStatusRsvp(convidado: Convidado, novoStatus: StatusRsvp) {
    const statusAtual = normalizarStatusRsvp(convidado.status_rsvp);

    if (statusAtual === "confirmado" && novoStatus === "confirmado") {
      return;
    }

    setSalvandoId(convidado.id);

    const payload = {
      status_rsvp: novoStatus,
      data_resposta: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("convidados")
      .update(payload)
      .eq("id", convidado.id);

    if (error) {
      alert("Erro ao atualizar RSVP: " + error.message);
      setSalvandoId(null);
      return;
    }

    setConvidados((current) =>
      current.map((item) =>
        item.id === convidado.id
          ? {
              ...item,
              status_rsvp: novoStatus,
              data_resposta: payload.data_resposta,
            }
          : item
      )
    );

    setSalvandoId(null);
  }

  async function registrarEntradaSemRsvp(convidado: Convidado) {
    const statusAtual = normalizarStatusRsvp(convidado.status_rsvp);

    if (statusAtual === "confirmado") {
      return;
    }

    setSalvandoId(convidado.id);

    const agora = new Date().toISOString();
    const observacaoAtual = convidado.observacoes?.trim();
    const observacaoNova = "Entrou no evento sem RSVP prévio. Confirmação feita manualmente na entrada.";

    const payload = {
      status_rsvp: "confirmado",
      status_checkin: "entrou",
      data_resposta: agora,
      data_hora_checkin: agora,
      observacoes: observacaoAtual
        ? `${observacaoAtual}\n${observacaoNova}`
        : observacaoNova,
    };

    const { error } = await supabase
      .from("convidados")
      .update(payload)
      .eq("id", convidado.id);

    if (error) {
      alert("Erro ao registrar entrada sem RSVP: " + error.message);
      setSalvandoId(null);
      return;
    }

    setConvidados((current) =>
      current.map((item) =>
        item.id === convidado.id
          ? {
              ...item,
              status_rsvp: "confirmado",
              status_checkin: "entrou",
              data_resposta: agora,
              data_hora_checkin: agora,
              observacoes: payload.observacoes,
            }
          : item
      )
    );

    setSalvandoId(null);
  }

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
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .rsvp-card {
          transition:
            transform 170ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .rsvp-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15,23,42,0.07);
          border-color: rgba(109,40,217,0.2);
          background: #f8fafc;
        }

        .rsvp-action:active {
          transform: scale(0.97);
        }

        button:focus-visible,
        a:focus-visible {
          outline: 3px solid rgba(109,40,217,0.22);
          outline-offset: 3px;
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage RSVP</span>
          <h1 style={titleStyle}>Controle de confirmações</h1>
          <p style={subtitleStyle}>
            Acompanhe confirmações, pendências e ausências confirmadas sem alterar tokens ou cartões existentes.
          </p>
        </div>

        <button onClick={carregarRsvp} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar RSVP"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Total" value={stats.total} detail="Convidados cadastrados" color="#6d28d9" bg="#ede9fe" />
        <MetricCard label="Confirmados" value={stats.confirmados} detail={`${percent(stats.confirmados, stats.total)}% da lista`} color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Pendentes" value={stats.pendentes} detail="Aguardando resposta" color="#f59e0b" bg="#fef3c7" />
        <MetricCard label="Ausência confirmada" value={stats.ausentes} detail={`${percent(stats.ausentes, stats.total)}% da lista`} color="#dc2626" bg="#fee2e2" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Lista RSVP</h2>
            <p style={panelTextStyle}>
              Filtre por status, busque convidados e atualize a resposta manualmente quando necessário.
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
          {[
            { key: "todos", label: "Todos" },
            { key: "confirmado", label: "Confirmados" },
            { key: "pendente", label: "Pendentes" },
            { key: "nao", label: "Ausência confirmada" },
          ].map((tab) => {
            const active = filtro === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key as FiltroRsvp)}
                style={active ? tabActiveStyle : tabStyle}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={searchRowStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, grupo, telefone, e-mail ou token"
            style={searchInputStyle}
          />

          <div style={counterStyle}>{totalExibido} itens</div>
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
                <article key={grupo} className="rsvp-card" style={groupCardStyle}>
                  <button onClick={() => toggleGrupo(grupo)} style={groupHeaderStyle}>
                    <div style={{ minWidth: 0 }}>
                      <p style={groupTitleStyle}>
                        <span style={groupLabelStyle}>Integrantes:</span>{" "}
                        <span style={groupNamesStyle}>{nomesIntegrantes(lista)}</span>
                      </p>

                      <p style={groupContactStyle}>
                        {lista.length} integrante{lista.length === 1 ? "" : "s"}
                        {principal?.telefone ? ` · contato: ${principal.telefone}` : " · sem telefone principal"}
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
                        <RsvpGuestCard
                          key={convidado.id}
                          convidado={convidado}
                          salvando={salvandoId === convidado.id}
                          onChangeStatus={atualizarStatusRsvp}
                          onEntradaSemRsvp={registrarEntradaSemRsvp}
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
              <RsvpGuestCard
                key={convidado.id}
                convidado={convidado}
                salvando={salvandoId === convidado.id}
                onChangeStatus={atualizarStatusRsvp}
                onEntradaSemRsvp={registrarEntradaSemRsvp}
              />
            ))}
          </div>
        )}

        {!loading && totalExibido === 0 && (
          <div style={emptyStyle}>Nenhum convidado encontrado com estes filtros.</div>
        )}
      </section>
    </div>
  );
}

function RsvpGuestCard({
  convidado,
  salvando,
  onChangeStatus,
  onEntradaSemRsvp,
}: {
  convidado: Convidado;
  salvando: boolean;
  onChangeStatus: (convidado: Convidado, status: StatusRsvp) => void;
  onEntradaSemRsvp: (convidado: Convidado) => void;
}) {
  const status = normalizarStatusRsvp(convidado.status_rsvp);
  const jaConfirmado = status === "confirmado";
  const linkConvite = gerarLinkConvite(convidado);
  const linkCartao = gerarLinkCartao(convidado);

  return (
    <article className="rsvp-card" style={guestCardStyle}>
      <div style={guestInfoStyle}>
        <strong style={guestNameStyle}>{convidado.nome || "Sem nome"}</strong>
        <span style={guestMetaStyle}>
          {normalizarGrupo(convidado.grupo)} · {convidado.telefone || "Sem telefone"}
        </span>

        <div style={guestDetailsStyle}>
          <span style={getStatusBadgeStyle(status)}>{labelRsvp(status)}</span>
          <span style={miniInfoStyle}>Check-in: {convidado.status_checkin === "entrou" ? "Entrou" : "Não entrou"}</span>
          <span style={miniInfoStyle}>Token: {convidado.token || "Sem token"}</span>
        </div>

        {(convidado.data_resposta || convidado.data_hora_rsvp || convidado.observacoes) && (
          <p style={detailsTextStyle}>
            {convidado.data_resposta || convidado.data_hora_rsvp
              ? `Resposta: ${formatarData(convidado.data_resposta || convidado.data_hora_rsvp || "")}`
              : ""}
            {convidado.observacoes ? ` · ${convidado.observacoes}` : ""}
          </p>
        )}
      </div>

      <div style={actionsStyle}>
        {jaConfirmado ? (
          <span style={lockedConfirmedStyle}>
            RSVP já confirmado
          </span>
        ) : (
          <>
            <button
              className="rsvp-action"
              onClick={() => onChangeStatus(convidado, "confirmado")}
              disabled={salvando}
              style={confirmButtonStyle}
            >
              Confirmar RSVP
            </button>

            <button
              className="rsvp-action"
              onClick={() => onEntradaSemRsvp(convidado)}
              disabled={salvando}
              style={entryWithoutRsvpButtonStyle}
            >
              Entrou sem RSVP
            </button>

            <button
              className="rsvp-action"
              onClick={() => onChangeStatus(convidado, "pendente")}
              disabled={salvando || status === "pendente"}
              style={status === "pendente" ? activePendingButtonStyle : pendingButtonStyle}
            >
              Pendente
            </button>

            <button
              className="rsvp-action"
              onClick={() => onChangeStatus(convidado, "nao")}
              disabled={salvando || status === "nao"}
              style={status === "nao" ? activeAbsentButtonStyle : absentButtonStyle}
            >
              Ausência
            </button>
          </>
        )}

        <a href={linkConvite} target="_blank" rel="noreferrer" style={linkButtonStyle}>
          Convite
        </a>

        <a href={linkCartao} target="_blank" rel="noreferrer" style={linkButtonStyle}>
          Cartão
        </a>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  detail,
  color,
  bg,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  bg: string;
}) {
  return (
    <article style={metricCardStyle}>
      <div style={{ ...iconBubbleStyle, background: bg, color }}>●</div>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <p style={metricDetailStyle}>{detail}</p>
    </article>
  );
}

function normalizarStatusRsvp(status: string | null | undefined): StatusRsvp {
  if (status === "confirmado") return "confirmado";
  if (status === "nao") return "nao";
  return "pendente";
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

function labelRsvp(status: StatusRsvp) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Ausência confirmada";
  return "Pendente";
}

function percent(valor: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((valor / total) * 100);
}

function gerarLinkConvite(convidado: Convidado) {
  const token = encodeURIComponent(convidado.token || "");
  if (typeof window === "undefined") return `/c/${token}`;
  return `${window.location.origin}/c/${token}`;
}

function gerarLinkCartao(convidado: Convidado) {
  const nome = encodeURIComponent(convidado.nome || "");
  const token = encodeURIComponent(convidado.token || "");
  return `https://omnistageproducoes.com.br/valentinaxv/cartao/?nome=${nome}&token=${token}`;
}

function formatarData(data: string) {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeStyle(status: StatusRsvp): React.CSSProperties {
  if (status === "confirmado") return statusConfirmadoStyle;
  if (status === "nao") return statusAusenteStyle;
  return statusPendenteStyle;
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
  flexWrap: "wrap",
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
  maxWidth: 820,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#6d28d9",
  color: "#fff",
  padding: "13px 18px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
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
  fontWeight: 800,
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

const panelStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
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
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: 20,
  overflow: "hidden",
  background: "rgba(255,255,255,0.78)",
  boxShadow: "0 10px 30px rgba(15,23,42,0.045)",
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
};

const guestCardStyle: React.CSSProperties = {
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.72)",
  overflow: "hidden",
  padding: 15,
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const guestInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: 1,
  minWidth: 260,
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

const guestDetailsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginTop: 4,
};

const miniInfoStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 800,
};

const detailsTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 700,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const baseActionButtonStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  padding: "9px 12px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const confirmButtonStyle: React.CSSProperties = {
  ...baseActionButtonStyle,
  background: "#dcfce7",
  color: "#166534",
  borderColor: "rgba(22,163,74,0.25)",
};

const entryWithoutRsvpButtonStyle: React.CSSProperties = {
  ...baseActionButtonStyle,
  background: "#ede9fe",
  color: "#6d28d9",
  borderColor: "rgba(109,40,217,0.28)",
};

const lockedConfirmedStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 13,
  fontWeight: 900,
};

const activeConfirmButtonStyle: React.CSSProperties = {
  ...confirmButtonStyle,
  background: "#16a34a",
  color: "#fff",
};

const pendingButtonStyle: React.CSSProperties = {
  ...baseActionButtonStyle,
  background: "#fef3c7",
  color: "#92400e",
  borderColor: "rgba(245,158,11,0.28)",
};

const activePendingButtonStyle: React.CSSProperties = {
  ...pendingButtonStyle,
  background: "#f59e0b",
  color: "#111827",
};

const absentButtonStyle: React.CSSProperties = {
  ...baseActionButtonStyle,
  background: "#fee2e2",
  color: "#991b1b",
  borderColor: "rgba(220,38,38,0.24)",
};

const activeAbsentButtonStyle: React.CSSProperties = {
  ...absentButtonStyle,
  background: "#dc2626",
  color: "#fff",
};

const linkButtonStyle: React.CSSProperties = {
  ...baseActionButtonStyle,
  background: "#ede9fe",
  color: "#6d28d9",
  borderColor: "rgba(109,40,217,0.24)",
  textDecoration: "none",
};

const statusConfirmadoStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#16a34a",
  color: "#fff",
  fontSize: 11,
  fontWeight: 900,
};

const statusPendenteStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f59e0b",
  color: "#111827",
  fontSize: 11,
  fontWeight: 900,
};

const statusAusenteStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#dc2626",
  color: "#fff",
  fontSize: 11,
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed var(--line)",
  color: "var(--muted)",
};

