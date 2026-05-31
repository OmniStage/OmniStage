"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Aba = "pessoas" | "nucleos";
type ModalTipo = "historico" | "editarPessoa" | "importarPessoa" | "membrosNucleo" | "importarNucleo" | null;

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

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
};

type PessoaForm = {
  nome: string;
  telefone: string;
  email: string;
  tipo_contato: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  consentimento_comunicacao: boolean;
};

const pessoaFormVazio: PessoaForm = {
  nome: "",
  telefone: "",
  email: "",
  tipo_contato: "pessoa",
  responsavel_nome: "",
  responsavel_telefone: "",
  consentimento_comunicacao: false,
};

export default function ContatosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("pessoas");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [acaoLoading, setAcaoLoading] = useState(false);

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [membros, setMembros] = useState<MembroNucleo[]>([]);
  const [historico, setHistorico] = useState<HistoricoEvento[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const [modal, setModal] = useState<ModalTipo>(null);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [nucleoSelecionado, setNucleoSelecionado] = useState<Nucleo | null>(null);
  const [eventoImportacaoId, setEventoImportacaoId] = useState("");
  const [pessoaForm, setPessoaForm] = useState<PessoaForm>(pessoaFormVazio);

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
        carregarEventos(tenant),
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

  async function carregarEventos(tenant: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome, data_evento")
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar eventos:", error.message);
      setEventos([]);
      return;
    }

    setEventos((data || []) as Evento[]);
  }

  function abrirHistorico(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    setModal("historico");
  }

  function abrirEditarPessoa(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    setPessoaForm({
      nome: pessoa.nome || "",
      telefone: pessoa.telefone || "",
      email: pessoa.email || "",
      tipo_contato: pessoa.tipo_contato || "pessoa",
      responsavel_nome: pessoa.responsavel_nome || "",
      responsavel_telefone: pessoa.responsavel_telefone || "",
      consentimento_comunicacao: Boolean(pessoa.consentimento_comunicacao),
    });
    setModal("editarPessoa");
  }

  function abrirImportarPessoa(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    setEventoImportacaoId(eventos[0]?.id || "");
    setModal("importarPessoa");
  }

  function abrirMembrosNucleo(nucleo: Nucleo) {
    setNucleoSelecionado(nucleo);
    setPessoaSelecionada(null);
    setModal("membrosNucleo");
  }

  function abrirImportarNucleo(nucleo: Nucleo) {
    setNucleoSelecionado(nucleo);
    setPessoaSelecionada(null);
    setEventoImportacaoId(eventos[0]?.id || "");
    setModal("importarNucleo");
  }

  function fecharModal() {
    setModal(null);
    setPessoaSelecionada(null);
    setNucleoSelecionado(null);
    setPessoaForm(pessoaFormVazio);
    setEventoImportacaoId("");
    setAcaoLoading(false);
  }

  function updatePessoaForm(field: keyof PessoaForm, value: string | boolean) {
    setPessoaForm((current) => ({ ...current, [field]: value }));
  }

  async function salvarPessoa() {
    if (!tenantId || !pessoaSelecionada) return;

    if (!pessoaForm.nome.trim()) {
      alert("Informe o nome da pessoa.");
      return;
    }

    setAcaoLoading(true);

    try {
      const telefoneNormalizado = normalizarTelefone(pessoaForm.telefone);

      const { error } = await supabase
        .from("tenant_contatos")
        .update({
          nome: pessoaForm.nome.trim(),
          telefone: pessoaForm.telefone.trim() || null,
          telefone_normalizado: telefoneNormalizado || null,
          email: pessoaForm.email.trim() || null,
          tipo_contato: pessoaForm.tipo_contato || null,
          responsavel_nome: pessoaForm.responsavel_nome.trim() || null,
          responsavel_telefone: pessoaForm.responsavel_telefone.trim() || null,
          consentimento_comunicacao: pessoaForm.consentimento_comunicacao,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pessoaSelecionada.id)
        .eq("tenant_id", tenantId);

      if (error) {
        throw new Error(error.message);
      }

      await carregarPessoas(tenantId);
      fecharModal();
      alert("Pessoa atualizada.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar pessoa.");
    } finally {
      setAcaoLoading(false);
    }
  }

  async function importarPessoaParaEvento() {
    if (!tenantId || !pessoaSelecionada || !eventoImportacaoId) {
      alert("Selecione um evento.");
      return;
    }

    setAcaoLoading(true);

    try {
      const jaExiste = await convidadoJaExisteNoEvento({
        tenantContatoId: pessoaSelecionada.id,
        eventoId: eventoImportacaoId,
      });

      if (jaExiste) {
        alert("Esta pessoa já está como convidada neste evento.");
        return;
      }

      const { error } = await supabase.from("convidados").insert({
        tenant_id: tenantId,
        evento_id: eventoImportacaoId,
        tenant_contato_id: pessoaSelecionada.id,
        nome: pessoaSelecionada.nome,
        telefone: pessoaSelecionada.telefone,
        email: pessoaSelecionada.email,
        token: gerarToken(),
        status_rsvp: "pendente",
        status_envio: "pendente",
        status_checkin: "nao_entrou",
        tipo_convite: "individual",
        contato_principal: true,
        recebe_convite: Boolean(pessoaSelecionada.telefone),
        origem_importacao: "contatos",
      });

      if (error) {
        throw new Error(error.message);
      }

      await carregarHistorico(tenantId);
      fecharModal();
      alert("Pessoa importada para o evento.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao importar pessoa.");
    } finally {
      setAcaoLoading(false);
    }
  }

  async function importarNucleoParaEvento() {
    if (!tenantId || !nucleoSelecionado || !eventoImportacaoId) {
      alert("Selecione um evento.");
      return;
    }

    const vinculos = membrosPorNucleo.get(nucleoSelecionado.id) || [];
    const membrosValidos = vinculos
      .map((membro) => ({
        membro,
        pessoa: pessoasPorId.get(membro.tenant_contato_id),
      }))
      .filter((item): item is { membro: MembroNucleo; pessoa: Pessoa } =>
        Boolean(item.pessoa),
      );

    if (membrosValidos.length === 0) {
      alert("Este núcleo não possui membros válidos.");
      return;
    }

    setAcaoLoading(true);

    try {
      let criados = 0;
      let ignorados = 0;

      for (const { membro, pessoa } of membrosValidos) {
        const jaExiste = await convidadoJaExisteNoEvento({
          tenantContatoId: pessoa.id,
          eventoId: eventoImportacaoId,
        });

        if (jaExiste) {
          ignorados += 1;
          continue;
        }

        const papel = getPapelMembro(membro);
        const contatoPrincipal = papel === "responsavel" || Boolean(membro.principal_envio);

        const { error } = await supabase.from("convidados").insert({
          tenant_id: tenantId,
          evento_id: eventoImportacaoId,
          tenant_contato_id: pessoa.id,
          nome: pessoa.nome,
          telefone: pessoa.telefone,
          email: pessoa.email,
          grupo: nucleoSelecionado.nome,
          token: gerarToken(),
          status_rsvp: "pendente",
          status_envio: "pendente",
          status_checkin: "nao_entrou",
          tipo_convite: "grupo",
          crianca: papel === "crianca" ? "sim" : null,
          contato_principal: contatoPrincipal,
          recebe_convite: Boolean(membro.recebe_comunicacao || contatoPrincipal || pessoa.telefone),
          responsavel: pessoa.responsavel_nome,
          responsavel_telefone: pessoa.responsavel_telefone,
          origem_importacao: "nucleo_contatos",
        });

        if (error) {
          throw new Error(error.message);
        }

        criados += 1;
      }

      await carregarHistorico(tenantId);
      fecharModal();
      alert(`Núcleo importado. Criados: ${criados}. Ignorados por duplicidade: ${ignorados}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao importar núcleo.");
    } finally {
      setAcaoLoading(false);
    }
  }

  async function convidadoJaExisteNoEvento({
    tenantContatoId,
    eventoId,
  }: {
    tenantContatoId: string;
    eventoId: string;
  }) {
    if (!tenantId) return false;

    const { data, error } = await supabase
      .from("convidados")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("evento_id", eventoId)
      .eq("tenant_contato_id", tenantContatoId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
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
          <div style={compactGridStyle}>
            {pessoasFiltradas.map((pessoa) => {
              const vinculos = membrosPorPessoa.get(pessoa.id) || [];
              const eventosPessoa = historicoPorPessoa.get(pessoa.id) || [];
              const ultimoEvento = getUltimoEvento(eventosPessoa);

              return (
                <article key={pessoa.id} style={compactCardStyle}>
                  <div style={compactCardTopStyle}>
                    <div style={avatarStyle}>{getInitials(pessoa.nome)}</div>

                    <div style={{ minWidth: 0 }}>
                      <h3 style={itemTitleStyle}>{pessoa.nome}</h3>

                      <p style={mutedStyle}>
                        {pessoa.telefone || "Sem telefone"} ·{" "}
                        {pessoa.email || "Sem e-mail"}
                      </p>
                    </div>
                  </div>

                  <div style={badgesStyle}>
                    <Badge>{labelTipoContato(pessoa.tipo_contato)}</Badge>

                    {pessoa.responsavel_nome && (
                      <Badge>Resp.: {pessoa.responsavel_nome}</Badge>
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
                      {vinculos.slice(0, 3).map((membro) => {
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

                  <div style={compactActionsStyle}>
                    <button
                      type="button"
                      onClick={() => abrirHistorico(pessoa)}
                      style={secondaryButtonStyle}
                    >
                      Histórico
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirImportarPessoa(pessoa)}
                      style={secondaryButtonStyle}
                    >
                      Importar
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirEditarPessoa(pessoa)}
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
          <div style={compactGridStyle}>
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
                <article key={nucleo.id} style={compactCardStyle}>
                  <div style={compactCardTopStyle}>
                    <div style={nucleoIconStyle}>N</div>

                    <div style={{ minWidth: 0 }}>
                      <h3 style={itemTitleStyle}>{nucleo.nome}</h3>

                      <p style={mutedStyle}>
                        Tipo: {labelTipoNucleo(getTipoNucleo(nucleo))} ·{" "}
                        {vinculos.length} membro(s)
                      </p>
                    </div>
                  </div>

                  {nucleo.descricao && (
                    <p style={smallMutedStyle}>{nucleo.descricao}</p>
                  )}

                  <div style={badgesStyle}>
                    <Badge>{labelTipoNucleo(getTipoNucleo(nucleo))}</Badge>
                    <Badge>{vinculos.length} membro(s)</Badge>
                    <Badge>{responsaveis.length} responsável(is)</Badge>
                  </div>

                  <div style={miniListStyle}>
                    {membrosComPessoa.slice(0, 5).map(({ membro, pessoa }) => (
                      <span key={membro.id} style={miniItemStyle}>
                        {pessoa?.nome} · {labelPapel(getPapelMembro(membro))}
                      </span>
                    ))}
                  </div>

                  <div style={compactActionsStyle}>
                    <button
                      type="button"
                      onClick={() => abrirMembrosNucleo(nucleo)}
                      style={secondaryButtonStyle}
                    >
                      Membros
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirImportarNucleo(nucleo)}
                      style={secondaryButtonStyle}
                    >
                      Importar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modal && (
        <div
          style={modalOverlayStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharModal();
          }}
        >
          <section style={modalCardStyle} onMouseDown={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>Contatos</div>
                <h2 style={modalTitleStyle}>{getModalTitulo(modal)}</h2>
              </div>

              <button type="button" onClick={fecharModal} style={secondaryButtonStyle}>
                Fechar
              </button>
            </div>

            {modal === "historico" && pessoaSelecionada && (
              <HistoricoPessoa
                pessoa={pessoaSelecionada}
                eventos={historicoPorPessoa.get(pessoaSelecionada.id) || []}
                vinculos={membrosPorPessoa.get(pessoaSelecionada.id) || []}
                nucleosPorId={nucleosPorId}
              />
            )}

            {modal === "editarPessoa" && pessoaSelecionada && (
              <div style={modalFormStyle}>
                <label style={fieldStyle}>
                  <span>Nome</span>
                  <input
                    value={pessoaForm.nome}
                    onChange={(event) => updatePessoaForm("nome", event.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span>Telefone</span>
                  <input
                    value={pessoaForm.telefone}
                    onChange={(event) => updatePessoaForm("telefone", event.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span>E-mail</span>
                  <input
                    value={pessoaForm.email}
                    onChange={(event) => updatePessoaForm("email", event.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span>Tipo</span>
                  <select
                    value={pessoaForm.tipo_contato}
                    onChange={(event) => updatePessoaForm("tipo_contato", event.target.value)}
                    style={inputStyle}
                  >
                    <option value="pessoa">Pessoa</option>
                    <option value="principal">Principal</option>
                    <option value="adulto">Adulto</option>
                    <option value="dependente">Dependente</option>
                    <option value="crianca">Criança</option>
                    <option value="individual">Individual</option>
                  </select>
                </label>

                <label style={fieldStyle}>
                  <span>Responsável</span>
                  <input
                    value={pessoaForm.responsavel_nome}
                    onChange={(event) => updatePessoaForm("responsavel_nome", event.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span>Telefone do responsável</span>
                  <input
                    value={pessoaForm.responsavel_telefone}
                    onChange={(event) => updatePessoaForm("responsavel_telefone", event.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={toggleFieldStyle}>
                  <input
                    type="checkbox"
                    checked={pessoaForm.consentimento_comunicacao}
                    onChange={(event) =>
                      updatePessoaForm("consentimento_comunicacao", event.target.checked)
                    }
                  />
                  <span>Recebe comunicação / consentimento ativo</span>
                </label>

                <div style={modalActionsStyle}>
                  <button
                    type="button"
                    onClick={salvarPessoa}
                    disabled={acaoLoading}
                    style={buttonStyle}
                  >
                    {acaoLoading ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </div>
            )}

            {modal === "importarPessoa" && pessoaSelecionada && (
              <ImportarPessoaModal
                pessoa={pessoaSelecionada}
                eventos={eventos}
                eventoId={eventoImportacaoId}
                setEventoId={setEventoImportacaoId}
                onImportar={importarPessoaParaEvento}
                loading={acaoLoading}
              />
            )}

            {modal === "membrosNucleo" && nucleoSelecionado && (
              <MembrosNucleoModal
                nucleo={nucleoSelecionado}
                membros={membrosPorNucleo.get(nucleoSelecionado.id) || []}
                pessoasPorId={pessoasPorId}
              />
            )}

            {modal === "importarNucleo" && nucleoSelecionado && (
              <ImportarNucleoModal
                nucleo={nucleoSelecionado}
                membros={membrosPorNucleo.get(nucleoSelecionado.id) || []}
                pessoasPorId={pessoasPorId}
                eventos={eventos}
                eventoId={eventoImportacaoId}
                setEventoId={setEventoImportacaoId}
                onImportar={importarNucleoParaEvento}
                loading={acaoLoading}
              />
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function HistoricoPessoa({
  pessoa,
  eventos,
  vinculos,
  nucleosPorId,
}: {
  pessoa: Pessoa;
  eventos: HistoricoEvento[];
  vinculos: MembroNucleo[];
  nucleosPorId: Map<string, Nucleo>;
}) {
  return (
    <div style={modalContentStyle}>
      <h3 style={itemTitleStyle}>{pessoa.nome}</h3>

      <p style={mutedStyle}>
        {pessoa.telefone || "Sem telefone"} · {pessoa.email || "Sem e-mail"}
      </p>

      <div style={detailBlockStyle}>
        <strong>Núcleos</strong>

        {vinculos.length === 0 && <span style={mutedStyle}>Sem núcleo vinculado.</span>}

        {vinculos.map((vinculo) => {
          const nucleo = nucleosPorId.get(vinculo.grupo_contato_id);
          if (!nucleo) return null;

          return (
            <div key={vinculo.id} style={detailRowStyle}>
              <span>{nucleo.nome}</span>
              <Badge>{labelPapel(getPapelMembro(vinculo))}</Badge>
            </div>
          );
        })}
      </div>

      <div style={detailBlockStyle}>
        <strong>Eventos</strong>

        {eventos.length === 0 && <span style={mutedStyle}>Sem histórico de eventos.</span>}

        {eventos.map((evento, index) => (
          <div key={`${evento.evento_id}-${index}`} style={detailRowStyle}>
            <span>
              {evento.eventos?.nome || "Evento"}{" "}
              {evento.eventos?.data_evento ? `· ${formatarData(evento.eventos.data_evento)}` : ""}
            </span>

            <span style={historyBadgesStyle}>
              <Badge>{labelRsvp(evento.status_rsvp)}</Badge>
              <Badge>{labelCheckin(evento.status_checkin)}</Badge>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportarPessoaModal({
  pessoa,
  eventos,
  eventoId,
  setEventoId,
  onImportar,
  loading,
}: {
  pessoa: Pessoa;
  eventos: Evento[];
  eventoId: string;
  setEventoId: (value: string) => void;
  onImportar: () => void;
  loading: boolean;
}) {
  return (
    <div style={modalContentStyle}>
      <p style={mutedStyle}>
        Importe <strong>{pessoa.nome}</strong> para um evento. O sistema criará
        um convidado novo vinculado a esta pessoa.
      </p>

      <label style={fieldStyle}>
        <span>Evento</span>
        <select
          value={eventoId}
          onChange={(event) => setEventoId(event.target.value)}
          style={inputStyle}
        >
          <option value="">Selecione um evento</option>
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome}
            </option>
          ))}
        </select>
      </label>

      <div style={modalActionsStyle}>
        <button
          type="button"
          onClick={onImportar}
          disabled={loading || !eventoId}
          style={buttonStyle}
        >
          {loading ? "Importando..." : "Importar para evento"}
        </button>
      </div>
    </div>
  );
}

function MembrosNucleoModal({
  nucleo,
  membros,
  pessoasPorId,
}: {
  nucleo: Nucleo;
  membros: MembroNucleo[];
  pessoasPorId: Map<string, Pessoa>;
}) {
  return (
    <div style={modalContentStyle}>
      <h3 style={itemTitleStyle}>{nucleo.nome}</h3>

      <p style={mutedStyle}>
        Tipo: {labelTipoNucleo(getTipoNucleo(nucleo))} · {membros.length} membro(s)
      </p>

      <div style={detailBlockStyle}>
        {membros.length === 0 && <span style={mutedStyle}>Nenhum membro vinculado.</span>}

        {membros.map((membro) => {
          const pessoa = pessoasPorId.get(membro.tenant_contato_id);

          return (
            <div key={membro.id} style={detailRowStyle}>
              <span>{pessoa?.nome || "Pessoa não encontrada"}</span>
              <Badge>{labelPapel(getPapelMembro(membro))}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImportarNucleoModal({
  nucleo,
  membros,
  pessoasPorId,
  eventos,
  eventoId,
  setEventoId,
  onImportar,
  loading,
}: {
  nucleo: Nucleo;
  membros: MembroNucleo[];
  pessoasPorId: Map<string, Pessoa>;
  eventos: Evento[];
  eventoId: string;
  setEventoId: (value: string) => void;
  onImportar: () => void;
  loading: boolean;
}) {
  const membrosValidos = membros
    .map((membro) => pessoasPorId.get(membro.tenant_contato_id))
    .filter(Boolean);

  return (
    <div style={modalContentStyle}>
      <p style={mutedStyle}>
        Importe o núcleo <strong>{nucleo.nome}</strong> para um evento. Serão
        criados convidados para os membros vinculados.
      </p>

      <Badge>{membrosValidos.length} pessoa(s) no núcleo</Badge>

      <label style={fieldStyle}>
        <span>Evento</span>
        <select
          value={eventoId}
          onChange={(event) => setEventoId(event.target.value)}
          style={inputStyle}
        >
          <option value="">Selecione um evento</option>
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome}
            </option>
          ))}
        </select>
      </label>

      <div style={modalActionsStyle}>
        <button
          type="button"
          onClick={onImportar}
          disabled={loading || !eventoId}
          style={buttonStyle}
        >
          {loading ? "Importando..." : "Importar núcleo"}
        </button>
      </div>
    </div>
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

function normalizarTelefone(telefone: string | null) {
  if (!telefone) return "";
  return telefone.replace(/\D/g, "");
}

function gerarToken() {
  return "EVT-" + Math.floor(100000 + Math.random() * 900000);
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

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "RSVP confirmado";
  if (status === "nao") return "Não vai";
  return "RSVP pendente";
}

function labelCheckin(status: string | null) {
  if (status === "entrou") return "Entrou";
  if (status === "entrou_excecao" || status === "entrou_sem_rsvp") {
    return "Entrou sem RSVP";
  }

  return "Não entrou";
}

function formatarData(data: string | null) {
  if (!data) return "";

  const parsed = new Date(`${data}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("pt-BR");
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

function getModalTitulo(modal: ModalTipo) {
  if (modal === "historico") return "Histórico da pessoa";
  if (modal === "editarPessoa") return "Editar pessoa";
  if (modal === "importarPessoa") return "Importar pessoa para evento";
  if (modal === "membrosNucleo") return "Membros do núcleo";
  if (modal === "importarNucleo") return "Importar núcleo para evento";
  return "Contatos";
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

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#374151",
  fontSize: 14,
  fontWeight: 900,
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

const compactGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
  gap: 14,
};

const compactCardStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
  padding: 16,
  borderRadius: 22,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  minHeight: 0,
};

const compactCardTopStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  minWidth: 0,
};

const compactActionsStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 2,
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
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.02em",
  overflowWrap: "anywhere",
};

const mutedStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const smallMutedStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const badgesStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 8,
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
  marginTop: 8,
};

const miniItemStyle: CSSProperties = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: 12,
  fontWeight: 900,
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed #d1d5db",
  color: "#6b7280",
  fontWeight: 800,
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(12px, 3vw, 28px)",
  background: "rgba(15,23,42,0.38)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const modalCardStyle: CSSProperties = {
  width: "min(820px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  padding: 24,
  borderRadius: 28,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 28px 90px rgba(15,23,42,0.28)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 26,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const modalContentStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const modalFormStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 14,
};

const modalActionsStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 4,
};

const toggleFieldStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  color: "#374151",
  fontWeight: 900,
};

const detailBlockStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const detailRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  padding: "8px 0",
  borderTop: "1px solid #e5e7eb",
};

const historyBadgesStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};
