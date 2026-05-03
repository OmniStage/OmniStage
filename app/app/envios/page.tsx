"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TipoEnvio = "convite" | "lembrete_rsvp" | "cartao_evento";
type FiltroStatusEnvio = "a_enviar" | "enviados" | "sem_telefone" | "todos";

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_checkin?: string | null;
  token?: string | null;

  status_envio_convite?: string | null;
  data_envio_convite?: string | null;

  status_envio_lembrete_rsvp?: string | null;
  data_envio_lembrete_rsvp?: string | null;

  status_envio_cartao?: string | null;
  data_envio_cartao?: string | null;
};

type Campanha = {
  key: TipoEnvio;
  titulo: string;
  subtitulo: string;
  descricao: string;
  statusColumn: keyof Convidado;
  dataColumn: keyof Convidado;
  cor: string;
  corSuave: string;
  filtrarPublico: (convidado: Convidado) => boolean;
  gerarMensagem: (convidado: Convidado) => string;
};

export default function EnviosPage() {
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>("convite");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusEnvio>("a_enviar");
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const campanha = campanhas[tipoEnvio];

  async function carregarConvidados() {
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
        status_envio_convite,
        data_envio_convite,
        status_envio_lembrete_rsvp,
        data_envio_lembrete_rsvp,
        status_envio_cartao,
        data_envio_cartao
      `)
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar convidados: " + error.message);
      setLoading(false);
      return;
    }

    setConvidados((data || []) as Convidado[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarConvidados();
  }, []);

  useEffect(() => {
    setFiltroStatus("a_enviar");
    setBusca("");
  }, [tipoEnvio]);

  const publicoCampanha = useMemo(() => {
    return convidados.filter((convidado) => campanha.filtrarPublico(convidado));
  }, [convidados, campanha]);

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return publicoCampanha.filter((convidado) => {
      const telefoneLimpo = normalizarTelefone(convidado.telefone);
      const enviado = getStatusEnvio(convidado, campanha) === "enviado";

      const buscaOk =
        !termo ||
        [convidado.nome, convidado.grupo, convidado.telefone, convidado.email, convidado.token]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!buscaOk) return false;

      if (filtroStatus === "todos") return true;
      if (filtroStatus === "a_enviar") return !enviado && !!telefoneLimpo;
      if (filtroStatus === "enviados") return enviado;
      if (filtroStatus === "sem_telefone") return !telefoneLimpo;

      return true;
    });
  }, [publicoCampanha, busca, filtroStatus, campanha]);

  const stats = useMemo(() => {
    const total = publicoCampanha.length;
    const enviados = publicoCampanha.filter((c) => getStatusEnvio(c, campanha) === "enviado").length;
    const semTelefone = publicoCampanha.filter((c) => !normalizarTelefone(c.telefone)).length;
    const aEnviar = publicoCampanha.filter(
      (c) => getStatusEnvio(c, campanha) !== "enviado" && !!normalizarTelefone(c.telefone)
    ).length;

    return { total, enviados, aEnviar, semTelefone };
  }, [publicoCampanha, campanha]);

  async function marcarComoEnviado(convidado: Convidado) {
    const payload = {
      [campanha.statusColumn]: "enviado",
      [campanha.dataColumn]: new Date().toISOString(),
    };

    const { error } = await supabase.from("convidados").update(payload).eq("id", convidado.id);

    if (error) {
      alert("Erro ao marcar como enviado: " + error.message);
      return;
    }

    setConvidados((current) =>
      current.map((item) =>
        item.id === convidado.id
          ? {
              ...item,
              [campanha.statusColumn]: "enviado",
              [campanha.dataColumn]: new Date().toISOString(),
            }
          : item
      )
    );
  }

  function abrirWhatsApp(convidado: Convidado) {
    const telefone = normalizarTelefone(convidado.telefone);

    if (!telefone) {
      alert("Este convidado não tem telefone cadastrado.");
      return;
    }

    const mensagem = campanha.gerarMensagem(convidado);
    const link = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;

    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function copiarMensagem(convidado: Convidado) {
    await navigator.clipboard.writeText(campanha.gerarMensagem(convidado));
    alert("Mensagem copiada.");
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .envio-card {
          transition:
            transform 170ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .envio-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15,23,42,0.07);
          border-color: rgba(109,40,217,0.2);
          background: #f8fafc;
        }

        .envio-action:active {
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
          <span style={eyebrowStyle}>OmniStage Envios</span>
          <h1 style={titleStyle}>Central de envios</h1>
          <p style={subtitleStyle}>
            Organize campanhas de WhatsApp por etapa do evento, sem misturar status.
          </p>
        </div>

        <button onClick={carregarConvidados} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar lista"}
        </button>
      </section>

      <section style={campaignSelectorStyle}>
        {Object.values(campanhas).map((item) => {
          const active = tipoEnvio === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setTipoEnvio(item.key)}
              style={{
                ...campaignButtonStyle,
                ...(active
                  ? {
                      background: item.cor,
                      color: "#fff",
                      border: `1px solid ${item.cor}`,
                    }
                  : {}),
              }}
            >
              <strong>{item.titulo}</strong>
              <span>{item.subtitulo}</span>
            </button>
          );
        })}
      </section>

      <section
        style={{
          ...campaignHeaderStyle,
          borderColor: campanha.corSuave,
          background: `linear-gradient(135deg, ${campanha.corSuave}, #ffffff)`,
        }}
      >
        <div>
          <h2 style={panelTitleStyle}>{campanha.titulo}</h2>
          <p style={panelTextStyle}>{campanha.descricao}</p>
        </div>

        <span
          style={{
            ...campaignBadgeStyle,
            background: campanha.corSuave,
            color: campanha.cor,
          }}
        >
          {stats.aEnviar} a enviar
        </span>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Público da campanha" value={stats.total} detail="Convidados elegíveis" />
        <MetricCard label="A enviar" value={stats.aEnviar} detail="Com telefone e não enviado" />
        <MetricCard label="Enviados" value={stats.enviados} detail="Já marcados como enviados" />
        <MetricCard label="Sem telefone" value={stats.semTelefone} detail="Precisam revisão" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Fila de envio</h2>
            <p style={panelTextStyle}>
              Abra o WhatsApp, envie a mensagem e depois marque como enviado.
            </p>
          </div>

          <span style={counterStyle}>{convidadosFiltrados.length} itens</span>
        </div>

        <div style={tabsStyle}>
          {[
            { key: "a_enviar", label: "A enviar" },
            { key: "enviados", label: "Enviados" },
            { key: "sem_telefone", label: "Sem telefone" },
            { key: "todos", label: "Todos" },
          ].map((tab) => {
            const active = filtroStatus === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setFiltroStatus(tab.key as FiltroStatusEnvio)}
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
        </div>

        <div style={listStyle}>
          {convidadosFiltrados.map((convidado) => {
            const telefoneOk = !!normalizarTelefone(convidado.telefone);
            const enviado = getStatusEnvio(convidado, campanha) === "enviado";
            const dataEnvio = getDataEnvio(convidado, campanha);

            return (
              <article key={convidado.id} className="envio-card" style={cardStyle}>
                <div style={guestInfoStyle}>
                  <strong style={guestNameStyle}>{convidado.nome || "Sem nome"}</strong>
                  <span style={guestMetaStyle}>
                    {convidado.grupo || "Sem grupo"} · {convidado.telefone || "Sem telefone"}
                  </span>

                  <p style={messagePreviewStyle}>{campanha.gerarMensagem(convidado)}</p>

                  {dataEnvio && (
                    <small style={sentDateStyle}>
                      Enviado em {formatarData(dataEnvio)}
                    </small>
                  )}
                </div>

                <div style={actionsStyle}>
                  <span style={enviado ? sentBadgeStyle : pendingBadgeStyle}>
                    {enviado ? "Enviado" : "A enviar"}
                  </span>

                  <button
                    className="envio-action"
                    onClick={() => abrirWhatsApp(convidado)}
                    disabled={!telefoneOk}
                    style={
                      telefoneOk
                        ? whatsappButtonStyle
                        : { ...whatsappButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                    }
                  >
                    WhatsApp
                  </button>

                  <button
                    className="envio-action"
                    onClick={() => copiarMensagem(convidado)}
                    style={secondaryButtonStyle}
                  >
                    Copiar mensagem
                  </button>

                  <button
                    className="envio-action"
                    onClick={() => marcarComoEnviado(convidado)}
                    disabled={enviado}
                    style={
                      enviado
                        ? { ...secondaryButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                        : secondaryButtonStyle
                    }
                  >
                    Marcar enviado
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && convidadosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum convidado encontrado com estes filtros.</div>
          )}
        </div>
      </section>
    </div>
  );
}

const campanhas: Record<TipoEnvio, Campanha> = {
  convite: {
    key: "convite",
    titulo: "1. Envio do convite",
    subtitulo: "Primeiro contato",
    descricao:
      "Envio inicial do convite digital para todos os convidados com telefone.",
    statusColumn: "status_envio_convite",
    dataColumn: "data_envio_convite",
    cor: "#6d28d9",
    corSuave: "#ede9fe",
    filtrarPublico: (convidado) => !!normalizarTelefone(convidado.telefone),
    gerarMensagem: (convidado) => {
      const nome = convidado.nome || "";
      const linkConvite = gerarLinkConvite(convidado);

      return `Olá ${nome} ✨

Você está convidado(a) para o evento.

Acesse seu convite digital:
${linkConvite}

Por lá você poderá confirmar sua presença.

Com carinho,
OmniStage`;
    },
  },

  lembrete_rsvp: {
    key: "lembrete_rsvp",
    titulo: "2. Confirmação pendente",
    subtitulo: "Lembrete RSVP",
    descricao:
      "Lembrete para convidados que ainda estão com RSVP pendente.",
    statusColumn: "status_envio_lembrete_rsvp",
    dataColumn: "data_envio_lembrete_rsvp",
    cor: "#f59e0b",
    corSuave: "#fef3c7",
    filtrarPublico: (convidado) =>
      convidado.status_rsvp === "pendente" && !!normalizarTelefone(convidado.telefone),
    gerarMensagem: (convidado) => {
      const nome = convidado.nome || "";
      const linkConvite = gerarLinkConvite(convidado);

      return `Olá ${nome} ✨

Passando para lembrar que você ainda não confirmou presença no evento.

Para confirmar, acesse seu convite digital:
${linkConvite}

Sua confirmação é muito importante para organizarmos tudo com carinho.

Com carinho,
OmniStage`;
    },
  },

  cartao_evento: {
    key: "cartao_evento",
    titulo: "3. Cartão do evento",
    subtitulo: "Entrada / QR Code",
    descricao:
      "Envio do cartão de entrada para convidados confirmados.",
    statusColumn: "status_envio_cartao",
    dataColumn: "data_envio_cartao",
    cor: "#16a34a",
    corSuave: "#dcfce7",
    filtrarPublico: (convidado) =>
      convidado.status_rsvp === "confirmado" && !!normalizarTelefone(convidado.telefone),
    gerarMensagem: (convidado) => {
      const nome = convidado.nome || "";
      const linkCartao = gerarLinkCartao(convidado);

      return `Olá ${nome} ✨

Ficamos muito felizes com sua confirmação.

Segue seu cartão de entrada para o evento:
${linkCartao}

Apresente este cartão na entrada.

Com carinho,
OmniStage`;
    },
  },
};

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article style={metricCardStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <p style={metricDetailStyle}>{detail}</p>
    </article>
  );
}

function getStatusEnvio(convidado: Convidado, campanha: Campanha) {
  return convidado[campanha.statusColumn] as string | null | undefined;
}

function getDataEnvio(convidado: Convidado, campanha: Campanha) {
  return convidado[campanha.dataColumn] as string | null | undefined;
}

function normalizarTelefone(telefone: string | null | undefined) {
  return (telefone || "").replace(/\D/g, "");
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
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const campaignSelectorStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const campaignButtonStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  padding: 16,
  borderRadius: 18,
  cursor: "pointer",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontWeight: 900,
  boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
};

const campaignHeaderStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 22,
  padding: 22,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const campaignBadgeStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 900,
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

const counterStyle: React.CSSProperties = {
  padding: "9px 13px",
  borderRadius: 999,
  background: "rgba(109,40,217,0.08)",
  color: "#6d28d9",
  fontSize: 13,
  fontWeight: 900,
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

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 16,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 18,
  background: "rgba(255,255,255,0.78)",
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const guestInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  flex: 1,
  minWidth: 280,
};

const guestNameStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 17,
  fontWeight: 900,
};

const guestMetaStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 700,
};

const messagePreviewStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "var(--muted)",
  fontSize: 13,
  lineHeight: 1.45,
  whiteSpace: "pre-line",
};

const sentDateStyle: React.CSSProperties = {
  marginTop: 8,
  color: "var(--muted)",
  fontWeight: 800,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const whatsappButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#16a34a",
  color: "#fff",
  padding: "10px 13px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(109,40,217,0.24)",
  background: "#ede9fe",
  color: "#6d28d9",
  padding: "10px 13px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const pendingBadgeStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 12,
  fontWeight: 900,
};

const sentBadgeStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 12,
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed var(--line)",
  color: "var(--muted)",
};
