"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Aba = "pessoas" | "nucleos";

type Pessoa = {
  id: string;
  tenant_id: string | null;
  nome: string;
  telefone: string | null;
  telefone_normalizado: string | null;
  email: string | null;
  tipo_contato: string | null;
  consentimento_comunicacao: boolean | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  origem: string | null;
  created_at: string | null;
};

type Nucleo = {
  id: string;
  tenant_id: string | null;
  nome: string;
  tipo: string | null;
  tipo_nucleo: string | null;
  descricao: string | null;
  origem: string | null;
  created_at: string | null;
};

type MembroNucleo = {
  id: string;
  tenant_id: string | null;
  grupo_contato_id: string;
  tenant_contato_id: string;
  papel: string | null;
  papel_nucleo: string | null;
  recebe_comunicacao: boolean | null;
  principal_envio: boolean | null;
};

type HistoricoEvento = {
  tenant_contato_id: string | null;
  evento_id: string | null;
  status_rsvp: string | null;
  status_checkin: string | null;
  eventos?: {
    nome?: string | null;
    data_evento?: string | null;
  } | null;
};

export default function ContatosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("pessoas");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [membros, setMembros] = useState<MembroNucleo[]>([]);
  const [historico, setHistorico] = useState<HistoricoEvento[]>([]);

  useEffect(() => {
    iniciarTela();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciarTela() {
    setLoading(true);

    try {
      const tenant = await carregarTenant();
      if (!tenant) return;

      await Promise.all([
        carregarPessoas(tenant),
        carregarNucleos(tenant),
        carregarMembros(tenant),
        carregarHistorico(tenant),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarTenant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return null;
    }

    const { data, error } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error || !data?.tenant_id) {
      alert("Este usuário ainda não está vinculado a uma empresa.");
      return null;
    }

    setTenantId(data.tenant_id);
    return data.tenant_id as string;
  }

  async function carregarPessoas(tenant: string) {
    const { data, error } = await supabase
      .from("tenant_contatos")
      .select(
        `
        id,
        tenant_id,
        nome,
        telefone,
        telefone_normalizado,
        email,
        tipo_contato,
        consentimento_comunicacao,
        responsavel_nome,
        responsavel_telefone,
        origem,
        created_at
      `,
      )
      .eq("tenant_id", tenant)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar pessoas: " + error.message);
      return;
    }

    setPessoas((data || []) as Pessoa[]);
  }

  async function carregarNucleos(tenant: string) {
    const { data, error } = await supabase
      .from("contato_grupos")
      .select(
        `
        id,
        tenant_id,
        nome,
        tipo,
        tipo_nucleo,
        descricao,
        origem,
        created_at
      `,
      )
      .eq("tenant_id", tenant)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar núcleos: " + error.message);
      return;
    }

    setNucleos((data || []) as Nucleo[]);
  }

  async function carregarMembros(tenant: string) {
    const { data, error } = await supabase
      .from("contato_grupo_membros")
      .select(
        `
        id,
        tenant_id,
        grupo_contato_id,
        tenant_contato_id,
        papel,
        papel_nucleo,
        recebe_comunicacao,
        principal_envio
      `,
      )
      .eq("tenant_id", tenant);

    if (error) {
      alert("Erro ao carregar membros dos núcleos: " + error.message);
      return;
    }

    setMembros((data || []) as MembroNucleo[]);
  }

  async function carregarHistorico(tenant: string) {
    const { data, error } = await supabase
      .from("convidados")
      .select(
        `
        tenant_contato_id,
        evento_id,
        status_rsvp,
        status_checkin,
        eventos (
          nome,
          data_evento
        )
      `,
      )
      .eq("tenant_id", tenant)
      .not("tenant_contato_id", "is", null);

    if (error) {
      console.error("Erro ao carregar histórico:", error.message);
      setHistorico([]);
      return;
    }

    setHistorico((data || []) as HistoricoEvento[]);
  }

  const pessoasPorId = useMemo(() => {
    return new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  }, [pessoas]);

  const membrosPorPessoa = useMemo(() => {
    const mapa = new Map<string, MembroNucleo[]>();

    membros.forEach((membro) => {
      const atual = mapa.get(membro.tenant_contato_id) || [];
      mapa.set(membro.tenant_contato_id, [...atual, membro]);
    });

    return mapa;
  }, [membros]);

  const membrosPorNucleo = useMemo(() => {
    const mapa = new Map<string, MembroNucleo[]>();

    membros.forEach((membro) => {
      const atual = mapa.get(membro.grupo_contato_id) || [];
      mapa.set(membro.grupo_contato_id, [...atual, membro]);
    });

    return mapa;
  }, [membros]);

  const nucleosPorId = useMemo(() => {
    return new Map(nucleos.map((nucleo) => [nucleo.id, nucleo]));
  }, [nucleos]);

  const historicoPorPessoa = useMemo(() => {
    const mapa = new Map<string, HistoricoEvento[]>();

    historico.forEach((item) => {
      if (!item.tenant_contato_id) return;

      const atual = mapa.get(item.tenant_contato_id) || [];
      mapa.set(item.tenant_contato_id, [...atual, item]);
    });

    return mapa;
  }, [historico]);

  const pessoasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return pessoas.filter((pessoa) => {
      const vinculos = membrosPorPessoa.get(pessoa.id) || [];
      const nomesNucleos = vinculos
        .map((membro) => nucleosPorId.get(membro.grupo_contato_id)?.nome)
        .filter(Boolean)
        .join(" ");

      if (!termo) return true;

      return [
        pessoa.nome,
        pessoa.telefone,
        pessoa.email,
        pessoa.tipo_contato,
        pessoa.responsavel_nome,
        pessoa.responsavel_telefone,
        nomesNucleos,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [pessoas, busca, membrosPorPessoa, nucleosPorId]);

  const nucleosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return nucleos.filter((nucleo) => {
      const vinculos = membrosPorNucleo.get(nucleo.id) || [];
      const nomesMembros = vinculos
        .map((membro) => pessoasPorId.get(membro.tenant_contato_id)?.nome)
        .filter(Boolean)
        .join(" ");

      if (!termo) return true;

      return [
        nucleo.nome,
        nucleo.tipo,
        nucleo.tipo_nucleo,
        nucleo.descricao,
        nomesMembros,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [nucleos, busca, membrosPorNucleo, pessoasPorId]);

  const totalComTelefone = pessoas.filter((pessoa) => pessoa.telefone).length;
  const totalComEmail = pessoas.filter((pessoa) => pessoa.email).length;
  const totalRecebeComunicacao = membros.filter(
    (membro) => membro.recebe_comunicacao || membro.principal_envio,
  ).length;

  const totalFamilias = nucleos.filter(
    (nucleo) => getTipoNucleo(nucleo) === "familia",
  ).length;

  return (
    <main style={pageStyle}>
      <section style={heroCardStyle}>
        <div>
          <div style={eyebrowStyle}>OmniStage CRM</div>
          <h1 style={pageTitleStyle}>Contatos</h1>
          <p style={pageSubtitleStyle}>
            Base permanente de pessoas e núcleos. Use para histórico de eventos,
            famílias, empresas, grupos políticos e comunicação futura.
          </p>
        </div>

        <div style={tabsStyle}>
          <button
            type="button"
            onClick={() => setAba("pessoas")}
            style={aba === "pessoas" ? tabActiveStyle : tabStyle}
          >
            Pessoas
          </button>

          <button
            type="button"
            onClick={() => setAba("nucleos")}
            style={aba === "nucleos" ? tabActiveStyle : tabStyle}
          >
            Núcleos
          </button>
        </div>
      </section>

      <section style={metricsGridStyle}>
        {aba === "pessoas" ? (
          <>
            <MetricCard label="Pessoas" value={pessoas.length} />
            <MetricCard label="Com telefone" value={totalComTelefone} />
            <MetricCard label="Com e-mail" value={totalComEmail} />
            <MetricCard label="Recebem comunicação" value={totalRecebeComunicacao} />
          </>
        ) : (
          <>
            <MetricCard label="Núcleos" value={nucleos.length} />
            <MetricCard label="Famílias" value={totalFamilias} />
            <MetricCard label="Membros vinculados" value={membros.length} />
            <MetricCard
              label="Responsáveis"
              value={membros.filter((membro) => getPapelMembro(membro) === "responsavel").length}
            />
          </>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={cardTitleStyle}>
              {aba === "pessoas" ? "Pessoas" : "Núcleos"}
            </h2>
            <p style={sectionSubtitleStyle}>
              {aba === "pessoas"
                ? "Pessoas únicas do cliente, com histórico e vínculos."
                : "Agrupamentos como famílias, empresas, políticos, igrejas ou associações."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => alert("Criação manual será a próxima etapa.")}
            style={buttonStyle}
          >
            {aba === "pessoas" ? "+ Nova pessoa" : "+ Novo núcleo"}
          </button>
        </div>

        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder={
            aba === "pessoas"
              ? "Buscar por nome, telefone, e-mail, responsável ou núcleo..."
              : "Buscar por nome do núcleo, tipo ou membro..."
          }
          style={inputStyle}
        />

        {loading && <div style={emptyStyle}>Carregando contatos...</div>}

        {!loading && aba === "pessoas" && pessoasFiltradas.length === 0 && (
          <div style={emptyStyle}>Nenhuma pessoa encontrada.</div>
        )}

        {!loading && aba === "nucleos" && nucleosFiltrados.length === 0 && (
          <div style={emptyStyle}>Nenhum núcleo encontrado.</div>
        )}

        {!loading && aba === "pessoas" && (
          <div style={listStyle}>
            {pessoasFiltradas.map((pessoa) => {
              const vinculos = membrosPorPessoa.get(pessoa.id) || [];
              const eventosPessoa = historicoPorPessoa.get(pessoa.id) || [];
              const ultimoEvento = getUltimoEvento(eventosPessoa);

              return (
                <article key={pessoa.id} style={cardStyle}>
                  <div style={cardMainStyle}>
                    <div style={avatarStyle}>{getInitials(pessoa.nome)}</div>

                    <div>
                      <h3 style={itemTitleStyle}>{pessoa.nome}</h3>

                      <p style={mutedStyle}>
                        {pessoa.telefone || "Sem telefone"} ·{" "}
                        {pessoa.email || "Sem e-mail"}
                      </p>

                      <div style={badgesStyle}>
                        <Badge>{labelTipoContato(pessoa.tipo_contato)}</Badge>

                        {pessoa.responsavel_nome && (
                          <Badge>
                            Responsável: {pessoa.responsavel_nome}
                          </Badge>
                        )}

                        {vinculos.length > 0 && (
                          <Badge>{vinculos.length} núcleo(s)</Badge>
                        )}

                        {eventosPessoa.length > 0 && (
                          <Badge>{eventosPessoa.length} evento(s)</Badge>
                        )}
                      </div>

                      {vinculos.length > 0 && (
                        <div style={miniListStyle}>
                          {vinculos.slice(0, 4).map((membro) => {
                            const nucleo = nucleosPorId.get(membro.grupo_contato_id);
                            if (!nucleo) return null;

                            return (
                              <span key={membro.id} style={miniItemStyle}>
                                {nucleo.nome} · {labelPapel(getPapelMembro(membro))}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {ultimoEvento && (
                        <p style={smallMutedStyle}>
                          Último evento:{" "}
                          <strong>{ultimoEvento.eventos?.nome || "Evento"}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={actionsColumnStyle}>
                    <button
                      type="button"
                      onClick={() => alert("Detalhe da pessoa será a próxima etapa.")}
                      style={secondaryButtonStyle}
                    >
                      Ver histórico
                    </button>

                    <button
                      type="button"
                      onClick={() => alert("Edição da pessoa será a próxima etapa.")}
                      style={secondaryButtonStyle}
                    >
                      Editar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && aba === "nucleos" && (
          <div style={listStyle}>
            {nucleosFiltrados.map((nucleo) => {
              const vinculos = membrosPorNucleo.get(nucleo.id) || [];
              const responsaveis = vinculos.filter(
                (membro) => getPapelMembro(membro) === "responsavel",
              );
              const membrosComPessoa = vinculos
                .map((membro) => ({
                  membro,
                  pessoa: pessoasPorId.get(membro.tenant_contato_id),
                }))
                .filter((item) => item.pessoa);

              return (
                <article key={nucleo.id} style={cardStyle}>
                  <div style={cardMainStyle}>
                    <div style={nucleoIconStyle}>N</div>

                    <div>
                      <h3 style={itemTitleStyle}>{nucleo.nome}</h3>

                      <p style={mutedStyle}>
                        Tipo: {labelTipoNucleo(getTipoNucleo(nucleo))} ·{" "}
                        {vinculos.length} membro(s) · {responsaveis.length} responsável(is)
                      </p>

                      {nucleo.descricao && (
                        <p style={smallMutedStyle}>{nucleo.descricao}</p>
                      )}

                      <div style={badgesStyle}>
                        <Badge>{labelTipoNucleo(getTipoNucleo(nucleo))}</Badge>
                        <Badge>{vinculos.length} membro(s)</Badge>
                        <Badge>{responsaveis.length} responsável(is)</Badge>
                      </div>

                      <div style={miniListStyle}>
                        {membrosComPessoa.slice(0, 8).map(({ membro, pessoa }) => (
                          <span key={membro.id} style={miniItemStyle}>
                            {pessoa?.nome} · {labelPapel(getPapelMembro(membro))}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={actionsColumnStyle}>
                    <button
                      type="button"
                      onClick={() => alert("Detalhe do núcleo será a próxima etapa.")}
                      style={secondaryButtonStyle}
                    >
                      Ver membros
                    </button>

                    <button
                      type="button"
                      onClick={() => alert("Importar núcleo para evento será etapa futura.")}
                      style={secondaryButtonStyle}
                    >
                      Importar para evento
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={metricCardStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span style={badgeStyle}>{children}</span>;
}

function getTipoNucleo(nucleo: Nucleo) {
  return nucleo.tipo_nucleo || nucleo.tipo || "familia";
}

function getPapelMembro(membro: MembroNucleo) {
  return membro.papel_nucleo || membro.papel || "membro";
}

function labelTipoContato(tipo: string | null) {
  if (tipo === "crianca") return "Criança";
  if (tipo === "dependente") return "Dependente";
  if (tipo === "individual") return "Individual";
  if (tipo === "adulto") return "Adulto";
  if (tipo === "principal") return "Principal";
  return "Pessoa";
}

function labelTipoNucleo(tipo: string | null) {
  if (tipo === "familia") return "Família";
  if (tipo === "empresa") return "Empresa";
  if (tipo === "politico") return "Político";
  if (tipo === "corporativo") return "Corporativo";
  if (tipo === "igreja") return "Igreja";
  if (tipo === "associacao") return "Associação";
  if (tipo === "fornecedor") return "Fornecedor";
  return "Outro";
}

function labelPapel(papel: string | null) {
  if (papel === "responsavel") return "Responsável";
  if (papel === "crianca") return "Criança";
  if (papel === "filho") return "Filho";
  if (papel === "filha") return "Filha";
  if (papel === "conjuge") return "Cônjuge";
  if (papel === "lider") return "Líder";
  if (papel === "financeiro") return "Financeiro";
  return "Membro";
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function getUltimoEvento(eventos: HistoricoEvento[]) {
  return [...eventos].sort((a, b) => {
    const dataA = a.eventos?.data_evento || "";
    const dataB = b.eventos?.data_evento || "";
    return dataB.localeCompare(dataA);
  })[0];
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "clamp(14px, 3vw, 24px)",
  background: "#f3f4f6",
  color: "#0f172a",
};

const heroCardStyle: CSSProperties = {
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
  border: "1px solid #e5e7eb",
  background: "linear-gradient(135deg, #ffffff, #f9fafb)",
  boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 38,
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const pageSubtitleStyle: CSSProperties = {
  color: "#6b7280",
  margin: "10px 0 0",
  fontSize: 17,
  lineHeight: 1.45,
  maxWidth: 780,
};

const tabsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const tabStyle: CSSProperties = {
  minHeight: 48,
  padding: "12px 18px",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#374151",
  fontWeight: 950,
  cursor: "pointer",
};

const tabActiveStyle: CSSProperties = {
  ...tabStyle,
  border: "1px solid rgba(124,58,237,0.24)",
  background: "#ede9fe",
  color: "#6d28d9",
};

const metricsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  gap: 14,
  marginTop: 18,
};

const metricCardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 22,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const metricLabelStyle: CSSProperties = {
  display: "block",
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const metricValueStyle: CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "#0f172a",
  fontSize: 30,
  fontWeight: 950,
};

const sectionStyle: CSSProperties = {
  marginTop: 18,
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 14px 45px rgba(15,23,42,0.07)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
  flexWrap: "wrap",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#6b7280",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 54,
  padding: "0 18px",
  borderRadius: 18,
  background: "#ffffff",
  color: "#0f172a",
  border: "1px solid #d1d5db",
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
  marginBottom: 18,
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  minHeight: 52,
  borderRadius: 999,
  background: "#43a500",
  border: "none",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 8px 22px rgba(67,165,0,0.22)",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  minHeight: 42,
  borderRadius: 999,
  background: "#ffffff",
  border: "1px solid #d1d5db",
  color: "#374151",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const cardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 18,
  padding: "clamp(14px, 4vw, 20px)",
  borderRadius: 22,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  flexWrap: "wrap",
};

const cardMainStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  flex: "1 1 420px",
  minWidth: 0,
};

const avatarStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: "#ede9fe",
  color: "#6d28d9",
  fontWeight: 950,
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
};

const nucleoIconStyle: CSSProperties = {
  ...avatarStyle,
  background: "#ecfdf5",
  color: "#047857",
};

const itemTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 950,
  letterSpacing: "-0.02em",
};

const mutedStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontWeight: 700,
};

const smallMutedStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 700,
};

const badgesStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#ffffff",
  color: "#6d28d9",
  border: "1px solid rgba(124,58,237,0.18)",
  fontSize: 12,
  fontWeight: 950,
};

const miniListStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const miniItemStyle: CSSProperties = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: 12,
  fontWeight: 900,
};

const actionsColumnStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "flex-start",
  flexDirection: "column",
  gap: 8,
  flex: "0 0 180px",
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed #d1d5db",
  color: "#6b7280",
  fontWeight: 800,
};
