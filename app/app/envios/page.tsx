"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_envio?: string | null;
  token?: string | null;
  email?: string | null;
};

type FiltroEnvio = "todos" | "pendentes" | "enviados" | "sem_telefone";

export default function EnviosPage() {
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroEnvio>("pendentes");

  async function carregarConvidados() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select("id, nome, telefone, grupo, status_rsvp, status_envio, token, email")
      .eq("status_rsvp", "pendente")
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

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return convidados.filter((convidado) => {
      const telefoneLimpo = normalizarTelefone(convidado.telefone);

      const buscaOk =
        !termo ||
        [convidado.nome, convidado.grupo, convidado.telefone, convidado.email, convidado.token]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!buscaOk) return false;

      if (filtro === "todos") return true;
      if (filtro === "pendentes") return convidado.status_envio !== "enviado";
      if (filtro === "enviados") return convidado.status_envio === "enviado";
      if (filtro === "sem_telefone") return !telefoneLimpo;

      return true;
    });
  }, [convidados, busca, filtro]);

  const stats = useMemo(() => {
    const total = convidados.length;
    const enviados = convidados.filter((c) => c.status_envio === "enviado").length;
    const pendentes = convidados.filter((c) => c.status_envio !== "enviado").length;
    const semTelefone = convidados.filter((c) => !normalizarTelefone(c.telefone)).length;

    return { total, enviados, pendentes, semTelefone };
  }, [convidados]);

  async function marcarComoEnviado(convidado: Convidado) {
    const { error } = await supabase
      .from("convidados")
      .update({ status_envio: "enviado" })
      .eq("id", convidado.id);

    if (error) {
      alert("Erro ao marcar como enviado: " + error.message);
      return;
    }

    setConvidados((current) =>
      current.map((item) =>
        item.id === convidado.id ? { ...item, status_envio: "enviado" } : item
      )
    );
  }

  function abrirWhatsApp(convidado: Convidado) {
    const link = gerarLinkWhatsApp(convidado);

    if (!link) {
      alert("Este convidado não tem telefone cadastrado.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage Envios</span>
          <h1 style={titleStyle}>Lembrete de confirmação</h1>
          <p style={subtitleStyle}>
            Envie mensagem para convidados que ainda não confirmaram presença.
          </p>
        </div>

        <button onClick={carregarConvidados} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar lista"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Pendentes RSVP" value={stats.total} detail="Ainda não confirmaram" />
        <MetricCard label="A enviar" value={stats.pendentes} detail="Sem status enviado" />
        <MetricCard label="Enviados" value={stats.enviados} detail="Marcados como enviados" />
        <MetricCard label="Sem telefone" value={stats.semTelefone} detail="Precisam ser revisados" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Fila de envio</h2>
            <p style={panelTextStyle}>
              Use o WhatsApp para enviar o lembrete e depois marque como enviado.
            </p>
          </div>

          <span style={counterStyle}>{convidadosFiltrados.length} itens</span>
        </div>

        <div style={tabsStyle}>
          {[
            { key: "pendentes", label: "A enviar" },
            { key: "enviados", label: "Enviados" },
            { key: "sem_telefone", label: "Sem telefone" },
            { key: "todos", label: "Todos" },
          ].map((tab) => {
            const active = filtro === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key as FiltroEnvio)}
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
            const enviado = convidado.status_envio === "enviado";

            return (
              <article key={convidado.id} style={cardStyle}>
                <div style={guestInfoStyle}>
                  <strong style={guestNameStyle}>{convidado.nome || "Sem nome"}</strong>
                  <span style={guestMetaStyle}>
                    {convidado.grupo || "Sem grupo"} · {convidado.telefone || "Sem telefone"}
                  </span>

                  <p style={messagePreviewStyle}>
                    {gerarMensagem(convidado)}
                  </p>
                </div>

                <div style={actionsStyle}>
                  <span style={enviado ? sentBadgeStyle : pendingBadgeStyle}>
                    {enviado ? "Enviado" : "A enviar"}
                  </span>

                  <button
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

function normalizarTelefone(telefone: string | null | undefined) {
  return (telefone || "").replace(/\D/g, "");
}

function gerarLinkConvite(convidado: Convidado) {
  const token = encodeURIComponent(convidado.token || "");
  return `${window.location.origin}/c/${token}`;
}

function gerarMensagem(convidado: Convidado) {
  const nome = convidado.nome || "";
  const linkConvite =
    typeof window === "undefined"
      ? ""
      : gerarLinkConvite(convidado);

  return `Olá ${nome} ✨

Passando para lembrar que você ainda não confirmou presença no evento.

Para confirmar, acesse seu convite digital:
${linkConvite}

Sua confirmação é muito importante para organizarmos tudo com carinho.

Com carinho,
OmniStage`;
}

function gerarLinkWhatsApp(convidado: Convidado) {
  const telefone = normalizarTelefone(convidado.telefone);
  if (!telefone) return "";

  return `https://wa.me/55${telefone}?text=${encodeURIComponent(gerarMensagem(convidado))}`;
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
