"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string | null;
  status: string | null;
  data_evento?: string | null;
  tenant_id?: string | null;
  created_at?: string | null;
};

type Template = {
  id: string;
  nome: string | null;
  name: string | null;
  slug: string | null;
  active: boolean | null;
};

type Vinculo = {
  id: string;
  evento_id: string;
  template_id: string;
  tenant_id: string | null;
};

function formatarData(data?: string | null) {
  if (!data) return "Sem data";
  const value = String(data).slice(0, 10);
  const partes = value.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function EventosDoModeloPage({
  params,
}: {
  params: { templateId: string };
}) {
  const templateId = params.templateId;

  const [template, setTemplate] = useState<Template | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const eventosVinculadosIds = useMemo(() => {
    return new Set(vinculos.map((v) => v.evento_id));
  }, [vinculos]);

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      if (!termo) return true;

      return [
        evento.nome,
        evento.status,
        evento.data_evento,
        evento.tenant_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [eventos, busca]);

  const totalVinculados = vinculos.length;

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function carregarTudo() {
    setLoading(true);

    const templateQuery = supabase
      .from("invite_templates")
      .select("id, nome, name, slug, active")
      .eq("id", templateId)
      .single();

    const eventosQuery = supabase
      .from("eventos")
      .select("id, nome, status, data_evento, tenant_id, created_at")
      .order("created_at", { ascending: false });

    const vinculosQuery = supabase
      .from("event_invite_templates")
      .select("id, evento_id, template_id, tenant_id")
      .eq("template_id", templateId);

    const [
      { data: templateData, error: templateError },
      { data: eventosData, error: eventosError },
      { data: vinculosData, error: vinculosError },
    ] = await Promise.all([templateQuery, eventosQuery, vinculosQuery]);

    setLoading(false);

    if (templateError) {
      alert("Erro ao carregar modelo: " + templateError.message);
      return;
    }

    if (eventosError) {
      alert("Erro ao carregar eventos: " + eventosError.message);
      return;
    }

    if (vinculosError) {
      alert(
        "Erro ao carregar vínculos. Confirme se a tabela event_invite_templates foi criada no Supabase: " +
          vinculosError.message,
      );
      return;
    }

    setTemplate(templateData as Template);
    setEventos((eventosData || []) as Evento[]);
    setVinculos((vinculosData || []) as Vinculo[]);
  }

  async function vincularEvento(evento: Evento) {
    setSalvandoId(evento.id);

    const { error } = await supabase.from("event_invite_templates").insert({
      evento_id: evento.id,
      template_id: templateId,
      tenant_id: evento.tenant_id || null,
    });

    setSalvandoId(null);

    if (error) {
      if (error.code === "23505") {
        await carregarTudo();
        return;
      }

      alert("Erro ao vincular evento: " + error.message);
      return;
    }

    await carregarTudo();
  }

  async function removerVinculo(eventoId: string) {
    setSalvandoId(eventoId);

    const { error } = await supabase
      .from("event_invite_templates")
      .delete()
      .eq("template_id", templateId)
      .eq("evento_id", eventoId);

    setSalvandoId(null);

    if (error) {
      alert("Erro ao remover vínculo: " + error.message);
      return;
    }

    await carregarTudo();
  }

  async function alternarEvento(evento: Evento) {
    if (eventosVinculadosIds.has(evento.id)) {
      await removerVinculo(evento.id);
      return;
    }

    await vincularEvento(evento);
  }

  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <div style={eyebrow}>Admin OmniStage</div>
          <h1 style={h1}>Eventos do modelo</h1>
          <p style={subtitle}>
            Defina quais eventos podem usar este modelo de convite.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin/modelos-convites";
          }}
          style={btnGhost}
        >
          Voltar para modelos
        </button>
      </section>

      <section style={summaryGrid}>
        <div style={summaryCard}>
          <span style={summaryLabel}>Modelo</span>
          <strong style={summaryValue}>
            {template?.nome || template?.name || "Carregando..."}
          </strong>
          <small style={summarySmall}>/{template?.slug || "sem-slug"}</small>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>Eventos vinculados</span>
          <strong style={summaryValue}>{totalVinculados}</strong>
          <small style={summarySmall}>Aparecem no app do cliente</small>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>Eventos disponíveis</span>
          <strong style={summaryValue}>{eventos.length}</strong>
          <small style={summarySmall}>Eventos cadastrados no sistema</small>
        </div>
      </section>

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <h2 style={h2}>Selecionar eventos permitidos</h2>
            <p style={smallText}>
              Marque os eventos que poderão visualizar e aplicar este modelo no
              Convite Digital.
            </p>
          </div>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome do evento, status, data ou cliente..."
          style={searchInput}
        />

        {loading ? (
          <div style={emptyBox}>Carregando eventos...</div>
        ) : eventosFiltrados.length === 0 ? (
          <div style={emptyBox}>Nenhum evento encontrado.</div>
        ) : (
          <div style={eventList}>
            {eventosFiltrados.map((evento) => {
              const vinculado = eventosVinculadosIds.has(evento.id);
              const salvando = salvandoId === evento.id;

              return (
                <article
                  key={evento.id}
                  style={{
                    ...eventCard,
                    borderColor: vinculado ? "#7c3aed" : "#e2e8f0",
                    background: vinculado ? "#faf5ff" : "#ffffff",
                  }}
                >
                  <div style={eventMain}>
                    <div
                      style={{
                        ...checkBox,
                        background: vinculado ? "#7c3aed" : "#ffffff",
                        borderColor: vinculado ? "#7c3aed" : "#cbd5e1",
                        color: vinculado ? "#ffffff" : "transparent",
                      }}
                    >
                      ✓
                    </div>

                    <div>
                      <strong style={eventTitle}>
                        {evento.nome || "Evento sem nome"}
                      </strong>

                      <div style={eventMeta}>
                        <span>{formatarData(evento.data_evento)}</span>
                        <span>•</span>
                        <span>{evento.status || "Sem status"}</span>
                        {evento.tenant_id && (
                          <>
                            <span>•</span>
                            <span>Tenant: {evento.tenant_id.slice(0, 8)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => alternarEvento(evento)}
                    style={vinculado ? btnDangerSoft : btnPrimary}
                  >
                    {salvando
                      ? "Salvando..."
                      : vinculado
                      ? "Remover"
                      : "Vincular"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: 32,
  color: "#0f172a",
  background:
    "radial-gradient(circle at 20% 0%, #f5f3ff 0, transparent 34%), #f8fafc",
  boxSizing: "border-box",
};

const hero: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  marginBottom: 22,
  padding: 26,
  borderRadius: 28,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 16px 42px rgba(15,23,42,.06)",
};

const eyebrow: CSSProperties = {
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: ".12em",
};

const h1: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 42,
  lineHeight: 1,
  letterSpacing: "-.04em",
};

const subtitle: CSSProperties = {
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: 16,
  fontWeight: 700,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const summaryCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 14px 34px rgba(15,23,42,.05)",
};

const summaryLabel: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 8,
};

const summaryValue: CSSProperties = {
  display: "block",
  fontSize: 28,
  letterSpacing: "-0.04em",
  color: "#0f172a",
};

const summarySmall: CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "#64748b",
  fontWeight: 700,
};

const card: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 26,
  padding: 24,
  boxShadow: "0 18px 48px rgba(15,23,42,.07)",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const h2: CSSProperties = {
  margin: 0,
  fontSize: 24,
  letterSpacing: "-0.03em",
};

const smallText: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 15,
  fontWeight: 700,
};

const searchInput: CSSProperties = {
  width: "100%",
  minHeight: 54,
  padding: "0 18px",
  borderRadius: 18,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  fontSize: 16,
  fontWeight: 700,
  boxSizing: "border-box",
  marginBottom: 18,
};

const eventList: CSSProperties = {
  display: "grid",
  gap: 12,
};

const eventCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: 16,
  transition: "all .2s ease",
};

const eventMain: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
};

const checkBox: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "2px solid #cbd5e1",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  fontWeight: 950,
  flexShrink: 0,
};

const eventTitle: CSSProperties = {
  display: "block",
  fontSize: 17,
  color: "#0f172a",
};

const eventMeta: CSSProperties = {
  marginTop: 6,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
};

const btnPrimary: CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 13,
  background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
  border: "none",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 12px 26px rgba(124,58,237,.20)",
};

const btnGhost: CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 13,
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  color: "#334155",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnDangerSoft: CSSProperties = {
  ...btnGhost,
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};

const emptyBox: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 18,
  padding: 24,
  color: "#64748b",
  background: "#f8fafc",
  textAlign: "center",
  fontWeight: 800,
};
