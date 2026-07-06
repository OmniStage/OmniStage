"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { aplicarMascaraTelefone, telefoneParaExibir, telefoneParaStorage } from "@/lib/phone";

type Aba = "pessoas" | "nucleos";
type VisualizacaoNucleo = "cards" | "lista";
type ModalTipo =
  | "criarPessoa"
  | "editarPessoa"
  | "historico"
  | "vinculosPessoa"
  | "importarPessoa"
  | "criarNucleo"
  | "editarNucleo"
  | "membrosNucleo"
  | "importarNucleo"
  | null;

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
  contato_principal: boolean | null;
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
  relacao_evento?: string | null;
  created_at?: string | null;
  eventos?:
    | {
        nome?: string | null;
        data_evento?: string | null;
      }
    | {
        nome?: string | null;
        data_evento?: string | null;
      }[]
    | null;
};

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
};

type Toast = {
  tipo: "sucesso" | "erro" | "info";
  titulo: string;
  mensagem?: string;
};

type ConfirmacaoAcao = {
  tipo: "excluirNucleo" | "excluirPessoa" | "removerVinculo";
  titulo: string;
  mensagem: string;
  destaque?: string;
  confirmLabel: string;
  nucleo?: Nucleo;
  pessoa?: Pessoa;
  membro?: MembroNucleo;
};

type PessoaForm = {
  nome: string;
  telefone: string;
  email: string;
  tipo_contato: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  idade_crianca: string;
  consentimento_comunicacao: boolean;
  agrupamento_familia: string;
  contato_principal: boolean;
};

type NucleoForm = {
  nome: string;
  tipo_nucleo: string;
  descricao: string;
};

const pessoaFormVazio: PessoaForm = {
  nome: "",
  telefone: "",
  email: "",
  tipo_contato: "adulto",
  responsavel_nome: "",
  responsavel_telefone: "",
  idade_crianca: "",
  consentimento_comunicacao: false,
  agrupamento_familia: "",
  contato_principal: false,
};

const nucleoFormVazio: NucleoForm = {
  nome: "",
  tipo_nucleo: "familia",
  descricao: "",
};

const tiposNucleoFiltro = [
  { value: "todos", label: "Todos" },
  { value: "familia", label: "Família" },
  { value: "escola", label: "Escola" },
  { value: "empresa", label: "Empresa" },
  { value: "igreja", label: "Igreja" },
  { value: "associacao", label: "Associação" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "corporativo", label: "Corporativo" },
  { value: "politico", label: "Político" },
  { value: "outro", label: "Outro" },
];

export default function ContatosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("pessoas");
  const [busca, setBusca] = useState("");
  const [tipoNucleoFiltro, setTipoNucleoFiltro] = useState("todos");
  const [visualizacaoNucleos, setVisualizacaoNucleos] = useState<VisualizacaoNucleo>("cards");
  const [nucleosExpandidos, setNucleosExpandidos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [acaoLoading, setAcaoLoading] = useState(false);

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [membros, setMembros] = useState<MembroNucleo[]>([]);
  const [historico, setHistorico] = useState<HistoricoEvento[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [agrupamentoPorContatoId, setAgrupamentoPorContatoId] = useState<Map<string, string>>(new Map());
  const [nucleoPorContatoId, setNucleoPorContatoId] = useState<Map<string, string>>(new Map());
  const [contatoPrincipalPorContatoId, setContatoPrincipalPorContatoId] = useState<Map<string, boolean>>(new Map());

  const [modal, setModal] = useState<ModalTipo>(null);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [nucleoSelecionado, setNucleoSelecionado] = useState<Nucleo | null>(null);
  const [eventoImportacaoId, setEventoImportacaoId] = useState("");
  const [relacaoEventoImportacao, setRelacaoEventoImportacao] = useState("");
  const [vinculoNucleoId, setVinculoNucleoId] = useState("");
  const [vinculoPessoaId, setVinculoPessoaId] = useState("");
  const [vinculoRelacao, setVinculoRelacao] = useState("membro");
  const [vinculoRecebeComunicacao, setVinculoRecebeComunicacao] = useState(false);
  const [vinculoPrincipalEnvio, setVinculoPrincipalEnvio] = useState(false);
  const [pessoaForm, setPessoaForm] = useState<PessoaForm>(pessoaFormVazio);
  const [nucleoForm, setNucleoForm] = useState<NucleoForm>(nucleoFormVazio);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmacaoAcao, setConfirmacaoAcao] = useState<ConfirmacaoAcao | null>(null);

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

  async function recarregarBase() {
    if (!tenantId) return;

    await Promise.all([
      carregarPessoas(tenantId),
      carregarNucleos(tenantId),
      carregarMembros(tenantId),
      carregarHistorico(tenantId),
      carregarEventos(tenantId),
    ]);
  }

  async function carregarTenant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      mostrarErro("Usuário não autenticado.");
      return null;
    }

    const { data, error } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();

    if (error || !data?.tenant_id) {
      mostrarErro("Empresa ativa não encontrada.", "Este usuário ainda não está vinculado a uma empresa ativa.");
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
      mostrarErro("Erro ao carregar pessoas.", error.message);
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
      mostrarErro("Erro ao carregar núcleos.", error.message);
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
      mostrarErro("Erro ao carregar membros dos núcleos.", error.message);
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
        relacao_evento,
        created_at,
        grupo,
        grupo_envio,
        contato_principal,
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

    // Monta mapas tenant_contato_id → grupo (agrupamento) e → grupo_envio (núcleo)
    // Usa o registro mais recente (created_at desc) como valor canônico
    const mapaAgrup = new Map<string, string>();
    const mapaNucleo = new Map<string, string>();
    const mapaData = new Map<string, string>();
    const mapaPrincipal = new Map<string, boolean>();
    for (const row of (data || [])) {
      const id = (row as any).tenant_contato_id;
      const grupo = (row as any).grupo;
      const grupoEnvio = (row as any).grupo_envio;
      const rowDate = (row as any).created_at || "";
      const principal = Boolean((row as any).contato_principal);
      if (id && grupo) {
        const dataAtual = mapaData.get(id) || "";
        if (rowDate >= dataAtual) {
          mapaAgrup.set(id, grupo);
          mapaData.set(id, rowDate);
          if (principal) mapaPrincipal.set(id, true);
        }
      }
      if (id && grupoEnvio && !mapaNucleo.has(id)) mapaNucleo.set(id, grupoEnvio);
    }
    setAgrupamentoPorContatoId(mapaAgrup);
    setNucleoPorContatoId(mapaNucleo);
    setContatoPrincipalPorContatoId(mapaPrincipal);
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
      const tipoNucleo = getTipoNucleo(nucleo);
      const vinculos = membrosPorNucleo.get(nucleo.id) || [];
      const nomesMembros = vinculos
        .map((membro) => pessoasPorId.get(membro.tenant_contato_id)?.nome)
        .filter(Boolean)
        .join(" ");

      if (tipoNucleoFiltro !== "todos" && tipoNucleo !== tipoNucleoFiltro) return false;

      if (!termo) return true;

      return [
        nucleo.nome,
        nucleo.tipo,
        nucleo.tipo_nucleo,
        labelTipoNucleo(tipoNucleo),
        nucleo.descricao,
        nomesMembros,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [nucleos, busca, tipoNucleoFiltro, membrosPorNucleo, pessoasPorId]);

  const totalComTelefone = pessoas.filter((pessoa) => pessoa.telefone).length;
  const totalComEmail = pessoas.filter((pessoa) => pessoa.email).length;
  const totalRecebeComunicacao = membros.filter(
    (membro) => membro.recebe_comunicacao || membro.principal_envio,
  ).length;
  const totalFamilias = nucleos.filter((nucleo) => getTipoNucleo(nucleo) === "familia").length;
  const totalEscolas = nucleos.filter((nucleo) => getTipoNucleo(nucleo) === "escola").length;
  const totalEmpresas = nucleos.filter((nucleo) => getTipoNucleo(nucleo) === "empresa").length;

  function limparFormularioVinculo() {
    setVinculoNucleoId("");
    setVinculoPessoaId("");
    setVinculoRelacao("membro");
    setVinculoRecebeComunicacao(false);
    setVinculoPrincipalEnvio(false);
  }

  function abrirCriarPessoa() {
    setPessoaSelecionada(null);
    setNucleoSelecionado(null);
    setPessoaForm(pessoaFormVazio);
    limparFormularioVinculo();
    setModal("criarPessoa");
  }

  function abrirEditarPessoa(pessoa: Pessoa) {
    const vinculoAtual = (membrosPorPessoa.get(pessoa.id) || [])[0] || null;
    const responsavelEfetivo = getResponsavelEfetivoDaPessoa(pessoa, vinculoAtual?.grupo_contato_id);
    const perfilContato = normalizarPerfilContato(pessoa.tipo_contato);

    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    setPessoaForm({
      nome: pessoa.nome || "",
      telefone: telefoneParaExibir(pessoa.telefone || ""),
      email: pessoa.email || "",
      tipo_contato: perfilContato,
      responsavel_nome: perfilContato === "crianca" ? pessoa.responsavel_nome?.trim() || "" : "",
      responsavel_telefone: perfilContato === "crianca" ? pessoa.responsavel_telefone?.trim() || "" : "",
      idade_crianca: "",
      consentimento_comunicacao: Boolean(pessoa.consentimento_comunicacao),
      agrupamento_familia: agrupamentoPorContatoId.get(pessoa.id) || "",
      contato_principal: contatoPrincipalPorContatoId.get(pessoa.id) || Boolean(pessoa.contato_principal),
    });

    if (vinculoAtual) {
      setVinculoNucleoId(vinculoAtual.grupo_contato_id || "");
      setVinculoPessoaId("");
      setVinculoRelacao(getPapelMembro(vinculoAtual));
      setVinculoRecebeComunicacao(Boolean(vinculoAtual.recebe_comunicacao || (perfilContato === "crianca" && responsavelEfetivo)));
      setVinculoPrincipalEnvio(Boolean(vinculoAtual.principal_envio));
    } else {
      limparFormularioVinculo();
    }

    setModal("editarPessoa");
  }

  function abrirHistorico(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    setModal("historico");
  }

  function abrirVinculosPessoa(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    limparFormularioVinculo();
    setModal("vinculosPessoa");
  }

  function abrirImportarPessoa(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa);
    setNucleoSelecionado(null);
    setEventoImportacaoId(eventos[0]?.id || "");
    setRelacaoEventoImportacao("");
    setModal("importarPessoa");
  }

  function abrirCriarNucleo() {
    setPessoaSelecionada(null);
    setNucleoSelecionado(null);
    setNucleoForm(nucleoFormVazio);
    setModal("criarNucleo");
  }

  function abrirEditarNucleo(nucleo: Nucleo) {
    setPessoaSelecionada(null);
    setNucleoSelecionado(nucleo);
    setNucleoForm({
      nome: nucleo.nome || "",
      tipo_nucleo: getTipoNucleo(nucleo),
      descricao: nucleo.descricao || "",
    });
    setModal("editarNucleo");
  }

  function abrirMembrosNucleo(nucleo: Nucleo) {
    setPessoaSelecionada(null);
    setNucleoSelecionado(nucleo);
    limparFormularioVinculo();
    setModal("membrosNucleo");
  }

  function abrirImportarNucleo(nucleo: Nucleo) {
    setPessoaSelecionada(null);
    setNucleoSelecionado(nucleo);
    setEventoImportacaoId(eventos[0]?.id || "");
    setRelacaoEventoImportacao("");
    setModal("importarNucleo");
  }

  function fecharModal() {
    setModal(null);
    setPessoaSelecionada(null);
    setNucleoSelecionado(null);
    setPessoaForm(pessoaFormVazio);
    setNucleoForm(nucleoFormVazio);
    setEventoImportacaoId("");
    setRelacaoEventoImportacao("");
    limparFormularioVinculo();
    setAcaoLoading(false);
  }

  function fecharConfirmacaoAcao() {
    if (acaoLoading) return;
    setConfirmacaoAcao(null);
  }

  function mostrarFeedback(tipo: Toast["tipo"], titulo: string, mensagem?: string) {
    setToast({ tipo, titulo, mensagem });

    window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  function mostrarErro(titulo: string, error?: unknown) {
    mostrarFeedback(
      "erro",
      titulo,
      error instanceof Error ? error.message : typeof error === "string" ? error : "Tente novamente em alguns instantes.",
    );
  }

  function mostrarInfo(titulo: string, mensagem?: string) {
    mostrarFeedback("info", titulo, mensagem);
  }

  function isPessoaCrianca(pessoa: Pessoa | null | undefined) {
    return normalizarPerfilContato(pessoa?.tipo_contato) === "crianca";
  }

  function isPapelCrianca(papel: string | null | undefined) {
    const papelNormalizado = String(papel || "").trim().toLowerCase();
    return ["crianca", "criança", "filho", "filha", "neto", "neta", "aluno", "aluna"].includes(papelNormalizado);
  }

  function getResponsavelPrincipalDoNucleo(nucleoId: string, excludePessoaId?: string) {
    const vinculos = membrosPorNucleo.get(nucleoId) || [];

    const candidatos = vinculos.filter((membro) => {
      if (excludePessoaId && membro.tenant_contato_id === excludePessoaId) return false;
      return Boolean(pessoasPorId.get(membro.tenant_contato_id));
    });

    const porPrioridade = [
      candidatos.find((membro) => Boolean(membro.principal_envio) && !isPessoaCrianca(pessoasPorId.get(membro.tenant_contato_id))),
      candidatos.find((membro) => getPapelMembro(membro) === "responsavel" && !isPessoaCrianca(pessoasPorId.get(membro.tenant_contato_id))),
      candidatos.find((membro) => Boolean(membro.recebe_comunicacao) && !isPessoaCrianca(pessoasPorId.get(membro.tenant_contato_id))),
      candidatos.find((membro) => Boolean(pessoasPorId.get(membro.tenant_contato_id)?.telefone) && !isPessoaCrianca(pessoasPorId.get(membro.tenant_contato_id))),
      candidatos.find((membro) => Boolean(membro.principal_envio)),
      candidatos.find((membro) => getPapelMembro(membro) === "responsavel"),
      candidatos.find((membro) => Boolean(membro.recebe_comunicacao)),
      candidatos.find((membro) => Boolean(pessoasPorId.get(membro.tenant_contato_id)?.telefone)),
    ].filter(Boolean) as MembroNucleo[];

    const vinculoResponsavel = porPrioridade[0] || null;
    if (!vinculoResponsavel) return null;

    return pessoasPorId.get(vinculoResponsavel.tenant_contato_id) || null;
  }

  function getResponsavelEfetivoDaPessoa(pessoa: Pessoa, nucleoPreferencialId?: string) {
    const responsavelDiretoNome = pessoa.responsavel_nome?.trim() || "";
    const responsavelDiretoTelefone = pessoa.responsavel_telefone?.trim() || "";

    if (responsavelDiretoNome || responsavelDiretoTelefone) {
      return {
        nome: responsavelDiretoNome,
        telefone: responsavelDiretoTelefone,
        origem: "contato" as const,
        nucleoId: null as string | null,
        nucleoNome: null as string | null,
      };
    }

    if (normalizarPerfilContato(pessoa.tipo_contato) !== "crianca") return null;

    const vinculos = membrosPorPessoa.get(pessoa.id) || [];
    const vinculosOrdenados = nucleoPreferencialId
      ? [
          ...vinculos.filter((membro) => membro.grupo_contato_id === nucleoPreferencialId),
          ...vinculos.filter((membro) => membro.grupo_contato_id !== nucleoPreferencialId),
        ]
      : vinculos;

    for (const vinculo of vinculosOrdenados) {
      const responsavel = getResponsavelPrincipalDoNucleo(vinculo.grupo_contato_id, pessoa.id);
      if (!responsavel) continue;

      const nome = responsavel.nome?.trim() || "";
      const telefone = responsavel.telefone?.trim() || "";
      if (!nome && !telefone) continue;

      return {
        nome,
        telefone,
        origem: "nucleo" as const,
        nucleoId: vinculo.grupo_contato_id,
        nucleoNome: nucleosPorId.get(vinculo.grupo_contato_id)?.nome || null,
      };
    }

    return null;
  }

  function preencherResponsavelPorNucleo(nucleoId: string) {
    if (!nucleoId) return;

    const responsavel = getResponsavelPrincipalDoNucleo(nucleoId, pessoaSelecionada?.id);
    if (!responsavel) return;

    setPessoaForm((current) => {
      if (normalizarPerfilContato(current.tipo_contato) !== "crianca") return current;

      return {
        ...current,
        responsavel_nome: responsavel.nome || current.responsavel_nome,
        responsavel_telefone: responsavel.telefone || current.responsavel_telefone,
      };
    });

    setVinculoRecebeComunicacao(true);
  }

  function selecionarNucleoInicialPessoa(nucleoId: string) {
    setVinculoNucleoId(nucleoId);

    if (nucleoId && normalizarPerfilContato(pessoaForm.tipo_contato) === "crianca") {
      if (vinculoRelacao === "membro") setVinculoRelacao("filho");
      preencherResponsavelPorNucleo(nucleoId);
      setVinculoRecebeComunicacao(true);
    }
  }

  function updatePessoaForm(field: keyof PessoaForm, value: string | boolean) {
    if (field === "tipo_contato") {
      const perfil = normalizarPerfilContato(String(value));
      const responsavelDoNucleo = perfil === "crianca" && vinculoNucleoId
        ? getResponsavelPrincipalDoNucleo(vinculoNucleoId, pessoaSelecionada?.id)
        : null;

      setPessoaForm((current) => ({
        ...current,
        tipo_contato: perfil,
        responsavel_nome: perfil === "crianca" ? (current.responsavel_nome || responsavelDoNucleo?.nome || "") : current.responsavel_nome,
        responsavel_telefone: perfil === "crianca" ? (current.responsavel_telefone || responsavelDoNucleo?.telefone || "") : current.responsavel_telefone,
      }));

      if (perfil === "crianca" && vinculoRelacao === "membro") {
        setVinculoRelacao("filho");
      }

      if (perfil === "crianca" && responsavelDoNucleo) {
        setVinculoRecebeComunicacao(true);
      }

      return;
    }

    setPessoaForm((current) => ({ ...current, [field]: value }));
  }

  function updateNucleoForm(field: keyof NucleoForm, value: string) {
    setNucleoForm((current) => ({ ...current, [field]: value }));
  }

  async function buscarContatoExistente({
    nome,
    telefoneNormalizado,
    ignorarPessoaId,
  }: {
    nome: string;
    telefoneNormalizado: string;
    ignorarPessoaId?: string;
  }) {
    if (!tenantId) return null;

    let query = supabase
      .from("tenant_contatos")
      .select("id, nome, telefone, telefone_normalizado")
      .eq("tenant_id", tenantId)
      .limit(1);

    if (telefoneNormalizado) {
      query = query.eq("telefone_normalizado", telefoneNormalizado);
    } else {
      query = query.eq("nome", nome.trim());
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.id) return null;
    if (ignorarPessoaId && data.id === ignorarPessoaId) return null;

    return data as { id: string; nome: string; telefone: string | null; telefone_normalizado: string | null };
  }

  async function salvarPessoa() {
    if (!tenantId) return;

    if (!pessoaForm.nome.trim()) {
      mostrarErro("Informe o nome da pessoa.");
      return;
    }

    setAcaoLoading(true);

    try {
      const telefoneNormalizado = normalizarTelefone(pessoaForm.telefone);
      const perfilContato = normalizarPerfilContato(pessoaForm.tipo_contato);
      const isCrianca = perfilContato === "crianca";
      const contatoExistente = await buscarContatoExistente({
        nome: pessoaForm.nome,
        telefoneNormalizado,
        ignorarPessoaId: pessoaSelecionada?.id,
      });
      const responsavelDoNucleo = isCrianca && vinculoNucleoId
        ? getResponsavelPrincipalDoNucleo(vinculoNucleoId, pessoaSelecionada?.id)
        : null;
      const responsavelFinalNome = isCrianca
        ? pessoaForm.responsavel_nome.trim() || responsavelDoNucleo?.nome?.trim() || ""
        : "";
      const responsavelFinalTelefone = isCrianca
        ? pessoaForm.responsavel_telefone.trim() || responsavelDoNucleo?.telefone?.trim() || ""
        : "";
      const recebeComunicacaoFinal = true;

      if (contatoExistente) {
        mostrarInfo(
          "Contato já cadastrado.",
          `Já existe um contato cadastrado para "${contatoExistente.nome}". Use o contato existente ou edite o cadastro atual para evitar duplicidade.`,
        );
        return;
      }

      const payload = {
        nome: pessoaForm.nome.trim(),
        telefone: telefoneParaStorage(pessoaForm.telefone.trim()) || null,
        telefone_normalizado: telefoneNormalizado || null,
        email: pessoaForm.email.trim() || null,
        tipo_contato: perfilContato,
        responsavel_nome: isCrianca ? responsavelFinalNome || null : null,
        responsavel_telefone: isCrianca ? telefoneParaStorage(responsavelFinalTelefone) || null : null,
        consentimento_comunicacao: pessoaForm.consentimento_comunicacao,
        updated_at: new Date().toISOString(),
      };

      const query = pessoaSelecionada
        ? await supabase
            .from("tenant_contatos")
            .update(payload)
            .eq("id", pessoaSelecionada.id)
            .eq("tenant_id", tenantId)
            .select("id")
            .maybeSingle()
        : await supabase
            .from("tenant_contatos")
            .insert({
              ...payload,
              tenant_id: tenantId,
              origem: "cadastro_manual",
            })
            .select("id")
            .single();

      if (query.error) {
        throw new Error(query.error.message);
      }

      if (!query.data?.id) {
        throw new Error(
          pessoaSelecionada
            ? "A alteração não foi gravada. Verifique a permissão de UPDATE em tenant_contatos e tente novamente."
            : "A pessoa não foi criada. Tente novamente.",
        );
      }

      const pessoaIdSalva = query.data.id;

      if (pessoaIdSalva && vinculoNucleoId) {
        const relacaoFinal = vinculoRelacao.trim() || (perfilContato === "crianca" ? "filho" : "membro");
        const vinculoExistente = membros.find(
          (membro) =>
            membro.tenant_contato_id === pessoaIdSalva &&
            membro.grupo_contato_id === vinculoNucleoId,
        );

        if (vinculoExistente) {
          const { error: vinculoError } = await supabase
            .from("contato_grupo_membros")
            .update({
              papel: relacaoFinal,
              papel_nucleo: relacaoFinal,
              recebe_comunicacao: recebeComunicacaoFinal,
              principal_envio: isCrianca ? false : vinculoPrincipalEnvio,
              updated_at: new Date().toISOString(),
            })
            .eq("id", vinculoExistente.id)
            .eq("tenant_id", tenantId);

          if (vinculoError) throw new Error(vinculoError.message);
        } else {
          const { error: vinculoError } = await supabase.from("contato_grupo_membros").insert({
            tenant_id: tenantId,
            grupo_contato_id: vinculoNucleoId,
            tenant_contato_id: pessoaIdSalva,
            papel: relacaoFinal,
            papel_nucleo: relacaoFinal,
            recebe_comunicacao: recebeComunicacaoFinal,
            principal_envio: isCrianca ? false : vinculoPrincipalEnvio,
          });

          if (vinculoError) throw new Error(vinculoError.message);
        }
      }

      // CRM → convidados: propagar dados do contato para todos os convidados vinculados
      const updateConvidados: Record<string, unknown> = {
        nome: pessoaForm.nome.trim(),
        telefone: telefoneParaStorage(pessoaForm.telefone.trim()) || null,
        email: pessoaForm.email.trim() || null,
        contato_principal: isCrianca ? false : pessoaForm.contato_principal,
        recebe_convite: recebeComunicacaoFinal,
      };
      if (pessoaForm.agrupamento_familia.trim()) {
        updateConvidados.grupo = pessoaForm.agrupamento_familia.trim();
      }
      await supabase
        .from("convidados")
        .update(updateConvidados)
        .eq("tenant_contato_id", pessoaIdSalva)
        .eq("tenant_id", tenantId);

      await Promise.all([carregarPessoas(tenantId), carregarMembros(tenantId), carregarHistorico(tenantId)]);
      const mensagemSucesso = pessoaSelecionada ? "Pessoa atualizada." : "Pessoa criada.";
      fecharModal();
      mostrarFeedback("sucesso", mensagemSucesso, "As informações foram salvas com segurança.");
    } catch (error) {
      mostrarErro("Erro ao salvar pessoa.", error);
    } finally {
      setAcaoLoading(false);
    }
  }

  function excluirPessoa(pessoa: Pessoa) {
    if (!tenantId) return;

    const vinculos = membrosPorPessoa.get(pessoa.id) || [];
    const eventosPessoa = historicoPorPessoa.get(pessoa.id) || [];

    if (eventosPessoa.length > 0) {
      mostrarInfo(
        "Pessoa com histórico de eventos.",
        "Por segurança, este contato não pode ser excluído. Use edição/observação ou remova apenas vínculos criados por engano.",
      );
      return;
    }

    if (vinculos.length > 0) {
      mostrarInfo(
        "Pessoa vinculada a núcleo.",
        "Remova o vínculo do núcleo antes de excluir este contato.",
      );
      return;
    }

    setConfirmacaoAcao({
      tipo: "excluirPessoa",
      titulo: "Excluir pessoa",
      mensagem:
        "Esta ação remove a pessoa permanentemente da base de contatos. A exclusão só será aplicada se o banco confirmar que ela não possui vínculos ou histórico.",
      destaque: pessoa.nome,
      confirmLabel: "Excluir pessoa",
      pessoa,
    });
  }

  async function confirmarExclusaoPessoa() {
    if (!tenantId || !confirmacaoAcao || confirmacaoAcao.tipo !== "excluirPessoa" || !confirmacaoAcao.pessoa) return;

    const pessoa = confirmacaoAcao.pessoa;
    setAcaoLoading(true);

    try {
      const { data, error } = await supabase
        .from("tenant_contatos")
        .delete()
        .eq("id", pessoa.id)
        .eq("tenant_id", tenantId)
        .select("id");

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        throw new Error("A exclusão não foi gravada. Verifique a permissão de DELETE em tenant_contatos e tente novamente.");
      }

      await carregarPessoas(tenantId);
      setConfirmacaoAcao(null);
      mostrarFeedback("sucesso", "Pessoa excluída.", "A exclusão foi confirmada no banco de dados.");
    } catch (error) {
      mostrarErro("Erro ao excluir pessoa.", error);
    } finally {
      setAcaoLoading(false);
    }
  }

  async function salvarNucleo() {
    if (!tenantId) return;

    if (!nucleoForm.nome.trim()) {
      mostrarFeedback("erro", "Informe o nome do núcleo.");
      return;
    }

    setAcaoLoading(true);

    try {
      const payload = {
        nome: nucleoForm.nome.trim(),
        tipo: nucleoForm.tipo_nucleo,
        tipo_nucleo: nucleoForm.tipo_nucleo,
        descricao: nucleoForm.descricao.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const resultado = nucleoSelecionado
        ? await supabase
            .from("contato_grupos")
            .update(payload)
            .eq("id", nucleoSelecionado.id)
            .eq("tenant_id", tenantId)
            .select("id, nome, tipo, tipo_nucleo, descricao")
            .maybeSingle()
        : await supabase
            .from("contato_grupos")
            .insert({
              ...payload,
              tenant_id: tenantId,
              origem: "cadastro_manual",
            })
            .select("id, nome, tipo, tipo_nucleo, descricao")
            .maybeSingle();

      if (resultado.error) throw new Error(resultado.error.message);

      if (!resultado.data?.id) {
        throw new Error(
          nucleoSelecionado
            ? "A alteração não foi gravada. Verifique a permissão de UPDATE em contato_grupos e tente novamente."
            : "O núcleo não foi criado. Verifique a permissão de INSERT em contato_grupos e tente novamente.",
        );
      }

      await carregarNucleos(tenantId);
      fecharModal();
      mostrarFeedback(
        "sucesso",
        nucleoSelecionado ? "Núcleo atualizado." : "Núcleo criado.",
        "As informações foram confirmadas no banco de dados.",
      );
    } catch (error) {
      mostrarFeedback(
        "erro",
        nucleoSelecionado ? "Erro ao atualizar núcleo." : "Erro ao criar núcleo.",
        error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      );
    } finally {
      setAcaoLoading(false);
    }
  }

  function excluirNucleo(nucleo: Nucleo) {
    if (!tenantId) return;

    const vinculos = membrosPorNucleo.get(nucleo.id) || [];

    if (vinculos.length > 0) {
      mostrarFeedback(
        "erro",
        "Não é possível excluir este núcleo.",
        "Ele ainda possui membros vinculados. Remova ou mova os membros antes de excluir.",
      );
      return;
    }

    setConfirmacaoAcao({
      tipo: "excluirNucleo",
      titulo: "Excluir núcleo",
      mensagem:
        "Esta ação remove o núcleo permanentemente da base de contatos. A exclusão só será aplicada se o banco confirmar que não existem membros vinculados.",
      destaque: nucleo.nome,
      confirmLabel: "Excluir núcleo",
      nucleo,
    });
  }

  async function confirmarExclusaoNucleo() {
    if (!tenantId || !confirmacaoAcao || confirmacaoAcao.tipo !== "excluirNucleo") return;

    const nucleo = confirmacaoAcao.nucleo;
    if (!nucleo) return;

    setAcaoLoading(true);

    try {
      const { count, error: countError } = await supabase
        .from("contato_grupo_membros")
        .select("id", { count: "exact", head: true })
        .eq("grupo_contato_id", nucleo.id)
        .eq("tenant_id", tenantId);

      if (countError) throw new Error(countError.message);

      if ((count || 0) > 0) {
        throw new Error("Este núcleo ainda possui membros vinculados. Remova ou mova os membros antes de excluir.");
      }

      const { data, error } = await supabase
        .from("contato_grupos")
        .delete()
        .eq("id", nucleo.id)
        .eq("tenant_id", tenantId)
        .select("id");

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        throw new Error("A exclusão não foi gravada. Verifique a permissão de DELETE em contato_grupos e tente novamente.");
      }

      await Promise.all([carregarNucleos(tenantId), carregarMembros(tenantId)]);
      setConfirmacaoAcao(null);
      mostrarFeedback("sucesso", "Núcleo excluído.", "A exclusão foi confirmada no banco de dados.");
    } catch (error) {
      mostrarFeedback(
        "erro",
        "Erro ao excluir núcleo.",
        error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      );
    } finally {
      setAcaoLoading(false);
    }
  }

  async function salvarVinculoPessoaNucleo() {
    if (!tenantId || !pessoaSelecionada) return;

    if (!vinculoNucleoId) {
      mostrarErro("Selecione um núcleo.");
      return;
    }

    if (!vinculoRelacao.trim()) {
      mostrarErro("Informe a relação no núcleo.");
      return;
    }

    const vinculoExistente = membros.find(
      (membro) =>
        membro.tenant_contato_id === pessoaSelecionada.id &&
        membro.grupo_contato_id === vinculoNucleoId,
    );
    const isCrianca = isPessoaCrianca(pessoaSelecionada);
    const responsavelDoNucleo = isCrianca
      ? getResponsavelPrincipalDoNucleo(vinculoNucleoId, pessoaSelecionada.id)
      : null;
    const recebeComunicacaoFinal = true;

    setAcaoLoading(true);

    try {
      if (vinculoExistente) {
        const { error } = await supabase
          .from("contato_grupo_membros")
          .update({
            papel: vinculoRelacao.trim(),
            papel_nucleo: vinculoRelacao.trim(),
            recebe_comunicacao: recebeComunicacaoFinal,
            principal_envio: isCrianca ? false : vinculoPrincipalEnvio,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vinculoExistente.id)
          .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);

        await carregarMembros(tenantId);
        limparFormularioVinculo();
        mostrarFeedback("sucesso", "Vínculo atualizado.");
        return;
      }

      const { error } = await supabase.from("contato_grupo_membros").insert({
        tenant_id: tenantId,
        grupo_contato_id: vinculoNucleoId,
        tenant_contato_id: pessoaSelecionada.id,
        papel: vinculoRelacao.trim(),
        papel_nucleo: vinculoRelacao.trim(),
        recebe_comunicacao: recebeComunicacaoFinal,
        principal_envio: isCrianca ? false : vinculoPrincipalEnvio,
      });

      if (error) throw new Error(error.message);

      await carregarMembros(tenantId);
      limparFormularioVinculo();
      mostrarFeedback("sucesso", "Vínculo criado.");
    } catch (error) {
      mostrarErro("Erro ao salvar vínculo.", error);
    } finally {
      setAcaoLoading(false);
    }
  }

  // Recalcula responsavel_nome/telefone de todos os filhos de um núcleo
  // baseado nos membros com principal_envio=true que não são crianças
  async function sincronizarResponsaveisDoNucleo(grupoId: string) {
    if (!tenantId) return;

    const { data: membrosNucleo } = await supabase
      .from("contato_grupo_membros")
      .select("papel, principal_envio, tenant_contato_id, tenant_contatos(id, nome, telefone, tipo_contato)")
      .eq("grupo_contato_id", grupoId)
      .eq("tenant_id", tenantId);

    if (!membrosNucleo) return;

    const responsaveis = membrosNucleo.filter(
      (m) => m.principal_envio && (m as any).tenant_contatos?.tipo_contato !== "crianca"
    );
    const filhos = membrosNucleo.filter(
      (m) => m.papel === "filho(a)" || (m as any).tenant_contatos?.tipo_contato === "crianca"
    );

    if (filhos.length === 0) return;

    const nomesResp = responsaveis
      .map((m) => (m as any).tenant_contatos?.nome || "")
      .filter(Boolean)
      .join(", ");
    const telsResp = responsaveis
      .map((m) => (m as any).tenant_contatos?.telefone || "")
      .filter(Boolean)
      .join(",");

    for (const filho of filhos) {
      await supabase
        .from("tenant_contatos")
        .update({ responsavel_nome: nomesResp || null, responsavel_telefone: telsResp || null })
        .eq("id", filho.tenant_contato_id)
        .eq("tenant_id", tenantId);
    }
  }

  async function atualizarFlagsVinculoNucleo(
    membro: MembroNucleo,
    updates: { recebe_comunicacao?: boolean; principal_envio?: boolean },
  ) {
    if (!tenantId) return;

    setAcaoLoading(true);

    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.principal_envio === true) {
        const { error: limparPrincipaisError } = await supabase
          .from("contato_grupo_membros")
          .update({
            principal_envio: false,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("grupo_contato_id", membro.grupo_contato_id)
          .neq("id", membro.id);

        if (limparPrincipaisError) throw new Error(limparPrincipaisError.message);
      }

      const { error } = await supabase
        .from("contato_grupo_membros")
        .update(payload)
        .eq("id", membro.id)
        .eq("tenant_id", tenantId);

      if (error) throw new Error(error.message);

      // CRM → convidados: propagar principal_envio e recebe_comunicacao
      if (updates.principal_envio !== undefined) {
        await supabase
          .from("convidados")
          .update({ contato_principal: updates.principal_envio })
          .eq("tenant_contato_id", membro.tenant_contato_id)
          .eq("tenant_id", tenantId);

        // Se marcando como principal, atualizar papel para responsavel
        const pessoa = pessoasPorId.get(membro.tenant_contato_id);
        const ehCrianca = normalizarPerfilContato(pessoa?.tipo_contato) === "crianca";
        if (updates.principal_envio === true && !ehCrianca) {
          await supabase
            .from("contato_grupo_membros")
            .update({ papel: "responsavel", papel_nucleo: "responsavel" })
            .eq("id", membro.id)
            .eq("tenant_id", tenantId);
        }
      }
      if (updates.recebe_comunicacao !== undefined) {
        await supabase
          .from("convidados")
          .update({ recebe_convite: updates.recebe_comunicacao })
          .eq("tenant_contato_id", membro.tenant_contato_id)
          .eq("tenant_id", tenantId);
      }

      await sincronizarResponsaveisDoNucleo(membro.grupo_contato_id);
      await carregarMembros(tenantId);
    } catch (error) {
      mostrarErro("Erro ao atualizar vínculo.", error);
    } finally {
      setAcaoLoading(false);
    }
  }


  async function salvarMembroNoNucleo() {
    if (!tenantId || !nucleoSelecionado) return;

    if (!vinculoPessoaId) {
      mostrarErro("Selecione uma pessoa.");
      return;
    }

    if (!vinculoRelacao.trim()) {
      mostrarErro("Informe a relação no núcleo.");
      return;
    }

    const jaExiste = membros.some(
      (membro) =>
        membro.tenant_contato_id === vinculoPessoaId &&
        membro.grupo_contato_id === nucleoSelecionado.id,
    );

    if (jaExiste) {
      mostrarInfo("Pessoa já vinculada.", "Esta pessoa já está vinculada a este núcleo.");
      return;
    }

    setAcaoLoading(true);

    try {
      const { error } = await supabase.from("contato_grupo_membros").insert({
        tenant_id: tenantId,
        grupo_contato_id: nucleoSelecionado.id,
        tenant_contato_id: vinculoPessoaId,
        papel: vinculoRelacao.trim(),
        papel_nucleo: vinculoRelacao.trim(),
        recebe_comunicacao: vinculoRecebeComunicacao,
        principal_envio: vinculoPrincipalEnvio,
      });

      if (error) throw new Error(error.message);

      await sincronizarResponsaveisDoNucleo(nucleoSelecionado.id);
      await carregarMembros(tenantId);
      limparFormularioVinculo();
      mostrarFeedback("sucesso", "Membro adicionado ao núcleo.");
    } catch (error) {
      mostrarErro("Erro ao adicionar membro.", error);
    } finally {
      setAcaoLoading(false);
    }
  }



  async function criarPessoaDiretoNoNucleo(dados: PessoaForm) {
    if (!tenantId || !nucleoSelecionado) return false;

    if (!dados.nome.trim()) {
      mostrarErro("Informe o nome da pessoa.");
      return false;
    }

    setAcaoLoading(true);

    try {
      const telefoneNormalizado = normalizarTelefone(dados.telefone);
      const perfilContato = normalizarPerfilContato(dados.tipo_contato);
      const isCrianca = perfilContato === "crianca";
      const responsavelDoNucleo = isCrianca ? getResponsavelPrincipalDoNucleo(nucleoSelecionado.id) : null;
      const responsavelFinalNome = isCrianca
        ? dados.responsavel_nome.trim() || responsavelDoNucleo?.nome?.trim() || ""
        : "";
      const responsavelFinalTelefone = isCrianca
        ? dados.responsavel_telefone.trim() || responsavelDoNucleo?.telefone?.trim() || ""
        : "";
      const recebeComunicacaoFinal = true;
      const contatoExistente = await buscarContatoExistente({
        nome: dados.nome,
        telefoneNormalizado,
      });

      if (contatoExistente) {
        mostrarInfo(
          "Contato já cadastrado.",
          `Já existe um contato cadastrado para "${contatoExistente.nome}". Use a opção "Adicionar pessoa" para vincular o contato existente ao núcleo.`,
        );
        return false;
      }

      const { data: pessoaCriada, error: pessoaError } = await supabase
        .from("tenant_contatos")
        .insert({
          tenant_id: tenantId,
          nome: dados.nome.trim(),
          telefone: telefoneParaStorage(dados.telefone.trim()) || null,
          telefone_normalizado: telefoneNormalizado || null,
          email: dados.email.trim() || null,
          tipo_contato: perfilContato,
          responsavel_nome: isCrianca ? responsavelFinalNome || null : null,
          responsavel_telefone: isCrianca ? telefoneParaStorage(responsavelFinalTelefone) || null : null,
          consentimento_comunicacao: false,
          origem: "cadastro_manual_nucleo",
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (pessoaError) throw new Error(pessoaError.message);
      if (!pessoaCriada?.id) throw new Error("Contato criado, mas o ID não retornou.");

      const relacaoPadrao = isCrianca ? "filho" : "membro";
      const { error: vinculoError } = await supabase.from("contato_grupo_membros").insert({
        tenant_id: tenantId,
        grupo_contato_id: nucleoSelecionado.id,
        tenant_contato_id: pessoaCriada.id,
        papel: vinculoRelacao.trim() || relacaoPadrao,
        papel_nucleo: vinculoRelacao.trim() || relacaoPadrao,
        recebe_comunicacao: vinculoRecebeComunicacao,
        principal_envio: vinculoPrincipalEnvio,
      });

      if (vinculoError) throw new Error(vinculoError.message);

      await Promise.all([carregarPessoas(tenantId), carregarMembros(tenantId)]);
      limparFormularioVinculo();
      mostrarFeedback("sucesso", "Contato criado e vinculado ao núcleo.");
      return true;
    } catch (error) {
      mostrarErro("Erro ao criar contato no núcleo.", error);
      return false;
    } finally {
      setAcaoLoading(false);
    }
  }

  function removerVinculoNucleo(membro: MembroNucleo) {
    if (!tenantId) return;

    const pessoa = pessoasPorId.get(membro.tenant_contato_id);
    const nucleo = nucleosPorId.get(membro.grupo_contato_id);

    setConfirmacaoAcao({
      tipo: "removerVinculo",
      titulo: "Remover vínculo",
      mensagem:
        "Esta ação remove apenas o vínculo desta pessoa com o núcleo. O contato continuará salvo na base de contatos.",
      destaque: `${pessoa?.nome || "Pessoa"} · ${nucleo?.nome || "Núcleo"}`,
      confirmLabel: "Remover vínculo",
      membro,
    });
  }

  async function confirmarRemocaoVinculo() {
    if (!tenantId || !confirmacaoAcao || confirmacaoAcao.tipo !== "removerVinculo" || !confirmacaoAcao.membro) return;

    const membro = confirmacaoAcao.membro;
    setAcaoLoading(true);

    try {
      const { data, error } = await supabase
        .from("contato_grupo_membros")
        .delete()
        .eq("id", membro.id)
        .eq("tenant_id", tenantId)
        .select("id");

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        throw new Error("A remoção não foi gravada. Verifique a permissão de DELETE em contato_grupo_membros e tente novamente.");
      }

      await carregarMembros(tenantId);
      setConfirmacaoAcao(null);
      mostrarFeedback("sucesso", "Vínculo removido.", "A alteração foi confirmada no banco de dados.");
    } catch (error) {
      mostrarErro("Erro ao remover vínculo.", error);
    } finally {
      setAcaoLoading(false);
    }
  }

  async function importarPessoaParaEvento() {
    if (!tenantId || !pessoaSelecionada || !eventoImportacaoId) {
      mostrarErro("Selecione um evento.");
      return;
    }

    setAcaoLoading(true);

    try {
      const jaExiste = await convidadoJaExisteNoEvento({
        tenantContatoId: pessoaSelecionada.id,
        eventoId: eventoImportacaoId,
      });

      if (jaExiste) {
        mostrarInfo("Convidado já existe.", "Esta pessoa já está como convidada neste evento.");
        return;
      }

      const isCrianca = isPessoaCrianca(pessoaSelecionada);
      const responsavelEfetivo = getResponsavelEfetivoDaPessoa(pessoaSelecionada);
      const telefoneEnvio = isCrianca
        ? responsavelEfetivo?.telefone || pessoaSelecionada.responsavel_telefone || ""
        : pessoaSelecionada.telefone || "";

      const { error } = await supabase.from("convidados").insert({
        tenant_id: tenantId,
        evento_id: eventoImportacaoId,
        tenant_contato_id: pessoaSelecionada.id,
        nome: pessoaSelecionada.nome,
        telefone: isCrianca ? null : pessoaSelecionada.telefone,
        email: pessoaSelecionada.email,
        token: gerarToken(),
        status_rsvp: "pendente",
        status_envio: "pendente",
        status_checkin: "nao_entrou",
        tipo_convite: "individual",
        relacao_evento: relacaoEventoImportacao.trim() || null,
        contato_principal: !isCrianca,
        recebe_convite: Boolean(telefoneEnvio),
        crianca: isCrianca ? "sim" : null,
        responsavel: isCrianca ? responsavelEfetivo?.nome || pessoaSelecionada.responsavel_nome || null : null,
        responsavel_telefone: isCrianca ? telefoneEnvio || null : null,
        origem_importacao: "contatos",
      });

      if (error) throw new Error(error.message);

      await carregarHistorico(tenantId);
      fecharModal();
      mostrarFeedback("sucesso", "Pessoa importada para o evento.");
    } catch (error) {
      mostrarErro("Erro ao importar pessoa.", error);
    } finally {
      setAcaoLoading(false);
    }
  }

  async function importarNucleoParaEvento() {
    if (!tenantId || !nucleoSelecionado || !eventoImportacaoId) {
      mostrarErro("Selecione um evento.");
      return;
    }

    const vinculos = membrosPorNucleo.get(nucleoSelecionado.id) || [];

    if (vinculos.length === 0) {
      mostrarInfo("Núcleo sem membros.", "Este núcleo não possui membros para importar.");
      return;
    }

    setAcaoLoading(true);

    try {
      let criados = 0;
      let ignorados = 0;

      for (const vinculo of vinculos) {
        const pessoa = pessoasPorId.get(vinculo.tenant_contato_id);
        if (!pessoa) continue;

        const jaExiste = await convidadoJaExisteNoEvento({
          tenantContatoId: pessoa.id,
          eventoId: eventoImportacaoId,
        });

        if (jaExiste) {
          ignorados += 1;
          continue;
        }

        const papel = getPapelMembro(vinculo);
        const isCrianca = normalizarPerfilContato(pessoa.tipo_contato) === "crianca" || isPapelCrianca(papel);
        const responsavelEfetivo = getResponsavelEfetivoDaPessoa(pessoa, nucleoSelecionado.id);
        const principal = !isCrianca && (Boolean(vinculo.principal_envio) || papel === "responsavel");
        const telefoneEnvio = isCrianca
          ? responsavelEfetivo?.telefone || pessoa.responsavel_telefone || ""
          : pessoa.telefone || "";

        const { error } = await supabase.from("convidados").insert({
          tenant_id: tenantId,
          evento_id: eventoImportacaoId,
          tenant_contato_id: pessoa.id,
          nome: pessoa.nome,
          telefone: isCrianca ? null : pessoa.telefone,
          email: pessoa.email,
          grupo: nucleoSelecionado.nome,
          token: gerarToken(),
          status_rsvp: "pendente",
          status_envio: "pendente",
          status_checkin: "nao_entrou",
          tipo_convite: "grupo",
          relacao_evento: relacaoEventoImportacao.trim() || null,
          contato_principal: principal,
          recebe_convite: isCrianca
            ? Boolean(telefoneEnvio || vinculo.recebe_comunicacao)
            : Boolean(vinculo.recebe_comunicacao || vinculo.principal_envio || principal),
          crianca: isCrianca ? "sim" : null,
          responsavel: isCrianca ? responsavelEfetivo?.nome || pessoa.responsavel_nome || null : null,
          responsavel_telefone: isCrianca ? telefoneEnvio || null : null,
          origem_importacao: "contatos_nucleo",
        });

        if (error) throw new Error(error.message);
        criados += 1;
      }

      await carregarHistorico(tenantId);
      fecharModal();
      mostrarFeedback("sucesso", `${criados} convidado(s) importado(s).`, `${ignorados} já existia(m) no evento.`);
    } catch (error) {
      mostrarErro("Erro ao importar núcleo.", error);
    } finally {
      setAcaoLoading(false);
    }
  }

  function confirmarAcaoAtual() {
    if (!confirmacaoAcao || acaoLoading) return;

    if (confirmacaoAcao.tipo === "excluirNucleo") {
      confirmarExclusaoNucleo();
      return;
    }

    if (confirmacaoAcao.tipo === "excluirPessoa") {
      confirmarExclusaoPessoa();
      return;
    }

    if (confirmacaoAcao.tipo === "removerVinculo") {
      confirmarRemocaoVinculo();
    }
  }

  async function convidadoJaExisteNoEvento({
    tenantContatoId,
    eventoId,
  }: {
    tenantContatoId: string;
    eventoId: string;
  }) {
    const { data, error } = await supabase
      .from("convidados")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("evento_id", eventoId)
      .eq("tenant_contato_id", tenantContatoId)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return Boolean(data?.id);
  }

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
            <MetricCard label="Escolas" value={totalEscolas} />
            <MetricCard label="Empresas" value={totalEmpresas} />
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
            <h2 style={cardTitleStyle}>{aba === "pessoas" ? "Pessoas" : "Núcleos"}</h2>
            <p style={sectionSubtitleStyle}>
              {aba === "pessoas"
                ? "Pessoas únicas do cliente, com histórico e vínculos."
                : "Agrupamentos como famílias, escolas, empresas, políticos, igrejas ou associações."}
            </p>
          </div>

          <button
            type="button"
            onClick={aba === "pessoas" ? abrirCriarPessoa : abrirCriarNucleo}
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

        {aba === "nucleos" && (
          <div style={nucleoToolbarStyle}>
            <div style={filterPillsStyle}>
              {tiposNucleoFiltro.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => setTipoNucleoFiltro(tipo.value)}
                  style={tipoNucleoFiltro === tipo.value ? filterPillActiveStyle : filterPillStyle}
                >
                  {tipo.label}
                </button>
              ))}
            </div>

            <div style={viewToggleStyle}>
              <button
                type="button"
                onClick={() => setVisualizacaoNucleos("cards")}
                style={visualizacaoNucleos === "cards" ? viewToggleActiveStyle : viewToggleButtonStyle}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setVisualizacaoNucleos("lista")}
                style={visualizacaoNucleos === "lista" ? viewToggleActiveStyle : viewToggleButtonStyle}
              >
                Lista
              </button>
            </div>
          </div>
        )}

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
                <article key={pessoa.id} style={rowCardStyle}>
                  <div style={rowCardMainStyle}>
                    <div style={avatarStyle}>{getInitials(pessoa.nome)}</div>

                    <div style={rowContentStyle}>
                      <div style={rowTopStyle}>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={itemTitleStyle}>{pessoa.nome}</h3>
                          <p style={mutedStyle}>
                            {pessoa.telefone || "Sem telefone"} · {pessoa.email || "Sem e-mail"}
                          </p>
                        </div>
                      </div>

                      <div style={badgesStyle}>
                        <Badge>{labelTipoContato(pessoa.tipo_contato)}</Badge>
                        {vinculos.length > 0 && <Badge>{vinculos.length} núcleo(s)</Badge>}
                        {eventosPessoa.length > 0 && <Badge>{eventosPessoa.length} evento(s)</Badge>}
                        {pessoa.consentimento_comunicacao && <Badge>Recebe comunicação</Badge>}
                      </div>

                      {normalizarPerfilContato(pessoa.tipo_contato) === "crianca" && getResponsavelEfetivoDaPessoa(pessoa) && (
                        <p style={smallMutedStyle}>
                          Responsável: <strong>{getResponsavelEfetivoDaPessoa(pessoa)?.nome || "Não informado"}</strong>
                          {getResponsavelEfetivoDaPessoa(pessoa)?.telefone
                            ? ` · ${getResponsavelEfetivoDaPessoa(pessoa)?.telefone}`
                            : ""}
                          {getResponsavelEfetivoDaPessoa(pessoa)?.origem === "nucleo"
                            ? ` · herdado do núcleo ${getResponsavelEfetivoDaPessoa(pessoa)?.nucleoNome || ""}`
                            : ""}
                        </p>
                      )}

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
                          Último evento: <strong>{getEventoNome(ultimoEvento)}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={rowActionsStyle}>
                    <button type="button" onClick={() => abrirHistorico(pessoa)} style={secondaryButtonStyle}>
                      Histórico
                    </button>
                    <button type="button" onClick={() => abrirVinculosPessoa(pessoa)} style={secondaryButtonStyle}>
                      Vínculos
                    </button>
                    <button type="button" onClick={() => abrirImportarPessoa(pessoa)} style={secondaryButtonStyle}>
                      Importar
                    </button>
                    <button type="button" onClick={() => abrirEditarPessoa(pessoa)} style={secondaryButtonStyle}>
                      Editar
                    </button>
                    <button type="button" onClick={() => excluirPessoa(pessoa)} style={dangerButtonStyle}>
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && aba === "nucleos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nucleosFiltrados.map((nucleo) => {
              const vinculos = membrosPorNucleo.get(nucleo.id) || [];
              const responsaveis = vinculos.filter((membro) => getPapelMembro(membro) === "responsavel");
              const membrosComPessoa = vinculos
                .map((membro) => ({ membro, pessoa: pessoasPorId.get(membro.tenant_contato_id) }))
                .filter((item) => item.pessoa);
              const expandido = nucleosExpandidos.has(nucleo.id);

              return (
                <div key={nucleo.id} style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid #ede9fe" }}>
                  {/* Header colapsável */}
                  <div
                    onClick={() => setNucleosExpandidos((prev) => {
                      const next = new Set(prev);
                      expandido ? next.delete(nucleo.id) : next.add(nucleo.id);
                      return next;
                    })}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: expandido ? "#ede9fe" : "#f5f3ff", cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, color: "#7c3aed" }}>{expandido ? "▾" : "▸"}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#3b0764" }}>{nucleo.nome}</span>
                      <span style={{ fontSize: 13, color: "#7c3aed" }}>{vinculos.length} membro(s)</span>
                      {nucleo.descricao && <span style={{ fontSize: 12, color: "#94a3b8" }}>{nucleo.descricao}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>{responsaveis.length} responsável(is)</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9", borderRadius: 8, padding: "3px 10px" }}>{labelTipoNucleo(getTipoNucleo(nucleo))}</span>
                      <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => abrirEditarNucleo(nucleo)} style={{ ...secondaryButtonStyle, padding: "6px 14px", fontSize: 13 }}>Editar</button>
                        <button type="button" onClick={() => excluirNucleo(nucleo)} style={{ ...dangerButtonStyle, padding: "6px 14px", fontSize: 13 }}>Excluir</button>
                      </div>
                    </div>
                  </div>

                  {/* Membros expandidos — cards individuais por pessoa, agrupados por agrupamento */}
                  {expandido && (
                    <div style={{ background: "var(--card, #fff)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                      {membrosComPessoa.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Nenhum membro encontrado.</p>}
                      {(() => {
                        // Agrupar membros por família:
                        // - Adulto: chave = telefone normalizado
                        // - Criança: chave = primeiro telefone do responsável normalizado
                        // Fallback: agrupamento do convidado ou sem grupo
                        const normalizar = (t: string | null | undefined) => (t || "").replace(/\D/g, "");

                        const chaveGrupo = (item: { membro: MembroNucleo; pessoa: Pessoa | undefined }) => {
                          const pessoa = item.pessoa;
                          const ehCrianca = normalizarPerfilContato(pessoa?.tipo_contato) === "crianca" || getPapelMembro(item.membro) === "filho(a)";
                          if (ehCrianca && pessoa?.responsavel_telefone) {
                            return normalizar(pessoa.responsavel_telefone.split(",")[0]) || "__sem_grupo__";
                          }
                          if (!ehCrianca && pessoa?.telefone) {
                            return normalizar(pessoa.telefone);
                          }
                          return agrupamentoPorContatoId.get(item.membro.tenant_contato_id) || "__sem_grupo__";
                        };

                        const grupos = new Map<string, typeof membrosComPessoa>();
                        for (const item of membrosComPessoa) {
                          const key = chaveGrupo(item);
                          if (!grupos.has(key)) grupos.set(key, []);
                          grupos.get(key)!.push(item);
                        }

                        // Ordenar: filhos primeiro, responsáveis depois
                        for (const itens of grupos.values()) {
                          itens.sort((a, b) => {
                            const aEhCrianca = normalizarPerfilContato(a.pessoa?.tipo_contato) === "crianca";
                            const bEhCrianca = normalizarPerfilContato(b.pessoa?.tipo_contato) === "crianca";
                            return Number(bEhCrianca) - Number(aEhCrianca);
                          });
                        }

                        return Array.from(grupos.values()).map((itens, gi) => {
                          const nomeGrupo = itens.reduce<string | null>((acc, item) => acc || agrupamentoPorContatoId.get(item.membro.tenant_contato_id) || null, null);
                          return (
                          <div key={gi} style={itens.length > 1 ? { background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "10px", display: "flex", flexDirection: "column", gap: 8 } : {}}>
                            {itens.length > 1 && nomeGrupo && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, padding: "2px 4px" }}>{nomeGrupo}</div>
                            )}
                            {itens.map(({ membro, pessoa }, ii) => {
                              const naoUltimo = ii < itens.length - 1; void naoUltimo;
                        const papel = getPapelMembro(membro);
                        const ehCrianca = normalizarPerfilContato(pessoa?.tipo_contato) === "crianca" || papel === "filho(a)";
                        const telFormatado = pessoa?.telefone ? telefoneParaExibir(pessoa.telefone) : null;
                        const respNome = pessoa?.responsavel_nome?.trim();
                        const respTel = pessoa?.responsavel_telefone?.trim();
                        const dataCadastro = pessoa?.created_at ? new Date(pessoa.created_at).toLocaleDateString("pt-BR") : null;
                        const origem = pessoa?.origem ? pessoa.origem.replace(/_/g, " ") : null;
                        const chipColor = papel === "responsavel" ? { bg: "#ede9fe", color: "#6d28d9" }
                          : papel === "filho(a)" || ehCrianca ? { bg: "#fef3c7", color: "#92400e" }
                          : papel === "conjuge" ? { bg: "#fce7f3", color: "#9d174d" }
                          : { bg: "#f1f5f9", color: "#475569" };

                        return (
                          <div key={membro.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                            {/* Linha 1: nome + papel + principal + ações */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{pessoa?.nome}</span>
                              <span style={{ fontSize: 12, background: chipColor.bg, color: chipColor.color, borderRadius: 8, padding: "2px 10px", fontWeight: 700 }}>{labelPapel(papel)}</span>
                              {membro.principal_envio && (
                                <span style={{ fontSize: 11, background: "#7c3aed", color: "#fff", borderRadius: 8, padding: "2px 10px", fontWeight: 700 }}>★ Contato principal</span>
                              )}
                              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                {pessoa && (
                                  <button type="button" onClick={() => abrirEditarPessoa(pessoa)} style={{ ...secondaryButtonStyle, padding: "4px 12px", fontSize: 12 }}>Alterar</button>
                                )}
                                <button type="button" onClick={() => removerVinculoNucleo(membro)} style={{ ...dangerButtonStyle, padding: "4px 12px", fontSize: 12 }}>Remover</button>
                              </div>
                            </div>

                            {/* Linha 2: telefone + email */}
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                              {telFormatado
                                ? <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{telFormatado}</span>
                                : <span style={{ fontSize: 13, color: "#94a3b8" }}>Sem telefone</span>}
                              {pessoa?.email
                                ? <span style={{ fontSize: 13, color: "#64748b" }}>{pessoa.email}</span>
                                : <span style={{ fontSize: 13, color: "#94a3b8" }}>Sem e-mail</span>}
                            </div>

                            {/* Linha 3: perfil */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "#64748b" }}>
                                Perfil: <strong>{ehCrianca ? "Criança" : "Adulto"}</strong>
                              </span>
                              {origem && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {origem}</span>}
                              {dataCadastro && <span style={{ fontSize: 11, color: "#94a3b8" }}>· desde {dataCadastro}</span>}
                              {nucleoPorContatoId.get(membro.tenant_contato_id) && (
                                <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>· {nucleoPorContatoId.get(membro.tenant_contato_id)}</span>
                              )}
                            </div>

                            {/* Linha 4: responsável (para crianças) */}
                            {ehCrianca && respNome && (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: 12, color: "#64748b" }}>Responsável:</span>
                                {respNome.split(",").map((n, ni) => {
                                  const tel = respTel ? respTel.split(",")[ni]?.trim() : null;
                                  return (
                                    <span key={ni} style={{ fontSize: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "2px 10px", color: "#334155", fontWeight: 600 }}>
                                      👤 {n.trim()}{tel ? ` · ${telefoneParaExibir(tel)}` : ""}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                          </div>
                        );});
                      })()}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {modal && (
        <div
          style={modalOverlayStyle}
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharModal();
          }}
        >
          <section style={modalCardStyle} onMouseDown={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={modalKickerStyle}>Contatos</div>
                <h2 style={modalTitleStyle}>{getModalTitulo(modal)}</h2>
              </div>

              <button type="button" onClick={fecharModal} style={secondaryButtonStyle}>
                Fechar
              </button>
            </div>

            {(modal === "criarPessoa" || modal === "editarPessoa") && (
              <PessoaFormModal
                pessoaForm={pessoaForm}
                pessoas={pessoas}
                pessoaSelecionadaId={pessoaSelecionada?.id || null}
                agrupamentoPorContatoId={agrupamentoPorContatoId}
                contatoPrincipalPorContatoId={contatoPrincipalPorContatoId}
                nucleos={nucleos}
                nucleosPorId={nucleosPorId}
                vinculosPessoa={pessoaSelecionada ? membrosPorPessoa.get(pessoaSelecionada.id) || [] : []}
                vinculoNucleoId={vinculoNucleoId}
                vinculoRelacao={vinculoRelacao}
                vinculoRecebeComunicacao={vinculoRecebeComunicacao}
                vinculoPrincipalEnvio={vinculoPrincipalEnvio}
                acaoLoading={acaoLoading}
                onChange={updatePessoaForm}
                onNucleoChange={selecionarNucleoInicialPessoa}
                onRelacaoChange={setVinculoRelacao}
                onRecebeChange={setVinculoRecebeComunicacao}
                onPrincipalChange={setVinculoPrincipalEnvio}
                onQuickUpdateVinculo={atualizarFlagsVinculoNucleo}
                onRemover={removerVinculoNucleo}
                onSubmit={salvarPessoa}
                onCancel={fecharModal}
                submitLabel={modal === "criarPessoa" ? "Criar pessoa" : "Salvar alterações"}
              />
            )}

            {modal === "historico" && pessoaSelecionada && (
              <HistoricoModal pessoa={pessoaSelecionada} historico={historicoPorPessoa.get(pessoaSelecionada.id) || []} />
            )}

            {modal === "vinculosPessoa" && pessoaSelecionada && (
              <VinculosPessoaModal
                pessoa={pessoaSelecionada}
                vinculos={membrosPorPessoa.get(pessoaSelecionada.id) || []}
                nucleos={nucleos}
                nucleosPorId={nucleosPorId}
                vinculoNucleoId={vinculoNucleoId}
                vinculoRelacao={vinculoRelacao}
                vinculoRecebeComunicacao={vinculoRecebeComunicacao}
                vinculoPrincipalEnvio={vinculoPrincipalEnvio}
                acaoLoading={acaoLoading}
                onNucleoChange={setVinculoNucleoId}
                onRelacaoChange={setVinculoRelacao}
                onRecebeChange={setVinculoRecebeComunicacao}
                onPrincipalChange={setVinculoPrincipalEnvio}
                onQuickUpdateVinculo={atualizarFlagsVinculoNucleo}
                onSalvar={salvarVinculoPessoaNucleo}
                onRemover={removerVinculoNucleo}
              />
            )}

            {modal === "importarPessoa" && pessoaSelecionada && (
              <ImportarPessoaModal
                pessoa={pessoaSelecionada}
                eventos={eventos}
                eventoImportacaoId={eventoImportacaoId}
                relacaoEventoImportacao={relacaoEventoImportacao}
                acaoLoading={acaoLoading}
                onEventoChange={setEventoImportacaoId}
                onRelacaoEventoChange={setRelacaoEventoImportacao}
                onImportar={importarPessoaParaEvento}
              />
            )}

            {(modal === "criarNucleo" || modal === "editarNucleo") && (
              <NucleoFormModal
                nucleoForm={nucleoForm}
                acaoLoading={acaoLoading}
                onChange={updateNucleoForm}
                onSubmit={salvarNucleo}
                onCancel={fecharModal}
                submitLabel={modal === "criarNucleo" ? "Criar núcleo" : "Salvar alterações"}
              />
            )}

            {modal === "membrosNucleo" && nucleoSelecionado && (
              <MembrosNucleoModal
                nucleo={nucleoSelecionado}
                membros={membrosPorNucleo.get(nucleoSelecionado.id) || []}
                pessoas={pessoas}
                pessoasPorId={pessoasPorId}
                vinculoPessoaId={vinculoPessoaId}
                vinculoRelacao={vinculoRelacao}
                vinculoRecebeComunicacao={vinculoRecebeComunicacao}
                vinculoPrincipalEnvio={vinculoPrincipalEnvio}
                acaoLoading={acaoLoading}
                onPessoaChange={setVinculoPessoaId}
                onRelacaoChange={setVinculoRelacao}
                onRecebeChange={setVinculoRecebeComunicacao}
                onPrincipalChange={setVinculoPrincipalEnvio}
                onSalvar={salvarMembroNoNucleo}
                onCriarPessoaDireta={criarPessoaDiretoNoNucleo}
                onEditarPessoa={abrirEditarPessoa}
                onRemover={removerVinculoNucleo}
              />
            )}

            {modal === "importarNucleo" && nucleoSelecionado && (
              <ImportarNucleoModal
                nucleo={nucleoSelecionado}
                membros={membrosPorNucleo.get(nucleoSelecionado.id) || []}
                eventos={eventos}
                eventoImportacaoId={eventoImportacaoId}
                relacaoEventoImportacao={relacaoEventoImportacao}
                acaoLoading={acaoLoading}
                pessoasPorId={pessoasPorId}
                onEventoChange={setEventoImportacaoId}
                onRelacaoEventoChange={setRelacaoEventoImportacao}
                onImportar={importarNucleoParaEvento}
              />
            )}
          </section>
        </div>
      )}

      {confirmacaoAcao && (
        <ConfirmacaoAcaoModal
          confirmacao={confirmacaoAcao}
          acaoLoading={acaoLoading}
          onConfirmar={confirmarAcaoAtual}
          onCancelar={fecharConfirmacaoAcao}
        />
      )}

      {toast && (
        <div style={toastWrapperStyle}>
          <div style={toastCardStyle}>
            <div style={toastIconStyle}>{toast.tipo === "sucesso" ? "✓" : "!"}</div>
            <div>
              <strong style={toastTitleStyle}>{toast.titulo}</strong>
              {toast.mensagem && <span style={toastMessageStyle}>{toast.mensagem}</span>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ConfirmacaoAcaoModal({
  confirmacao,
  acaoLoading,
  onConfirmar,
  onCancelar,
}: {
  confirmacao: ConfirmacaoAcao;
  acaoLoading: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      style={modalOverlayStyle}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !acaoLoading) onCancelar();
      }}
    >
      <section
        style={{
          ...modalCardStyle,
          width: "min(560px, 100%)",
          overflowY: "visible",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={modalHeaderStyle}>
          <div>
            <div style={modalKickerStyle}>Confirmação</div>
            <h2 style={modalTitleStyle}>{confirmacao.titulo}</h2>
          </div>
        </div>

        <div style={confirmBoxStyle}>
          <strong style={confirmHighlightStyle}>{confirmacao.destaque}</strong>
          <p style={confirmMessageStyle}>{confirmacao.mensagem}</p>
        </div>

        <div style={modalActionsStyle}>
          <button type="button" onClick={onCancelar} disabled={acaoLoading} style={secondaryButtonStyle}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={acaoLoading} style={dangerButtonStyle}>
            {acaoLoading ? "Processando..." : confirmacao.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function EditarRespInlineContatos({ nomeInicial, telefoneInicial, onSalvar, onCancelar }: {
  nomeInicial: string;
  telefoneInicial: string;
  onSalvar: (nome: string, telefone: string) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(() => telefoneParaExibir(telefoneInicial));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 20px", borderRadius: 16, border: "1.5px solid #c4b5fd", background: "#faf5ff" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do responsável" style={{ flex: 2, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 600, outline: "none", background: "#fff" }} />
        <input value={telefone} onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))} placeholder="(11) 99999-9999" style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff" }} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancelar} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
        <button type="button" onClick={() => onSalvar(nome.trim(), telefoneParaStorage(telefone) || telefone)} disabled={!nome.trim() && !telefone.trim()} style={{ background: "#6d28d9", color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Salvar</button>
      </div>
    </div>
  );
}

function PessoaFormModal({
  pessoaForm,
  pessoas,
  pessoaSelecionadaId,
  agrupamentoPorContatoId,
  contatoPrincipalPorContatoId,
  nucleos,
  nucleosPorId,
  vinculosPessoa,
  vinculoNucleoId,
  vinculoRelacao,
  vinculoRecebeComunicacao,
  vinculoPrincipalEnvio,
  acaoLoading,
  onChange,
  onNucleoChange,
  onRelacaoChange,
  onRecebeChange,
  onPrincipalChange,
  onQuickUpdateVinculo,
  onRemover,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  pessoaForm: PessoaForm;
  pessoas: Pessoa[];
  pessoaSelecionadaId: string | null;
  agrupamentoPorContatoId: Map<string, string>;
  contatoPrincipalPorContatoId: Map<string, boolean>;
  nucleos: Nucleo[];
  nucleosPorId: Map<string, Nucleo>;
  vinculosPessoa: MembroNucleo[];
  vinculoNucleoId: string;
  vinculoRelacao: string;
  vinculoRecebeComunicacao: boolean;
  vinculoPrincipalEnvio: boolean;
  acaoLoading: boolean;
  onChange: (field: keyof PessoaForm, value: string | boolean) => void;
  onNucleoChange: (id: string) => void;
  onRelacaoChange: (valor: string) => void;
  onRecebeChange: (valor: boolean) => void;
  onPrincipalChange: (valor: boolean) => void;
  onQuickUpdateVinculo: (membro: MembroNucleo, updates: { recebe_comunicacao?: boolean; principal_envio?: boolean }) => void;
  onRemover: (membro: MembroNucleo) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const isCrianca = pessoaForm.tipo_contato === "crianca";
  const [mostrarFormularioNucleo, setMostrarFormularioNucleo] = useState(false);
  const [editandoVinculoId, setEditandoVinculoId] = useState<string | null>(null);
  const [editandoRespIdx, setEditandoRespIdx] = useState<number | null>(null);
  const [novoResp, setNovoResp] = useState<{ nome: string; telefone: string } | null>(null);

  const nomesResp = (pessoaForm.responsavel_nome || "").split(",").map((n) => n.trim()).filter(Boolean);
  const telsResp = (pessoaForm.responsavel_telefone || "").split(",").map((t) => t.trim()).filter(Boolean);
  const responsaveis = nomesResp.map((nome, i) => {
    const telefone = telsResp[i] || "";
    // Se sem telefone, tenta buscar pelo nome na lista de pessoas do CRM
    if (!telefone) {
      const match = pessoas.find((p) => p.nome?.trim().toLowerCase() === nome.trim().toLowerCase());
      return { nome, telefone: match?.telefone ? telefoneParaExibir(match.telefone) : "" };
    }
    return { nome, telefone: telefoneParaExibir(telefone) };
  });

  function salvarResponsaveis(lista: { nome: string; telefone: string }[]) {
    onChange("responsavel_nome", lista.map((r) => r.nome).join(", "));
    onChange("responsavel_telefone", lista.map((r) => r.telefone).filter(Boolean).join(","));
  }

  function abrirFormularioNovoNucleo() {
    onNucleoChange("");
    onRelacaoChange(isCrianca ? "filho" : "membro");
    onRecebeChange(false);
    onPrincipalChange(false);
    setEditandoVinculoId(null);
    setMostrarFormularioNucleo(true);
  }

  function abrirFormularioAlterarNucleo(vinculo: MembroNucleo) {
    onNucleoChange(vinculo.grupo_contato_id);
    onRelacaoChange(getPapelMembro(vinculo));
    onRecebeChange(Boolean(vinculo.recebe_comunicacao));
    onPrincipalChange(Boolean(vinculo.principal_envio));
    setMostrarFormularioNucleo(false);
    setEditandoVinculoId(vinculo.id);
  }

  return (
    <div style={stackStyle}>
      <section style={formSectionStyle}>
        <div style={formSectionHeaderStyle}>
          <span style={formStepStyle}>01</span>
          <div>
            <h3 style={formSectionTitleStyle}>Dados do contato</h3>
            <p style={formSectionDescriptionStyle}>
              Use os mesmos dados-base do convidado para manter importação e exportação consistentes.
            </p>
          </div>
        </div>

        <div style={modalFormStyle}>
          <label style={fieldStyle}>
            <span>Nome do contato</span>
            <input
              value={pessoaForm.nome}
              onChange={(event) => onChange("nome", event.target.value)}
              placeholder="Ex: Andrezza Ferraz"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>Telefone do contato</span>
            <input
              value={pessoaForm.telefone}
              onChange={(event) => onChange("telefone", aplicarMascaraTelefone(event.target.value))}
              placeholder="(11) 99999-9999"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>E-mail</span>
            <input
              value={pessoaForm.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="email@email.com"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>Agrupamento <span style={{ fontWeight: 400, color: "#94a3b8" }}>(família nuclear)</span></span>
            <input
              value={pessoaForm.agrupamento_familia}
              onChange={(event) => onChange("agrupamento_familia", event.target.value)}
              placeholder="Ex: FAMILIA VITOR JOSÉ"
              style={inputStyle}
            />
            {pessoaForm.agrupamento_familia && (
              <span style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                {pessoas.filter((p) => (agrupamentoPorContatoId.get(p.id) || "").trim() === pessoaForm.agrupamento_familia.trim()).length} membro(s) neste agrupamento
              </span>
            )}

          </label>
        </div>

        {/* Contato principal do agrupamento */}
        {pessoaForm.agrupamento_familia && pessoaForm.tipo_contato !== "crianca" && (
          <div style={{ marginBottom: 12 }}>
            <label style={fieldStyle}>
              <span>Contato principal</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, padding: "10px 12px", background: "var(--input-bg, #f8fafc)", border: "1.5px solid #e2e8f0", borderRadius: 10 }}>
                <input
                  type="checkbox"
                  checked={pessoaForm.contato_principal}
                  onChange={(e) => onChange("contato_principal", e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "#7c3aed", cursor: "pointer" }}
                />
                <span style={{ fontSize: 13 }}>Principal do agrupamento</span>
              </div>
            </label>
          </div>
        )}

        {/* Membros do agrupamento */}
        {pessoaForm.agrupamento_familia && (() => {
          const membrosAgrupamento = pessoas.filter(
            (p) => (agrupamentoPorContatoId.get(p.id) || "").trim() === pessoaForm.agrupamento_familia.trim()
          );
          if (membrosAgrupamento.length === 0) return null;
          return (
            <div style={{ marginTop: 8, marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: "0 0 8px" }}>
                Membros do agrupamento {pessoaForm.agrupamento_familia}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {membrosAgrupamento.map((membro) => {
                  const isAtual = membro.id === pessoaSelecionadaId;
                  const ehPrincipal = isAtual ? pessoaForm.contato_principal : contatoPrincipalPorContatoId.get(membro.id) || Boolean(membro.contato_principal);
                  const ehCrianca = normalizarPerfilContato(membro.tipo_contato) === "crianca";
                  return (
                    <div key={membro.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8,
                      background: isAtual ? "#ede9fe" : "var(--card, #f8fafc)",
                      border: `1px solid ${isAtual ? "#c4b5fd" : "#e2e8f0"}`,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: isAtual ? 700 : 400 }}>
                        {membro.nome}{isAtual ? " (você)" : ""}
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {ehCrianca && (
                          <span style={{ fontSize: 11, background: "#fef9c3", color: "#854d0e", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Criança</span>
                        )}
                        {ehPrincipal && (
                          <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>★ Principal</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </section>

      <section style={formSectionStyle}>
        <div style={formSectionHeaderStyle}>
          <span style={formStepStyle}>02</span>
          <div>
            <h3 style={formSectionTitleStyle}>Perfil do contato</h3>
            <p style={formSectionDescriptionStyle}>
              Defina se o contato é adulto ou criança. Quando for criança, o responsável do núcleo receberá a comunicação automaticamente.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {(["adulto", "crianca"] as const).map((opcao) => {
            const ativo = pessoaForm.tipo_contato === opcao;
            return (
              <button
                key={opcao}
                type="button"
                onClick={() => onChange("tipo_contato", opcao)}
                style={{
                  display: "inline-flex", alignItems: "center",
                  border: `1.5px solid ${ativo ? "#7c3aed" : "#e2e8f0"}`,
                  borderRadius: 999, padding: "10px 20px",
                  background: ativo ? "#ede9fe" : "var(--card, #fff)",
                  color: ativo ? "#7c3aed" : "var(--text)",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}
              >
                {opcao === "adulto" ? "Adulto" : "Criança"}
              </button>
            );
          })}
        </div>

        {isCrianca && (
          <>
            <div style={{ marginTop: 8, marginBottom: 4 }}>
              <label style={fieldStyle}>
                <span>Idade da criança</span>
                <input
                  value={pessoaForm.idade_crianca}
                  onChange={(e) => onChange("idade_crianca", e.target.value)}
                  placeholder="Ex: 7"
                  type="number"
                  min="0"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 16, padding: 20, borderRadius: 24, border: "1px solid var(--accent-border, #c4b5fd)", background: "linear-gradient(135deg, #f5f3ff, #fff)", marginTop: 12 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong>Responsável pela criança</strong>
                <span style={{ fontSize: 13, color: "var(--muted, #64748b)" }}>Informe o responsável que receberá a comunicação da criança.</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {responsaveis.map((r, idx) => (
                  <div key={idx}>
                    {editandoRespIdx === idx ? (
                      <EditarRespInlineContatos
                        nomeInicial={r.nome}
                        telefoneInicial={r.telefone}
                        onSalvar={(nome, tel) => {
                          const nova = responsaveis.map((x, i) => i === idx ? { nome, telefone: tel } : x);
                          setEditandoRespIdx(null);
                          salvarResponsaveis(nova);
                        }}
                        onCancelar={() => setEditandoRespIdx(null)}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, border: "1.5px solid var(--line, #e2e8f0)", background: "transparent" }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: 15 }}>{r.nome || "(sem nome)"}</strong>
                          <span style={{ fontSize: 14, color: "var(--muted, #64748b)", marginLeft: 8 }}>{telefoneParaExibir(r.telefone)}</span>
                        </div>
                        <button type="button" onClick={() => { setEditandoRespIdx(idx); setNovoResp(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 6px" }} title="Editar">✏️</button>
                        <button type="button" onClick={() => { const nova = responsaveis.filter((_, i) => i !== idx); setEditandoRespIdx(null); salvarResponsaveis(nova); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 6px" }} title="Excluir">🗑️</button>
                      </div>
                    )}
                  </div>
                ))}

                {novoResp !== null ? (
                  <EditarRespInlineContatos
                    nomeInicial={novoResp.nome}
                    telefoneInicial={novoResp.telefone}
                    onSalvar={(nome, tel) => {
                      const nova = [...responsaveis, { nome, telefone: tel }];
                      setNovoResp(null);
                      salvarResponsaveis(nova);
                    }}
                    onCancelar={() => setNovoResp(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setNovoResp({ nome: "", telefone: "" }); setEditandoRespIdx(null); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1.5px dashed var(--line, #e2e8f0)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#6d28d9", fontWeight: 700, fontSize: 13, width: "100%" }}
                  >
                    + Adicionar responsável
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section style={formSectionStyle}>
        <div style={formSectionHeaderStyle}>
          <span style={formStepStyle}>03</span>
          <div>
            <h3 style={formSectionTitleStyle}>Núcleos</h3>
            <p style={formSectionDescriptionStyle}>
              Grupos de envio aos quais esta pessoa pertence.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {vinculosPessoa.map((vinculo) => {
            const nucleo = nucleosPorId.get(vinculo.grupo_contato_id);
            const nome = nucleo?.nome || "Núcleo não encontrado";
            const principal = Boolean(vinculo.principal_envio);
            return (
              <span key={vinculo.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: principal ? "#ede9fe" : "#f1f5f9", color: principal ? "#6d28d9" : "#334155", border: `1.5px solid ${principal ? "#c4b5fd" : "#e2e8f0"}`, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
                {principal && <span style={{ fontSize: 11 }}>★</span>}
                {nome}
                <button type="button" onClick={() => onRemover(vinculo)} disabled={acaoLoading} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6, fontWeight: 700, fontSize: 15, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
              </span>
            );
          })}
          {vinculosPessoa.length === 0 && (
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Nenhum núcleo vinculado.</span>
          )}
        </div>

        {!mostrarFormularioNucleo && (
          <button type="button" onClick={abrirFormularioNovoNucleo} style={{ ...secondaryButtonStyle, fontSize: 13 }} disabled={acaoLoading}>
            + Adicionar núcleo
          </button>
        )}

        {mostrarFormularioNucleo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <NucleoSearchSelector
              nucleos={nucleos}
              value={vinculoNucleoId}
              onChange={onNucleoChange}
              placeholder="Buscar núcleo pelo nome..."
              allowClear
              clearLabel="Sem núcleo selecionado"
            />
            {!isCrianca && (
              <label style={compactToggleStyle}>
                <input type="checkbox" checked={vinculoPrincipalEnvio} onChange={(e) => onPrincipalChange(e.target.checked)} />
                <span>Contato principal neste núcleo</span>
              </label>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setMostrarFormularioNucleo(false)} style={secondaryButtonStyle} disabled={acaoLoading}>Cancelar</button>
              <button type="button" onClick={() => { onSubmit(); setMostrarFormularioNucleo(false); }} style={buttonStyle} disabled={acaoLoading || !vinculoNucleoId}>{acaoLoading ? "Salvando..." : "Adicionar"}</button>
            </div>
          </div>
        )}
      </section>

      <div style={modalActionsStyle}>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle} disabled={acaoLoading}>
          Cancelar
        </button>
        <button type="button" onClick={onSubmit} style={buttonStyle} disabled={acaoLoading}>
          {acaoLoading ? "Salvando..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

function NucleoFormModal({
  nucleoForm,
  acaoLoading,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  nucleoForm: NucleoForm;
  acaoLoading: boolean;
  onChange: (field: keyof NucleoForm, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div style={modalFormStyle}>
      <label style={fieldStyle}>
        <span>Nome do núcleo</span>
        <input value={nucleoForm.nome} onChange={(event) => onChange("nome", event.target.value)} style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>Tipo</span>
        <select value={nucleoForm.tipo_nucleo} onChange={(event) => onChange("tipo_nucleo", event.target.value)} style={inputStyle}>
          <option value="familia">Família</option>
          <option value="empresa">Empresa</option>
          <option value="politico">Político</option>
          <option value="corporativo">Corporativo</option>
          <option value="igreja">Igreja</option>
          <option value="associacao">Associação</option>
          <option value="escola">Escola</option>
          <option value="fornecedor">Fornecedor</option>
          <option value="outro">Outro</option>
        </select>
      </label>

      <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
        <span>Descrição</span>
        <textarea value={nucleoForm.descricao} onChange={(event) => onChange("descricao", event.target.value)} style={textareaStyle} />
      </label>

      <div style={modalActionsStyle}>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle} disabled={acaoLoading}>
          Cancelar
        </button>
        <button type="button" onClick={onSubmit} style={buttonStyle} disabled={acaoLoading}>
          {acaoLoading ? "Salvando..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

function HistoricoModal({ pessoa, historico }: { pessoa: Pessoa; historico: HistoricoEvento[] }) {
  return (
    <div style={modalContentStyle}>
      <h3 style={modalSectionTitleStyle}>{pessoa.nome}</h3>

      {historico.length === 0 && <div style={emptyStyle}>Nenhum evento encontrado para esta pessoa.</div>}

      {historico.map((item, index) => (
        <div key={`${item.evento_id || index}-${index}`} style={historyRowStyle}>
          <strong>{getEventoNome(item)}</strong>
          <span>Data: {formatarDataEvento(getEventoData(item))}</span>
          {item.relacao_evento && <span>Relação no evento: {item.relacao_evento}</span>}
          <span>RSVP: {labelRsvp(item.status_rsvp)}</span>
          <span>Check-in: {labelCheckin(item.status_checkin)}</span>
        </div>
      ))}
    </div>
  );
}

function ImportarPessoaModal({
  pessoa,
  eventos,
  eventoImportacaoId,
  relacaoEventoImportacao,
  acaoLoading,
  onEventoChange,
  onRelacaoEventoChange,
  onImportar,
}: {
  pessoa: Pessoa;
  eventos: Evento[];
  eventoImportacaoId: string;
  relacaoEventoImportacao: string;
  acaoLoading: boolean;
  onEventoChange: (id: string) => void;
  onRelacaoEventoChange: (valor: string) => void;
  onImportar: () => void;
}) {
  return (
    <div style={modalContentStyle}>
      <p style={mutedStyle}>
        Selecione o evento para importar <strong>{pessoa.nome}</strong> como convidado individual.
      </p>

      <label style={fieldStyle}>
        <span>Evento</span>
        <select value={eventoImportacaoId} onChange={(event) => onEventoChange(event.target.value)} style={inputStyle}>
          <option value="">Selecione um evento</option>
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome}
            </option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span>Relação no evento</span>
        <input
          value={relacaoEventoImportacao}
          onChange={(event) => onRelacaoEventoChange(event.target.value)}
          placeholder="Ex: Aniversariante, Mãe, Padrinho, Fornecedor, Palestrante"
          style={inputStyle}
        />
      </label>

      <div style={modalActionsStyle}>
        <button type="button" onClick={onImportar} style={buttonStyle} disabled={acaoLoading || !eventoImportacaoId}>
          {acaoLoading ? "Importando..." : "Importar pessoa"}
        </button>
      </div>
    </div>
  );
}


function NucleoSearchSelector({
  nucleos,
  value,
  onChange,
  placeholder,
  allowClear = true,
  clearLabel = "Sem núcleo selecionado",
}: {
  nucleos: Nucleo[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const [buscaNucleo, setBuscaNucleo] = useState("");
  const nucleoSelecionado = useMemo(
    () => nucleos.find((nucleo) => nucleo.id === value) || null,
    [nucleos, value],
  );

  const nucleosFiltrados = useMemo(() => {
    const termo = buscaNucleo.trim().toLowerCase();

    if (!termo) return [];

    return nucleos
      .filter((nucleo) =>
        [
          nucleo.nome,
          nucleo.tipo,
          nucleo.tipo_nucleo,
          labelTipoNucleo(getTipoNucleo(nucleo)),
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo)),
      )
      .slice(0, 12);
  }, [nucleos, buscaNucleo]);

  function selecionarNucleo(nucleoId: string) {
    onChange(nucleoId);
    setBuscaNucleo("");
  }

  return (
    <div style={fieldStyle}>
      <span>Núcleo</span>

      {nucleoSelecionado ? (
        <div style={selectedNucleoStyle}>
          <div>
            <strong>{nucleoSelecionado.nome}</strong>
            <span style={memberSubTextStyle}>
              {labelTipoNucleo(getTipoNucleo(nucleoSelecionado))}
            </span>
          </div>

          {allowClear && (
            <button type="button" onClick={() => selecionarNucleo("")} style={secondaryButtonStyle}>
              Trocar
            </button>
          )}
        </div>
      ) : (
        <div style={selectedNucleoStyle}>
          <div>
            <strong>{clearLabel}</strong>
            <span style={memberSubTextStyle}>{nucleos.length} núcleo(s) disponível(is)</span>
          </div>
        </div>
      )}

      <input
        value={buscaNucleo}
        onChange={(event) => setBuscaNucleo(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />

      {buscaNucleo.trim() && (
        <div style={searchResultListStyle}>
          {allowClear && (
            <button
              type="button"
              onClick={() => selecionarNucleo("")}
              style={searchResultButtonStyle}
            >
              {clearLabel}
            </button>
          )}

          {nucleosFiltrados.length === 0 && (
            <div style={emptySearchResultStyle}>Nenhum núcleo encontrado.</div>
          )}

          {nucleosFiltrados.map((nucleo) => (
            <button
              key={nucleo.id}
              type="button"
              onClick={() => selecionarNucleo(nucleo.id)}
              style={searchResultButtonStyle}
            >
              <strong>{nucleo.nome}</strong>
              <span>{labelTipoNucleo(getTipoNucleo(nucleo))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function VinculosPessoaModal({
  pessoa,
  vinculos,
  nucleos,
  nucleosPorId,
  vinculoNucleoId,
  vinculoRelacao,
  vinculoRecebeComunicacao,
  vinculoPrincipalEnvio,
  acaoLoading,
  onNucleoChange,
  onRelacaoChange,
  onRecebeChange,
  onPrincipalChange,
  onQuickUpdateVinculo,
  onSalvar,
  onRemover,
}: {
  pessoa: Pessoa;
  vinculos: MembroNucleo[];
  nucleos: Nucleo[];
  nucleosPorId: Map<string, Nucleo>;
  vinculoNucleoId: string;
  vinculoRelacao: string;
  vinculoRecebeComunicacao: boolean;
  vinculoPrincipalEnvio: boolean;
  acaoLoading: boolean;
  onNucleoChange: (id: string) => void;
  onRelacaoChange: (valor: string) => void;
  onRecebeChange: (valor: boolean) => void;
  onPrincipalChange: (valor: boolean) => void;
  onQuickUpdateVinculo: (membro: MembroNucleo, updates: { recebe_comunicacao?: boolean; principal_envio?: boolean }) => void;
  onSalvar: () => void;
  onRemover: (membro: MembroNucleo) => void;
}) {
  const [mostrarFormularioNucleo, setMostrarFormularioNucleo] = useState(false);
  const [editandoVinculoId, setEditandoVinculoId] = useState<string | null>(null);

  const nucleosDisponiveis = useMemo(() => {
    return nucleos.filter(
      (nucleo) =>
        nucleo.id === vinculoNucleoId ||
        !vinculos.some((vinculo) => vinculo.grupo_contato_id === nucleo.id),
    );
  }, [nucleos, vinculos, vinculoNucleoId]);

  function abrirFormularioNovoNucleo() {
    onNucleoChange("");
    onRelacaoChange("membro");
    onRecebeChange(false);
    onPrincipalChange(false);
    setEditandoVinculoId(null);
    setMostrarFormularioNucleo(true);
  }

  function abrirFormularioAlterarNucleo(vinculo: MembroNucleo) {
    onNucleoChange(vinculo.grupo_contato_id);
    onRelacaoChange(getPapelMembro(vinculo));
    onRecebeChange(Boolean(vinculo.recebe_comunicacao));
    onPrincipalChange(Boolean(vinculo.principal_envio));
    setMostrarFormularioNucleo(false);
    setEditandoVinculoId(vinculo.id);
  }

  return (
    <div style={modalContentStyle}>
      <h3 style={modalSectionTitleStyle}>{pessoa.nome}</h3>
      <p style={mutedStyle}>
        A pessoa pode participar de vários núcleos. Altere um vínculo existente ou adicione um novo núcleo.
      </p>

      <div style={formSectionStyle}>
        <div style={formSectionHeaderStyle}>
          <span style={formStepStyle}>01</span>
          <div>
            <h3 style={formSectionTitleStyle}>Núcleos vinculados</h3>
            <p style={formSectionDescriptionStyle}>
              Cada vínculo tem uma relação própria, comunicação e principal para envio.
            </p>
          </div>
        </div>

        <div style={stackStyle}>
          {vinculos.length === 0 && <div style={emptyStyle}>Nenhum núcleo vinculado.</div>}

          {vinculos.length > 0 && (
            <div style={stackStyle}>
              {vinculos.map((vinculo) => {
                const nucleo = nucleosPorId.get(vinculo.grupo_contato_id);

                return (
                  <div key={vinculo.id} style={editandoVinculoId === vinculo.id ? { ...memberManageRowStyle, flexDirection: "column", alignItems: "stretch" } : memberManageRowStyle}>
                    {editandoVinculoId === vinculo.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <strong>{nucleo?.nome || "Núcleo não encontrado"}</strong>
                        <label style={fieldStyle}>
                          <span>Relação no núcleo</span>
                          <input
                            value={vinculoRelacao}
                            onChange={(event) => onRelacaoChange(event.target.value)}
                            placeholder="Ex: Mãe, Financeiro, Diretor, Líder"
                            style={inputStyle}
                          />
                        </label>
                        <div style={vinculoInlineFlagsStyle}>
                          <label style={compactToggleStyle}>
                            <input type="checkbox" checked={vinculoRecebeComunicacao} onChange={(e) => onRecebeChange(e.target.checked)} />
                            <span>Recebe comunicação neste núcleo</span>
                          </label>
                          {normalizarPerfilContato(pessoa.tipo_contato) !== "crianca" && (
                            <label style={compactToggleStyle}>
                              <input type="checkbox" checked={vinculoPrincipalEnvio} onChange={(e) => onPrincipalChange(e.target.checked)} />
                              <span>Contato principal núcleo</span>
                            </label>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => setEditandoVinculoId(null)} style={secondaryButtonStyle} disabled={acaoLoading}>Cancelar</button>
                          <button type="button" onClick={async () => { await onSalvar(); setEditandoVinculoId(null); }} style={buttonStyle} disabled={acaoLoading || !vinculoNucleoId}>{acaoLoading ? "Salvando..." : "Salvar"}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>{nucleo?.nome || "Núcleo não encontrado"}</strong>
                          <span style={memberSubTextStyle}>
                            Relação no núcleo: {labelPapel(getPapelMembro(vinculo))}
                          </span>
                          <div style={{ ...vinculoInlineFlagsStyle, marginTop: 12 }}>
                            <label style={compactToggleStyle}>
                              <input
                                type="checkbox"
                                checked={Boolean(vinculo.recebe_comunicacao)}
                                onChange={(event) => onQuickUpdateVinculo(vinculo, { recebe_comunicacao: event.target.checked })}
                                disabled={acaoLoading}
                              />
                              <span>Recebe comunicação neste núcleo</span>
                            </label>
                            {normalizarPerfilContato(pessoa.tipo_contato) !== "crianca" && (
                              <label style={compactToggleStyle}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(vinculo.principal_envio)}
                                  onChange={(event) => {
                                    if (vinculo.grupo_contato_id === vinculoNucleoId) onPrincipalChange(event.target.checked);
                                    onQuickUpdateVinculo(vinculo, { principal_envio: event.target.checked });
                                  }}
                                  disabled={acaoLoading}
                                />
                                <span>Contato principal núcleo</span>
                              </label>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignSelf: "flex-start" }}>
                          <button type="button" onClick={() => abrirFormularioAlterarNucleo(vinculo)} style={secondaryButtonStyle} disabled={acaoLoading}>Alterar</button>
                          <button type="button" onClick={() => onRemover(vinculo)} style={dangerButtonStyle} disabled={acaoLoading}>Remover</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!mostrarFormularioNucleo && !editandoVinculoId && (
            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={abrirFormularioNovoNucleo}
                style={secondaryButtonStyle}
                disabled={acaoLoading}
              >
                + Adicionar núcleo
              </button>
            </div>
          )}

          {mostrarFormularioNucleo && (
            <div style={historyRowStyle}>
              <div style={modalFormStyle}>
                <NucleoSearchSelector
                  nucleos={nucleosDisponiveis}
                  value={vinculoNucleoId}
                  onChange={onNucleoChange}
                  placeholder="Buscar núcleo pelo nome..."
                  allowClear
                  clearLabel="Selecione um núcleo"
                />

                <label style={fieldStyle}>
                  <span>Relação no núcleo</span>
                  <input
                    value={vinculoRelacao}
                    onChange={(event) => onRelacaoChange(event.target.value)}
                    placeholder="Ex: Mãe, Financeiro, Diretor, Líder"
                    style={inputStyle}
                  />
                </label>

                <label style={toggleStyle}>
                  <input type="checkbox" checked={vinculoPrincipalEnvio} onChange={(event) => onPrincipalChange(event.target.checked)} />
                  <span>Contato principal neste núcleo</span>
                </label>

                <div style={modalActionsStyle}>
                  <button
                    type="button"
                    onClick={() => setMostrarFormularioNucleo(false)}
                    style={secondaryButtonStyle}
                    disabled={acaoLoading}
                  >
                    Ocultar vínculo
                  </button>

                  <button type="button" onClick={onSalvar} style={buttonStyle} disabled={acaoLoading || !vinculoNucleoId}>
                    {acaoLoading ? "Salvando..." : "Salvar vínculo"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MembrosNucleoModal({
  nucleo,
  membros,
  pessoas,
  pessoasPorId,
  vinculoPessoaId,
  vinculoRelacao,
  vinculoRecebeComunicacao,
  vinculoPrincipalEnvio,
  acaoLoading,
  onPessoaChange,
  onRelacaoChange,
  onRecebeChange,
  onPrincipalChange,
  onSalvar,
  onCriarPessoaDireta,
  onEditarPessoa,
  onRemover,
}: {
  nucleo: Nucleo;
  membros: MembroNucleo[];
  pessoas: Pessoa[];
  pessoasPorId: Map<string, Pessoa>;
  vinculoPessoaId: string;
  vinculoRelacao: string;
  vinculoRecebeComunicacao: boolean;
  vinculoPrincipalEnvio: boolean;
  acaoLoading: boolean;
  onPessoaChange: (id: string) => void;
  onRelacaoChange: (valor: string) => void;
  onRecebeChange: (valor: boolean) => void;
  onPrincipalChange: (valor: boolean) => void;
  onSalvar: () => void;
  onCriarPessoaDireta: (dados: PessoaForm) => Promise<boolean>;
  onEditarPessoa: (pessoa: Pessoa) => void;
  onRemover: (membro: MembroNucleo) => void;
}) {
  const pessoasDisponiveis = pessoas.filter(
    (pessoa) => !membros.some((membro) => membro.tenant_contato_id === pessoa.id),
  );
  const [mostrarCriacaoDireta, setMostrarCriacaoDireta] = useState(false);
  const [mostrarAdicionarExistente, setMostrarAdicionarExistente] = useState(false);
  const [novaPessoaNucleoForm, setNovaPessoaNucleoForm] = useState<PessoaForm>(pessoaFormVazio);

  const responsavelPrincipalNucleo = useMemo(() => {
    const vinculoResponsavel =
      membros.find((membro) => Boolean(membro.principal_envio)) ||
      membros.find((membro) => getPapelMembro(membro) === "responsavel") ||
      membros.find((membro) => Boolean(pessoasPorId.get(membro.tenant_contato_id)?.telefone));

    if (!vinculoResponsavel) return null;
    return pessoasPorId.get(vinculoResponsavel.tenant_contato_id) || null;
  }, [membros, pessoasPorId]);

  function updateNovaPessoaNucleoForm(field: keyof PessoaForm, value: string | boolean) {
    if (field === "tipo_contato") {
      const perfil = normalizarPerfilContato(String(value));

      setNovaPessoaNucleoForm((current) => ({
        ...current,
        tipo_contato: perfil,
        responsavel_nome: perfil === "crianca" ? responsavelPrincipalNucleo?.nome || current.responsavel_nome : "",
        responsavel_telefone: perfil === "crianca" ? responsavelPrincipalNucleo?.telefone || current.responsavel_telefone : "",
      }));

      if (perfil === "crianca" && vinculoRelacao === "membro") {
        onRelacaoChange("filho");
      }

      return;
    }

    setNovaPessoaNucleoForm((current) => ({ ...current, [field]: value }));
  }

  async function criarPessoaDireta() {
    const criado = await onCriarPessoaDireta(novaPessoaNucleoForm);

    if (criado) {
      setNovaPessoaNucleoForm(pessoaFormVazio);
      setMostrarCriacaoDireta(false);
    }
  }

  return (
    <div style={modalContentStyle}>
      <h3 style={modalSectionTitleStyle}>{nucleo.nome}</h3>

      {membros.length === 0 && <div style={emptyStyle}>Nenhum membro vinculado.</div>}

      {membros.map((membro) => {
        const pessoa = pessoasPorId.get(membro.tenant_contato_id);

        return (
          <div key={membro.id} style={memberManageRowStyle}>
            <div>
              <strong>{pessoa?.nome || "Pessoa não encontrada"}</strong>
              <span style={memberSubTextStyle}>{pessoa?.telefone || "Sem telefone"}</span>
              <span style={memberSubTextStyle}>Relação no núcleo: {labelPapel(getPapelMembro(membro))}</span>
              <span style={memberSubTextStyle}>
                {membro.recebe_comunicacao || membro.principal_envio ? "Recebe comunicação" : "Não recebe comunicação"}
              </span>
            </div>

            <div style={memberActionsStyle}>
              {pessoa && (
                <button
                  type="button"
                  onClick={() => onEditarPessoa(pessoa)}
                  style={secondaryButtonStyle}
                  disabled={acaoLoading}
                >
                  Alterar
                </button>
              )}

              <button type="button" onClick={() => onRemover(membro)} style={dangerButtonStyle} disabled={acaoLoading}>
                Remover
              </button>
            </div>
          </div>
        );
      })}

      <div style={historyRowStyle}>
        <div style={memberManageRowStyle}>
          <div>
            <strong>Adicionar contato existente a este núcleo</strong>
            <span style={memberSubTextStyle}>
              Use quando a pessoa já existe em Contatos. Ela será vinculada automaticamente a {nucleo.nome}.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarAdicionarExistente((current) => !current)}
            style={secondaryButtonStyle}
            disabled={acaoLoading}
          >
            {mostrarAdicionarExistente ? "Ocultar vínculo" : "+ Adicionar membro"}
          </button>
        </div>

        {mostrarAdicionarExistente && (
          <div style={stackStyle}>
            <div style={modalFormStyle}>
              <label style={fieldStyle}>
                <span>Adicionar pessoa</span>
                <select value={vinculoPessoaId} onChange={(event) => onPessoaChange(event.target.value)} style={inputStyle}>
                  <option value="">Selecione uma pessoa</option>
                  {pessoasDisponiveis.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome} {pessoa.telefone ? `· ${pessoa.telefone}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span>Relação no núcleo</span>
                <input
                  value={vinculoRelacao}
                  onChange={(event) => onRelacaoChange(event.target.value)}
                  placeholder="Ex: Mãe, Filho, Financeiro, Líder"
                  style={inputStyle}
                />
              </label>

              <label style={toggleStyle}>
                <input type="checkbox" checked={vinculoPrincipalEnvio} onChange={(event) => onPrincipalChange(event.target.checked)} />
                <span>Contato principal neste núcleo</span>
              </label>

              <div style={modalActionsStyle}>
                <button type="button" onClick={onSalvar} style={buttonStyle} disabled={acaoLoading || !vinculoPessoaId}>
                  {acaoLoading ? "Salvando..." : "Adicionar membro"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={historyRowStyle}>
        <div style={memberManageRowStyle}>
          <div>
            <strong>Criar novo contato neste núcleo</strong>
            <span style={memberSubTextStyle}>
              Use quando a pessoa ainda não existe em Contatos. Ela será criada e vinculada automaticamente a {nucleo.nome}.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarCriacaoDireta((current) => !current)}
            style={secondaryButtonStyle}
            disabled={acaoLoading}
          >
            {mostrarCriacaoDireta ? "Ocultar cadastro" : "+ Novo contato"}
          </button>
        </div>

        {mostrarCriacaoDireta && (
          <div style={stackStyle}>
            <div style={modalFormStyle}>
              <label style={fieldStyle}>
                <span>Nome do contato</span>
                <input
                  value={novaPessoaNucleoForm.nome}
                  onChange={(event) => updateNovaPessoaNucleoForm("nome", event.target.value)}
                  placeholder="Ex: Andrezza Ferraz"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span>Telefone do contato</span>
                <input
                  value={novaPessoaNucleoForm.telefone}
                  onChange={(event) => updateNovaPessoaNucleoForm("telefone", aplicarMascaraTelefone(event.target.value))}
                  placeholder="(11) 99999-9999"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span>E-mail</span>
                <input
                  value={novaPessoaNucleoForm.email}
                  onChange={(event) => updateNovaPessoaNucleoForm("email", event.target.value)}
                  placeholder="email@email.com"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span>Perfil do contato</span>
                <select
                  value={novaPessoaNucleoForm.tipo_contato}
                  onChange={(event) => updateNovaPessoaNucleoForm("tipo_contato", event.target.value)}
                  style={inputStyle}
                >
                  <option value="adulto">Adulto</option>
                  <option value="crianca">Criança</option>
                </select>
              </label>
            </div>

            {novaPessoaNucleoForm.tipo_contato === "crianca" && (
              <div style={responsavelBoxStyle}>
                <h4 style={responsavelTitleStyle}>Responsável pela Criança (Recebe a comunicação)</h4>
                <p style={formSectionDescriptionStyle}>
                  Quando o núcleo já possui responsável/principal, estes campos são preenchidos automaticamente.
                </p>

                <div style={modalFormStyle}>
                  <label style={fieldStyle}>
                    <span>Nome do responsável</span>
                    <input
                      value={novaPessoaNucleoForm.responsavel_nome}
                      onChange={(event) => updateNovaPessoaNucleoForm("responsavel_nome", event.target.value)}
                      placeholder="Ex: Jessica Amaral"
                      style={inputStyle}
                    />
                  </label>

                  <label style={fieldStyle}>
                    <span>Telefone do responsável</span>
                    <input
                      value={novaPessoaNucleoForm.responsavel_telefone}
                      onChange={(event) => updateNovaPessoaNucleoForm("responsavel_telefone", aplicarMascaraTelefone(event.target.value))}
                      placeholder="(11) 99999-9999"
                      style={inputStyle}
                    />
                  </label>
                </div>
              </div>
            )}

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={criarPessoaDireta}
                style={buttonStyle}
                disabled={acaoLoading || !novaPessoaNucleoForm.nome.trim()}
              >
                {acaoLoading ? "Criando..." : "Criar contato e vincular"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportarNucleoModal({
  nucleo,
  membros,
  eventos,
  eventoImportacaoId,
  relacaoEventoImportacao,
  acaoLoading,
  pessoasPorId,
  onEventoChange,
  onRelacaoEventoChange,
  onImportar,
}: {
  nucleo: Nucleo;
  membros: MembroNucleo[];
  eventos: Evento[];
  eventoImportacaoId: string;
  relacaoEventoImportacao: string;
  acaoLoading: boolean;
  pessoasPorId: Map<string, Pessoa>;
  onEventoChange: (id: string) => void;
  onRelacaoEventoChange: (valor: string) => void;
  onImportar: () => void;
}) {
  return (
    <div style={modalContentStyle}>
      <p style={mutedStyle}>
        Selecione o evento para importar o núcleo <strong>{nucleo.nome}</strong>.
      </p>

      <div style={miniListStyle}>
        {membros.slice(0, 8).map((membro) => {
          const pessoa = pessoasPorId.get(membro.tenant_contato_id);
          return (
            <span key={membro.id} style={miniItemStyle}>
              {pessoa?.nome || "Pessoa"} · {labelPapel(getPapelMembro(membro))}
            </span>
          );
        })}
      </div>

      <label style={fieldStyle}>
        <span>Evento</span>
        <select value={eventoImportacaoId} onChange={(event) => onEventoChange(event.target.value)} style={inputStyle}>
          <option value="">Selecione um evento</option>
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome}
            </option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span>Relação no evento</span>
        <input
          value={relacaoEventoImportacao}
          onChange={(event) => onRelacaoEventoChange(event.target.value)}
          placeholder="Ex: Família da aniversariante, Convidado, Equipe, Fornecedor"
          style={inputStyle}
        />
      </label>

      <div style={modalActionsStyle}>
        <button type="button" onClick={onImportar} style={buttonStyle} disabled={acaoLoading || !eventoImportacaoId}>
          {acaoLoading ? "Importando..." : "Importar núcleo"}
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

function getTipoNucleo(nucleo: Nucleo) {
  return nucleo.tipo_nucleo || nucleo.tipo || "familia";
}

function getPapelMembro(membro: MembroNucleo) {
  return membro.papel_nucleo || membro.papel || "membro";
}

function normalizarPerfilContato(tipo: string | null | undefined) {
  if (tipo === "crianca") return "crianca";
  return "adulto";
}

function labelTipoContato(tipo: string | null) {
  const perfil = normalizarPerfilContato(tipo);
  if (perfil === "crianca") return "Criança";
  return "Adulto";
}

function labelTipoNucleo(tipo: string | null) {
  if (tipo === "familia") return "Família";
  if (tipo === "empresa") return "Empresa";
  if (tipo === "escola") return "Escola";
  if (tipo === "politico") return "Político";
  if (tipo === "corporativo") return "Corporativo";
  if (tipo === "igreja") return "Igreja";
  if (tipo === "associacao") return "Associação";
  if (tipo === "fornecedor") return "Fornecedor";
  return "Outro";
}

function labelPapel(papel: string | null) {
  if (!papel) return "Membro";
  const p = papel.trim().toLowerCase();
  if (p === "responsavel") return "Responsável";
  if (p === "crianca" || p === "filho(a)" || p === "filho" || p === "filha") return "Filho(a)";
  if (p === "conjuge") return "Cônjuge";
  if (p === "lider") return "Líder";
  if (p === "financeiro") return "Financeiro";
  if (p === "membro") return "Membro";
  return titleCase(papel);
}

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Não vai";
  return "Pendente";
}

function labelCheckin(status: string | null) {
  if (status === "entrou") return "Entrou";
  if (status === "entrou_sem_rsvp" || status === "entrou_excecao") return "Entrou sem RSVP";
  return "Não entrou";
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
    const dataA = getEventoData(a) || a.created_at || "";
    const dataB = getEventoData(b) || b.created_at || "";
    return dataB.localeCompare(dataA);
  })[0];
}

function getEventoRelacao(item: HistoricoEvento) {
  return Array.isArray(item.eventos) ? item.eventos[0] : item.eventos;
}

function getEventoNome(item: HistoricoEvento) {
  return getEventoRelacao(item)?.nome || "Evento";
}

function getEventoData(item: HistoricoEvento) {
  return getEventoRelacao(item)?.data_evento || null;
}

function formatarDataEvento(data: string | null | undefined) {
  if (!data) return "Sem data";

  const parsed = new Date(`${data}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return data;

  return parsed.toLocaleDateString("pt-BR");
}

function normalizarTelefone(telefone: string) {
  return String(telefone || "").replace(/\D/g, "");
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function gerarToken() {
  return "EVT-" + Math.floor(100000 + Math.random() * 900000);
}

function getModalTitulo(modal: ModalTipo) {
  if (modal === "criarPessoa") return "Nova pessoa";
  if (modal === "editarPessoa") return "Editar pessoa";
  if (modal === "historico") return "Histórico da pessoa";
  if (modal === "vinculosPessoa") return "Vínculos da pessoa";
  if (modal === "importarPessoa") return "Importar pessoa para evento";
  if (modal === "criarNucleo") return "Novo núcleo";
  if (modal === "editarNucleo") return "Editar núcleo";
  if (modal === "membrosNucleo") return "Membros do núcleo";
  if (modal === "importarNucleo") return "Importar núcleo para evento";
  return "Contatos";
}

const toastWrapperStyle: CSSProperties = {
  position: "fixed",
  top: 22,
  right: 22,
  zIndex: 10050,
  pointerEvents: "none",
};

const toastCardStyle: CSSProperties = {
  minWidth: 280,
  maxWidth: 420,
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 20,
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "0 22px 60px rgba(15,23,42,0.18)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const toastIconStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: "#16a34a",
  color: "#ffffff",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  fontWeight: 950,
  flex: "0 0 auto",
};

const toastTitleStyle: CSSProperties = {
  display: "block",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 950,
};

const toastMessageStyle: CSSProperties = {
  display: "block",
  marginTop: 2,
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 750,
};

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "clamp(14px, 3vw, 24px)",
  background: "var(--bg)",
  color: "var(--text)",
};

const heroCardStyle: CSSProperties = {
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "var(--shadow-card)",
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 38,
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const pageSubtitleStyle: CSSProperties = {
  color: "var(--muted)",
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
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--muted)",
  fontWeight: 950,
  cursor: "pointer",
};

const tabActiveStyle: CSSProperties = {
  ...tabStyle,
  border: "1px solid var(--line)",
  background: "var(--primary-soft)",
  color: "var(--primary)",
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
  background: "var(--card)",
  border: "1px solid var(--line)",
  boxShadow: "var(--shadow-card)",
};

const metricLabelStyle: CSSProperties = {
  display: "block",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const metricValueStyle: CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "var(--text)",
  fontSize: 30,
  fontWeight: 950,
};

const sectionStyle: CSSProperties = {
  marginTop: 18,
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "var(--shadow-card)",
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
  color: "var(--text)",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontWeight: 700,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 850,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 54,
  padding: "0 18px",
  borderRadius: 18,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
  marginBottom: 18,
};


const nucleoToolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  margin: "-2px 0 18px",
};

const filterPillsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const filterPillStyle: CSSProperties = {
  padding: "9px 12px",
  minHeight: 38,
  borderRadius: 999,
  background: "var(--card)",
  border: "1px solid var(--line)",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const filterPillActiveStyle: CSSProperties = {
  ...filterPillStyle,
  background: "var(--primary-soft)",
  border: "1px solid var(--line)",
  color: "var(--primary)",
};

const viewToggleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: 4,
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--card)",
};

const viewToggleButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const viewToggleActiveStyle: CSSProperties = {
  ...viewToggleButtonStyle,
  background: "var(--text)",
  color: "var(--bg)",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  padding: 16,
  resize: "vertical",
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
  background: "var(--card)",
  border: "1px solid var(--line)",
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  border: "1px solid rgba(220,38,38,0.24)",
  color: "var(--red)",
  background: "var(--red-soft)",
};

const listStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const rowCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  padding: "16px 18px",
  borderRadius: 22,
  border: "1px solid var(--line)",
  background: "var(--card-strong)",
  flexWrap: "wrap",
};


const compactListStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
};

const compactRowCardStyle: CSSProperties = {
  ...rowCardStyle,
  padding: "12px 14px",
  borderRadius: 18,
  alignItems: "center",
};

const rowCardMainStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  flex: "1 1 620px",
  minWidth: 0,
};


const compactRowCardMainStyle: CSSProperties = {
  ...rowCardMainStyle,
  flex: "1 1 520px",
};

const rowContentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const rowTopStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const rowActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  flex: "0 0 auto",
};


const compactRowActionsStyle: CSSProperties = {
  ...rowActionsStyle,
  gap: 6,
};

const avatarStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 16,
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontWeight: 950,
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
};

const nucleoIconStyle: CSSProperties = {
  ...avatarStyle,
  background: "var(--green-soft)",
  color: "var(--green)",
};

const itemTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.02em",
  overflowWrap: "anywhere",
};

const mutedStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "var(--muted)",
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const smallMutedStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "var(--muted)",
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
  background: "var(--card)",
  color: "var(--primary)",
  border: "1px solid var(--line)",
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
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 12,
  fontWeight: 900,
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const miniItemDetailedStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 3,
  padding: "8px 11px",
  borderRadius: 14,
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 12,
  fontWeight: 900,
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const miniItemDetailStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 850,
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed var(--line)",
  color: "var(--muted)",
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
  width: "min(880px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  padding: "clamp(18px, 4vw, 28px)",
  borderRadius: 28,
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "var(--shadow-card)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const modalKickerStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

const modalTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "var(--text)",
  fontSize: 28,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const modalFormStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 14,
  alignItems: "start",
};

const modalContentStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const modalActionsStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const modalSectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 20,
  fontWeight: 950,
};

const historyRowStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card-strong)",
  color: "var(--muted)",
  fontWeight: 750,
};

const memberManageRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  padding: 22,
  borderRadius: 22,
  border: "1px solid #c4b5fd",
  background: "#faf5ff",
  fontWeight: 800,
  flexWrap: "wrap",
};

const memberActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const memberSubTextStyle: CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 750,
};

const stackStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const formSectionStyle: CSSProperties = {
  padding: "clamp(16px, 3vw, 24px)",
  borderRadius: 22,
  border: "1px solid var(--line)",
  background: "var(--card)",
};

const formSectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 16,
};

const formStepStyle: CSSProperties = {
  minWidth: 34,
  color: "var(--text)",
  fontSize: 18,
  fontWeight: 900,
};

const formSectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 18,
  fontWeight: 950,
};

const formSectionDescriptionStyle: CSSProperties = {
  margin: "7px 0 0",
  color: "var(--muted)",
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 700,
};

const responsavelBoxStyle: CSSProperties = {
  marginTop: 14,
  padding: 22,
  borderRadius: 22,
  border: "1px solid #c4b5fd",
  background: "#faf5ff",
};

const responsavelTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 16,
  fontWeight: 950,
};


const confirmBoxStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 18,
  borderRadius: 20,
  border: "1px solid rgba(220,38,38,0.24)",
  background: "var(--red-soft)",
  color: "var(--red)",
  marginBottom: 16,
};

const confirmHighlightStyle: CSSProperties = {
  color: "var(--red)",
  fontSize: 18,
  fontWeight: 950,
};

const confirmMessageStyle: CSSProperties = {
  margin: 0,
  color: "var(--red)",
  fontSize: 14,
  lineHeight: 1.5,
  fontWeight: 750,
};


const selectedNucleoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card-strong)",
  color: "var(--muted)",
  fontWeight: 850,
  flexWrap: "wrap",
};

const searchResultListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  maxHeight: 280,
  overflowY: "auto",
  padding: 10,
  borderRadius: 18,
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "var(--shadow-card)",
  marginTop: -10,
};

const searchResultButtonStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "var(--card-strong)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 850,
  textAlign: "left",
  cursor: "pointer",
};

const emptySearchResultStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px dashed var(--line)",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
};



const vinculoInlineFlagsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const compactToggleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "10px 14px",
  background: "var(--card)",
  fontWeight: 800,
  color: "var(--text)",
};

const toggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card-strong)",
  color: "var(--muted)",
  fontWeight: 850,
};
