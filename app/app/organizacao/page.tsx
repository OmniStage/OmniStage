"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AbaOrganizacao =
  | "visao"
  | "equipe"
  | "contratacoes"
  | "producao"
  | "roteiro"
  | "pendencias";
type SubPlanejamento =
  | "producao"
  | "fornecedores"
  | "contratacoes"
  | "financeiro";
type SubExecucao = "roteiro" | "equipe" | "checklist";

type Evento = {
  id: string;
  nome: string | null;
  tenant_id: string | null;
  data_evento?: string | null;
  data_inicio?: string | null;
  hora_inicio?: string | null;
  local?: string | null;
  nome_local?: string | null;
  status?: string | null;
};

type AcaoProducao = {
  id: string;
  tenant_id: string;
  evento_id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  status:
    | "ideia"
    | "a_fazer"
    | "em_andamento"
    | "aguardando_terceiro"
    | "concluido"
    | "cancelado"
    | string;
  prioridade: "baixa" | "media" | "alta" | "urgente" | string;
  responsavel_nome: string | null;
  fornecedor_id: string | null;
  data_limite: string | null;
  concluido_em: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em?: string;
};

type Checklist = {
  id: string;
  tenant_id: string;
  evento_id: string;
  categoria: string;
  item: string;
  descricao: string | null;
  tipo:
    | "planejamento"
    | "dia_evento"
    | "montagem"
    | "desmontagem"
    | "outro"
    | string;
  obrigatorio: boolean;
  concluido: boolean;
  concluido_em: string | null;
  responsavel_nome: string | null;
  ordem: number;
  agenda_item_id?: string | null;
};

type Fornecedor = {
  id: string;
  tenant_id: string;
  nome: string;
  categoria: string;
  responsavel_nome: string | null;
  telefone: string | null;
  telefone_normalizado: string | null;
  email: string | null;
  documento: string | null;
  endereco: string | null;
  site: string | null;
  instagram: string | null;
  observacoes: string | null;
  ativo: boolean;
};

type FornecedorEvento = {
  id: string;
  tenant_id: string;
  evento_id: string;
  fornecedor_id: string;
  categoria_evento: string | null;
  status:
    | "orcamento"
    | "negociando"
    | "contratado"
    | "confirmado"
    | "cancelado"
    | "dispensado"
    | string;
  valor_orcado: number | string | null;
  valor_fechado: number | string | null;
  data_contratacao: string | null;
  data_confirmacao: string | null;
  observacoes: string | null;
  fornecedor?: Fornecedor | null;
};

type Contratacao = {
  id: string;
  tenant_id: string;
  evento_id: string;
  fornecedor_evento_id: string | null;
  titulo: string;
  descricao: string | null;
  valor_contratado: number | string;
  valor_entrada: number | string;
  data_entrada: string | null;
  valor_pago: number | string;
  valor_pendente: number | string | null;
  parcelas: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: "pendente" | "parcial" | "pago" | "vencido" | "cancelado" | string;
  forma_pagamento: string | null;
  orcamento_url: string | null;
  contrato_url: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
};

type Equipe = {
  id: string;
  tenant_id: string;
  evento_id: string;
  nome: string;
  funcao: string;
  telefone: string | null;
  email: string | null;
  contato_principal: boolean;
  horario_inicio: string | null;
  horario_fim: string | null;
  status:
    | "convidado"
    | "confirmado"
    | "presente"
    | "ausente"
    | "cancelado"
    | string;
  observacoes: string | null;
};

type AgendaItem = {
  id: string;
  evento_id: string;
  tenant_id: string | null;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  responsavel: string | null;
  cor: string | null;
};

const CATEGORIAS_FORNECEDOR = [
  { value: "buffet", label: "Buffet" },
  { value: "decoracao", label: "Decoração" },
  { value: "fotografia", label: "Fotografia" },
  { value: "filmagem", label: "Filmagem" },
  { value: "dj", label: "DJ" },
  { value: "banda", label: "Banda" },
  { value: "cerimonial", label: "Cerimonial" },
  { value: "seguranca", label: "Segurança" },
  { value: "bar", label: "Bar" },
  { value: "doces", label: "Doces" },
  { value: "lembrancas", label: "Lembranças" },
  { value: "espaco", label: "Espaço" },
  { value: "outros", label: "Outros" },
];

const STATUS_PRODUCAO = [
  { value: "ideia", label: "Ideias" },
  { value: "a_fazer", label: "A fazer" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_terceiro", label: "Aguardando terceiros" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const CATEGORIAS_PRODUCAO = [
  { value: "decoracao", label: "🎨 Decoração" },
  { value: "buffet", label: "🍽 Buffet" },
  { value: "foto_video", label: "📷 Foto e Vídeo" },
  { value: "musica", label: "🎵 Música" },
  { value: "cerimonial", label: "📋 Cerimonial" },
  { value: "recepcao", label: "🚪 Recepção" },
  { value: "espaco", label: "🏢 Espaço" },
  { value: "logistica", label: "🚗 Logística" },
  { value: "equipe", label: "👥 Equipe" },
  { value: "financeiro", label: "💰 Financeiro" },
  { value: "contratos", label: "📄 Contratos" },
  { value: "brindes", label: "🎁 Brindes" },
  { value: "comunicacao", label: "📢 Comunicação" },
  { value: "outros", label: "⭐ Outros" },
];

const COLUNAS_PRODUCAO = [
  {
    value: "ideia",
    label: "Ideias",
    description: "Sugestões e possibilidades para avaliar.",
  },
  {
    value: "a_fazer",
    label: "A fazer",
    description: "Ações que ainda precisam começar.",
  },
  {
    value: "em_andamento",
    label: "Em andamento",
    description: "Itens já em execução.",
  },
  {
    value: "aguardando_terceiro",
    label: "Aguardando terceiros",
    description: "Dependências de fornecedor, cliente ou equipe.",
  },
  { value: "concluido", label: "Concluído", description: "Ações finalizadas." },
];

const STATUS_FORNECEDOR = [
  "orcamento",
  "negociando",
  "contratado",
  "confirmado",
  "cancelado",
  "dispensado",
];
const STATUS_CONTRATACAO = [
  "pendente",
  "parcial",
  "pago",
  "vencido",
  "cancelado",
];
const STATUS_EQUIPE = [
  "convidado",
  "confirmado",
  "presente",
  "ausente",
  "cancelado",
];

const CHECKLIST_PADRAO_DIA = [
  {
    item: "Som testado",
    categoria: "som",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Iluminação testada",
    categoria: "iluminacao",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Buffet montado",
    categoria: "buffet",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Mesa principal montada",
    categoria: "decoracao",
    tipo: "montagem",
    obrigatorio: true,
  },
  {
    item: "Decoração finalizada",
    categoria: "decoracao",
    tipo: "montagem",
    obrigatorio: true,
  },
  {
    item: "Recepção alinhada",
    categoria: "recepcao",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Equipe de check-in posicionada",
    categoria: "check-in",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "QR Code / lista de convidados conferida",
    categoria: "check-in",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Fotógrafo / filmagem confirmados",
    categoria: "foto e video",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Cerimonial alinhado",
    categoria: "cerimonial",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Banheiros revisados",
    categoria: "infraestrutura",
    tipo: "dia_evento",
    obrigatorio: false,
  },
  {
    item: "Gerador / energia conferidos",
    categoria: "infraestrutura",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Brinde / parabéns / momento especial preparado",
    categoria: "cerimonial",
    tipo: "dia_evento",
    obrigatorio: true,
  },
  {
    item: "Saída / desmontagem alinhada",
    categoria: "desmontagem",
    tipo: "desmontagem",
    obrigatorio: false,
  },
];

const CATEGORIAS_ROTEIRO = [
  { value: "montagem", label: "Montagem" },
  { value: "cerimonial", label: "Cerimonial" },
  { value: "recepcao", label: "Recepção" },
  { value: "buffet", label: "Buffet" },
  { value: "musica", label: "Música" },
  { value: "atracao", label: "Atração" },
  { value: "fotografia", label: "Fotografia" },
  { value: "video", label: "Vídeo" },
  { value: "seguranca", label: "Segurança" },
  { value: "limpeza", label: "Limpeza" },
  { value: "desmontagem", label: "Desmontagem" },
  { value: "outro", label: "Outro" },
];

const ROTEIROS_PADRAO = [
  {
    value: "aniversario_infantil",
    label: "Aniversário infantil",
    items: [
      ["Montagem inicial", "montagem", "08:00", "09:00"],
      ["Chegada da decoração", "montagem", "09:00", "10:30"],
      ["Buffet montado", "buffet", "11:00", "12:00"],
      ["Teste de som e iluminação", "infraestrutura", "12:00", "12:30"],
      ["Recepção dos convidados", "recepcao", "13:00", "13:30"],
      ["Início do evento", "cerimonial", "13:30", "13:45"],
      ["Atividades / recreação", "recreacao", "14:00", "15:30"],
      ["Parabéns", "cerimonial", "16:00", "16:20"],
      ["Fotos oficiais", "foto_video", "16:20", "16:45"],
      ["Encerramento", "cerimonial", "17:00", "17:15"],
      ["Desmontagem", "desmontagem", "17:30", "18:30"],
    ],
  },
  {
    value: "quinze_anos",
    label: "15 anos",
    items: [
      ["Montagem inicial", "montagem", "14:00", "16:00"],
      ["Decoração finalizada", "decoracao", "17:00", "18:00"],
      ["Teste de som, luz e telão", "infraestrutura", "18:00", "18:30"],
      ["Chegada da equipe e alinhamento", "equipe", "19:00", "19:30"],
      ["Recepção dos convidados", "recepcao", "20:00", "21:00"],
      ["Entrada da debutante", "cerimonial", "21:15", "21:30"],
      ["Valsa", "cerimonial", "21:30", "21:45"],
      ["Homenagens", "cerimonial", "21:45", "22:10"],
      ["Jantar", "buffet", "22:15", "23:00"],
      ["Abertura da pista", "musica", "23:00", "23:15"],
      ["Parabéns", "cerimonial", "00:00", "00:20"],
      ["Balada", "musica", "00:20", "02:00"],
      ["Encerramento", "cerimonial", "02:00", "02:15"],
    ],
  },
  {
    value: "casamento",
    label: "Casamento",
    items: [
      ["Montagem inicial", "montagem", "10:00", "12:00"],
      ["Decoração finalizada", "decoracao", "14:00", "15:00"],
      ["Teste de som e iluminação", "infraestrutura", "15:00", "15:30"],
      ["Chegada da equipe", "equipe", "15:30", "16:00"],
      ["Recepção dos convidados", "recepcao", "16:30", "17:00"],
      ["Cerimônia", "cerimonial", "17:00", "18:00"],
      ["Fotos oficiais", "foto_video", "18:00", "18:40"],
      ["Entrada dos noivos", "cerimonial", "19:00", "19:15"],
      ["Jantar", "buffet", "20:00", "21:00"],
      ["Brinde / discurso", "cerimonial", "21:10", "21:30"],
      ["Abertura da pista", "musica", "21:40", "22:00"],
      ["Bolo / doces", "buffet", "23:00", "23:20"],
      ["Encerramento", "cerimonial", "01:00", "01:15"],
    ],
  },
  {
    value: "corporativo",
    label: "Corporativo",
    items: [
      ["Montagem inicial", "montagem", "08:00", "09:00"],
      ["Credenciamento pronto", "recepcao", "09:00", "09:30"],
      ["Teste de áudio, vídeo e internet", "infraestrutura", "09:30", "10:00"],
      ["Recepção dos participantes", "recepcao", "10:00", "10:30"],
      ["Abertura oficial", "cerimonial", "10:30", "10:45"],
      ["Palestra / apresentação", "cerimonial", "10:45", "12:00"],
      ["Coffee break", "buffet", "12:00", "12:30"],
      ["Networking / ativações", "comunicacao", "12:30", "13:30"],
      ["Encerramento", "cerimonial", "14:00", "14:15"],
      ["Desmontagem", "desmontagem", "14:30", "15:30"],
    ],
  },
  {
    value: "show_festa",
    label: "Show / festa",
    items: [
      ["Montagem de palco e estrutura", "montagem", "10:00", "12:00"],
      ["Passagem de som", "musica", "15:00", "16:00"],
      ["Alinhamento de segurança", "seguranca", "17:00", "17:30"],
      ["Abertura de portas", "recepcao", "18:00", "18:30"],
      ["DJ / abertura", "musica", "19:00", "20:00"],
      ["Atração principal", "musica", "21:00", "22:30"],
      ["Encerramento musical", "musica", "23:30", "00:00"],
      ["Saída do público", "seguranca", "00:00", "00:30"],
      ["Desmontagem", "desmontagem", "00:30", "02:00"],
    ],
  },
];

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 24,
  boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
};

export default function OrganizacaoPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [producao, setProducao] = useState<AcaoProducao[]>([]);
  const [checklist, setChecklist] = useState<Checklist[]>([]);
  const [fornecedoresEvento, setFornecedoresEvento] = useState<
    FornecedorEvento[]
  >([]);
  const [contratacoes, setContratacoes] = useState<Contratacao[]>([]);
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [aba, setAba] = useState<AbaOrganizacao>("visao");
  const [subPlanejamento, setSubPlanejamento] =
    useState<SubPlanejamento>("producao");
  const [visualizacaoProducao, setVisualizacaoProducao] = useState<
    "quadro" | "acoes" | "calendario" | "cronograma"
  >("quadro");
  const [subExecucao, setSubExecucao] = useState<SubExecucao>("roteiro");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novaAcao, setNovaAcao] = useState({
    titulo: "",
    categoria: "decoracao",
    responsavel_nome: "",
    data_limite: "",
    prioridade: "media",
    fornecedor_id: "",
    descricao: "",
  });
  const [quickAddAberto, setQuickAddAberto] = useState<Record<string, boolean>>({});

  const [novaAcaoRapida, setNovaAcaoRapida] = useState<
    Record<string, { titulo: string; categoria: string }>
  >({});
  const [acaoAberta, setAcaoAberta] = useState<AcaoProducao | null>(null);
  const [acaoArrastadaId, setAcaoArrastadaId] = useState<string | null>(null);
  const [novoChecklistCartao, setNovoChecklistCartao] = useState<Record<string, string>>({});
  const [novoChecklistRoteiro, setNovoChecklistRoteiro] = useState<Record<string, string>>({});
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: "",
    categoria: "buffet",
    telefone: "",
    email: "",
    responsavel_nome: "",
    valor_orcado: "",
    valor_fechado: "",
    status: "orcamento",
  });
  const [novaContratacao, setNovaContratacao] = useState({
    titulo: "",
    fornecedor_evento_id: "",
    valor_contratado: "",
    valor_entrada: "",
    valor_pago: "",
    parcelas: "1",
    data_vencimento: "",
    status: "pendente",
  });
  const [novoEquipe, setNovoEquipe] = useState({
    nome: "",
    funcao: "",
    telefone: "",
    email: "",
    horario_inicio: "",
    horario_fim: "",
    contato_principal: false,
  });
  const [novoChecklist, setNovoChecklist] = useState({
    item: "",
    categoria: "geral",
    tipo: "dia_evento",
    responsavel_nome: "",
    obrigatorio: false,
  });
  const [novoAgenda, setNovoAgenda] = useState({
    titulo: "",
    categoria: "cerimonial",
    data_inicio: "",
    data_fim: "",
    responsavel: "",
    descricao: "",
  });
  const [agendaEditando, setAgendaEditando] = useState<AgendaItem | null>(null);
  const [formAgendaEditando, setFormAgendaEditando] = useState({
    titulo: "",
    categoria: "cerimonial",
    data_inicio: "",
    data_fim: "",
    responsavel: "",
    descricao: "",
    status: "pendente",
  });
  const [modeloRoteiroPadrao, setModeloRoteiroPadrao] = useState("quinze_anos");


  const checklistPorAgenda = useMemo(() => {
    return checklist.reduce<Record<string, Checklist[]>>((acc, item) => {
      const agendaItemId = item.agenda_item_id ? String(item.agenda_item_id) : "";
      if (!agendaItemId) return acc;
      if (!acc[agendaItemId]) acc[agendaItemId] = [];
      acc[agendaItemId].push(item);
      return acc;
    }, {});
  }, [checklist]);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo(eventoPreferencialId?: string) {
    setLoading(true);
    setErro(null);

    const evento = await carregarEventos(eventoPreferencialId);
    if (evento) await carregarOrganizacao(evento);

    setLoading(false);
  }

  async function carregarEventos(
    eventoPreferencialId?: string,
  ): Promise<Evento | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Usuário não autenticado.");
      setEventos([]);
      setEventoAtual(null);
      return null;
    }

    let tenantId: string | null = null;
    const { data: membro } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .in("status", ["ativo", "active", "aprovado"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    tenantId = membro?.tenant_id || null;

    let query = supabase
      .from("eventos")
      .select(
        "id, nome, tenant_id, data_evento, data_inicio, hora_inicio, local, nome_local, status, created_at",
      )
      .order("created_at", { ascending: false });

    if (tenantId) query = query.eq("tenant_id", tenantId);

    const { data, error } = await query;

    if (error) {
      setErro("Erro ao carregar eventos: " + error.message);
      setEventos([]);
      setEventoAtual(null);
      return null;
    }

    const lista = (data || []) as Evento[];
    setEventos(lista);

    const escolhido =
      lista.find((evento) => evento.id === eventoPreferencialId) ||
      lista[0] ||
      null;
    setEventoAtual(escolhido);
    return escolhido;
  }

  async function carregarOrganizacao(evento: Evento) {
    const eventoId = evento.id;

    const [
      producaoRes,
      checklistRes,
      fornecedoresEventoRes,
      contratacoesRes,
      equipeRes,
      agendaRes,
    ] = await Promise.all([
      supabase
        .from("organizacao_producao")
        .select("*")
        .eq("evento_id", eventoId)
        .order("data_limite", { ascending: true, nullsFirst: false }),
      supabase
        .from("organizacao_checklist")
        .select("*")
        .eq("evento_id", eventoId)
        .order("ordem", { ascending: true }),
      supabase
        .from("organizacao_fornecedores_evento")
        .select("*")
        .eq("evento_id", eventoId)
        .order("criado_em", { ascending: false }),
      supabase
        .from("organizacao_contratacoes")
        .select("*")
        .eq("evento_id", eventoId)
        .order("data_vencimento", { ascending: true, nullsFirst: false }),
      supabase
        .from("organizacao_equipe")
        .select("*")
        .eq("evento_id", eventoId)
        .order("contato_principal", { ascending: false }),
      supabase
        .from("event_agenda_items")
        .select(
          "id, evento_id, tenant_id, titulo, descricao, categoria, data_inicio, data_fim, status, responsavel, cor",
        )
        .eq("evento_id", eventoId)
        .order("data_inicio", { ascending: true, nullsFirst: false }),
    ]);

    if (producaoRes.error)
      setErro(
        "Erro ao carregar ações da produção: " + producaoRes.error.message,
      );
    if (checklistRes.error)
      setErro("Erro ao carregar checklist: " + checklistRes.error.message);
    if (fornecedoresEventoRes.error)
      setErro(
        "Erro ao carregar fornecedores do evento: " +
          fornecedoresEventoRes.error.message,
      );
    if (contratacoesRes.error)
      setErro(
        "Erro ao carregar contratações: " + contratacoesRes.error.message,
      );
    if (equipeRes.error)
      setErro("Erro ao carregar equipe: " + equipeRes.error.message);
    if (agendaRes.error)
      setErro("Erro ao carregar roteiro: " + agendaRes.error.message);

    const vinculos = (fornecedoresEventoRes.data || []) as FornecedorEvento[];
    const fornecedorIds = Array.from(
      new Set(vinculos.map((v) => v.fornecedor_id).filter(Boolean)),
    );
    let fornecedoresPorId: Record<string, Fornecedor> = {};

    if (fornecedorIds.length > 0) {
      const { data: fornecedoresData } = await supabase
        .from("organizacao_fornecedores")
        .select("*")
        .in("id", fornecedorIds);

      fornecedoresPorId = Object.fromEntries(
        ((fornecedoresData || []) as Fornecedor[]).map((fornecedor) => [
          fornecedor.id,
          fornecedor,
        ]),
      );
    }

    setProducao((producaoRes.data || []) as AcaoProducao[]);
    setChecklist((checklistRes.data || []) as Checklist[]);
    setFornecedoresEvento(
      vinculos.map((vinculo) => ({
        ...vinculo,
        fornecedor: fornecedoresPorId[vinculo.fornecedor_id] || null,
      })),
    );
    setContratacoes((contratacoesRes.data || []) as Contratacao[]);
    setEquipe((equipeRes.data || []) as Equipe[]);
    setAgenda((agendaRes.data || []) as AgendaItem[]);
  }

  const tenantId = eventoAtual?.tenant_id || "";

  const metricas = useMemo(() => {
    const acoesConcluidas = producao.filter(
      (a) => a.status === "concluido",
    ).length;
    const acoesAtrasadas = producao.filter((a) =>
      isAtrasada(a.data_limite, a.status),
    ).length;
    const checklistConcluido = checklist.filter((c) => c.concluido).length;
    const fornecedoresContratados = fornecedoresEvento.filter((f) =>
      ["contratado", "confirmado"].includes(f.status),
    ).length;
    const valorContratado = contratacoes.reduce(
      (total, item) => total + toNumber(item.valor_contratado),
      0,
    );
    const valorPago = contratacoes.reduce(
      (total, item) => total + toNumber(item.valor_pago),
      0,
    );
    const pendenciasFinanceiras = contratacoes.filter((item) =>
      ["pendente", "parcial", "vencido"].includes(item.status),
    ).length;

    const base =
      producao.length +
      checklist.length +
      fornecedoresEvento.length +
      contratacoes.length +
      equipe.length +
      agenda.length;
    const concluidos =
      acoesConcluidas +
      checklistConcluido +
      fornecedoresContratados +
      contratacoes.filter((c) => c.status === "pago").length +
      equipe.filter((e) => ["confirmado", "presente"].includes(e.status))
        .length +
      agenda.filter((a) => a.status === "concluido").length;

    return {
      acoesTotal: producao.length,
      acoesConcluidas,
      acoesAtrasadas,
      checklistTotal: checklist.length,
      checklistConcluido,
      fornecedoresTotal: fornecedoresEvento.length,
      fornecedoresContratados,
      contratacoesTotal: contratacoes.length,
      valorContratado,
      valorPago,
      saldoPendente: valorContratado - valorPago,
      pendenciasFinanceiras,
      equipeTotal: equipe.length,
      roteiroTotal: agenda.length,
      progresso: base > 0 ? Math.round((concluidos / base) * 100) : 0,
      diasRestantes: calcularDiasRestantes(eventoAtual),
    };
  }, [
    producao,
    checklist,
    fornecedoresEvento,
    contratacoes,
    equipe,
    agenda,
    eventoAtual,
  ]);

  const pendencias = useMemo(() => {
    const itens: {
      titulo: string;
      detalhe: string;
      tipo: string;
      criticidade: "alta" | "media" | "baixa";
    }[] = [];

    producao.forEach((a) => {
      if (isAtrasada(a.data_limite, a.status))
        itens.push({
          titulo: a.titulo,
          detalhe: "Ação com prazo vencido",
          tipo: "Produção",
          criticidade: "alta",
        });
    });

    contratacoes.forEach((c) => {
      if (c.status === "vencido")
        itens.push({
          titulo: c.titulo,
          detalhe: "Pagamento vencido",
          tipo: "Financeiro",
          criticidade: "alta",
        });
      else if (["pendente", "parcial"].includes(c.status))
        itens.push({
          titulo: c.titulo,
          detalhe: "Pagamento ainda pendente",
          tipo: "Financeiro",
          criticidade: "media",
        });
    });

    fornecedoresEvento.forEach((f) => {
      if (["orcamento", "negociando"].includes(f.status))
        itens.push({
          titulo: f.fornecedor?.nome || "Fornecedor",
          detalhe: "Fornecedor ainda não contratado",
          tipo: "Fornecedor",
          criticidade: "media",
        });
    });

    checklist
      .filter((c) => c.obrigatorio && !c.concluido)
      .forEach((c) => {
        itens.push({
          titulo: c.item,
          detalhe: "Checklist obrigatório pendente",
          tipo: "Checklist",
          criticidade: "media",
        });
      });

    return itens;
  }, [producao, contratacoes, fornecedoresEvento, checklist]);

  const termoBusca = busca.trim().toLowerCase();
  const producaoFiltrada = filtrar<AcaoProducao>(producao, termoBusca, (a) => [
    a.titulo,
    a.responsavel_nome,
    a.status,
    a.prioridade,
    a.categoria,
    a.descricao,
  ]);
  const fornecedoresFiltrados = filtrar<FornecedorEvento>(
    fornecedoresEvento,
    termoBusca,
    (f) => [
      f.fornecedor?.nome,
      f.fornecedor?.telefone,
      f.fornecedor?.email,
      f.status,
      f.fornecedor?.categoria,
    ],
  );
  const contratacoesFiltradas = filtrar<Contratacao>(
    contratacoes,
    termoBusca,
    (c) => [c.titulo, c.status, c.forma_pagamento],
  );
  const equipeFiltrada = filtrar<Equipe>(equipe, termoBusca, (e) => [
    e.nome,
    e.funcao,
    e.telefone,
    e.status,
  ]);
  const checklistFiltrado = filtrar<Checklist>(checklist, termoBusca, (c) => [
    c.item,
    c.categoria,
    c.tipo,
    c.responsavel_nome,
  ]);
  const agendaFiltrada = filtrar<AgendaItem>(agenda, termoBusca, (a) => [
    a.titulo,
    a.categoria,
    a.responsavel,
    a.status,
  ]);

  async function trocarEvento(eventoId: string) {
    const evento = eventos.find((item) => item.id === eventoId) || null;
    setEventoAtual(evento);
    if (evento) {
      setLoading(true);
      await carregarOrganizacao(evento);
      setLoading(false);
    }
  }

  async function criarAcao() {
    if (!eventoAtual || !tenantId || !novaAcao.titulo.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("organizacao_producao").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      titulo: novaAcao.titulo.trim(),
      descricao: limpar(novaAcao.descricao),
      categoria: novaAcao.categoria,
      responsavel_nome: limpar(novaAcao.responsavel_nome),
      data_limite: novaAcao.data_limite || null,
      prioridade: novaAcao.prioridade,
      fornecedor_id: novaAcao.fornecedor_id || null,
      status: "a_fazer",
    });
    await depoisSalvar(error, () =>
      setNovaAcao({
        titulo: "",
        categoria: "decoracao",
        responsavel_nome: "",
        data_limite: "",
        prioridade: "media",
        fornecedor_id: "",
        descricao: "",
      }),
    );
  }

  async function criarAcaoRapida(status: string) {
    if (!eventoAtual || !tenantId) return;
    const atual = novaAcaoRapida[status] || { titulo: "", categoria: "outros" };
    const titulo = atual.titulo.trim();
    if (!titulo) return;

    setSalvando(true);
    const { error } = await supabase.from("organizacao_producao").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      titulo,
      descricao: null,
      categoria: atual.categoria || "outros",
      responsavel_nome: null,
      data_limite: null,
      prioridade: "media",
      fornecedor_id: null,
      status,
    });

    await depoisSalvar(error, () =>
      setNovaAcaoRapida((prev) => ({
        ...prev,
        [status]: { titulo: "", categoria: atual.categoria || "outros" },
      })),
    );
  }

  async function atualizarAcaoCampo(
    acao: AcaoProducao,
    campo:
      | "status"
      | "categoria"
      | "prioridade"
      | "titulo"
      | "descricao"
      | "responsavel_nome"
      | "data_limite"
      | "fornecedor_id"
      | "observacoes",
    valor: string | null,
  ) {
    const valorTratado =
      valor === null || String(valor).trim() === "" ? null : String(valor).trim();

    const payload: Record<string, string | null> = { [campo]: valorTratado };

    if (campo === "status") {
      payload.status = valorTratado || "a_fazer";
      payload.concluido_em =
        valorTratado === "concluido" ? new Date().toISOString() : null;
    }

    const patch = { ...payload } as Partial<AcaoProducao>;
    setProducao((prev) =>
      prev.map((item) => (item.id === acao.id ? { ...item, ...patch } : item)),
    );
    setAcaoAberta((prev) =>
      prev && prev.id === acao.id ? ({ ...prev, ...patch } as AcaoProducao) : prev,
    );

    const { error } = await supabase
      .from("organizacao_producao")
      .update(payload)
      .eq("id", acao.id);

    if (error) {
      setErro(error.message || "Erro ao salvar ação.");
      if (eventoAtual) await carregarOrganizacao(eventoAtual);
    }
  }

  async function alterarStatusAcao(acao: AcaoProducao, status: string) {
    const concluido_em = status === "concluido" ? new Date().toISOString() : null;
    setProducao((prev) =>
      prev.map((item) =>
        item.id === acao.id ? { ...item, status, concluido_em } : item,
      ),
    );
    setAcaoAberta((prev) =>
      prev && prev.id === acao.id ? { ...prev, status, concluido_em } : prev,
    );

    const { error } = await supabase
      .from("organizacao_producao")
      .update({ status, concluido_em })
      .eq("id", acao.id);

    if (error) {
      setErro(error.message || "Erro ao alterar status.");
      if (eventoAtual) await carregarOrganizacao(eventoAtual);
    }
  }

  function encontrarAcaoPorId(id: string | null) {
    if (!id) return null;
    return producao.find((acao) => acao.id === id) || null;
  }

  async function moverAcaoParaColuna(acao: AcaoProducao, status: string) {
    const statusNormalizado = normalizarStatusProducao(status);
    const statusAtual = normalizarStatusProducao(acao.status);

    if (!statusNormalizado || statusAtual === statusNormalizado) {
      setAcaoArrastadaId(null);
      return;
    }

    setProducao((prev) =>
      prev.map((item) =>
        item.id === acao.id
          ? {
              ...item,
              status: statusNormalizado,
              concluido_em:
                statusNormalizado === "concluido"
                  ? new Date().toISOString()
                  : null,
            }
          : item,
      ),
    );

    const { error } = await supabase
      .from("organizacao_producao")
      .update({
        status: statusNormalizado,
        concluido_em:
          statusNormalizado === "concluido" ? new Date().toISOString() : null,
      })
      .eq("id", acao.id);

    setAcaoArrastadaId(null);

    if (error) {
      setErro(error.message || "Erro ao mover a ação.");
      if (eventoAtual) await carregarOrganizacao(eventoAtual);
    }
  }

  function abrirEdicaoData(acao: AcaoProducao) {
    const input = document.getElementById(`org-card-date-${acao.id}`) as HTMLInputElement | null;
    input?.focus();
    (input as any)?.showPicker?.();
  }


  function abrirEdicaoEtiqueta(acao: AcaoProducao) {
    const categorias = CATEGORIAS_PRODUCAO.map((c) => `${c.value} = ${c.label}`).join("\n");
    const categoria = window.prompt(
      `Escolha a etiqueta/categoria:

${categorias}`,
      acao.categoria || "outros",
    );
    if (categoria === null) return;

    const categoriaLimpa = categoria.trim();
    const categoriaValida = CATEGORIAS_PRODUCAO.some(
      (item) => item.value === categoriaLimpa,
    );

    if (!categoriaValida) {
      setErro("Categoria inválida. Use uma das opções listadas.");
      return;
    }

    atualizarAcaoCampo(acao, "categoria", categoriaLimpa);
  }

  function abrirEdicaoMembro(acao: AcaoProducao) {
    const responsavel = window.prompt(
      "Defina o responsável por esta ação",
      acao.responsavel_nome || "",
    );
    if (responsavel === null) return;
    atualizarAcaoCampo(acao, "responsavel_nome", responsavel);
  }

  function abrirVinculoFornecedor(acao: AcaoProducao) {
    const fornecedores = fornecedoresEvento
      .map((item) => `${item.fornecedor_id} = ${item.fornecedor?.nome || "Fornecedor"}`)
      .join("\n");
    const fornecedor = window.prompt(
      `Informe o ID do fornecedor para vincular ou deixe vazio para remover:

${fornecedores || "Nenhum fornecedor cadastrado."}`,
      acao.fornecedor_id || "",
    );
    if (fornecedor === null) return;
    atualizarAcaoCampo(acao, "fornecedor_id", fornecedor || null);
  }

  function abrirEdicaoDescricao(acao: AcaoProducao) {
    const descricao = window.prompt(
      "Descrição da ação",
      acao.descricao || acao.observacoes || "",
    );
    if (descricao === null) return;
    atualizarAcaoCampo(acao, "descricao", descricao);
  }

  async function editarAcao(acao: AcaoProducao) {
    const titulo = window.prompt("Alterar título da ação", acao.titulo);
    if (titulo === null) return;

    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErro("O título da ação não pode ficar vazio.");
      return;
    }

    const responsavel = window.prompt(
      "Alterar responsável",
      acao.responsavel_nome || "",
    );
    if (responsavel === null) return;

    const prazo = window.prompt(
      "Alterar prazo no formato AAAA-MM-DD",
      acao.data_limite ? acao.data_limite.slice(0, 10) : "",
    );
    if (prazo === null) return;

    const { error } = await supabase
      .from("organizacao_producao")
      .update({
        titulo: tituloLimpo,
        responsavel_nome: limpar(responsavel),
        data_limite: prazo.trim() || null,
      })
      .eq("id", acao.id);

    await depoisSalvar(error);
  }

  async function excluirAcao(acao: AcaoProducao) {
    const confirmar = window.confirm(`Excluir a ação "${acao.titulo}"?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("organizacao_producao")
      .delete()
      .eq("id", acao.id);
    await depoisSalvar(error);
  }

  async function criarFornecedor() {
    if (!eventoAtual || !tenantId || !novoFornecedor.nome.trim()) return;
    setSalvando(true);

    const { data: fornecedor, error: fornecedorError } = await supabase
      .from("organizacao_fornecedores")
      .insert({
        tenant_id: tenantId,
        nome: novoFornecedor.nome.trim(),
        categoria: novoFornecedor.categoria,
        telefone: limpar(novoFornecedor.telefone),
        telefone_normalizado: normalizarTelefone(novoFornecedor.telefone),
        email: limpar(novoFornecedor.email),
        responsavel_nome: limpar(novoFornecedor.responsavel_nome),
      })
      .select("id")
      .single();

    if (fornecedorError || !fornecedor?.id) {
      await depoisSalvar(
        fornecedorError || new Error("Fornecedor não criado."),
      );
      return;
    }

    const { error } = await supabase
      .from("organizacao_fornecedores_evento")
      .insert({
        tenant_id: tenantId,
        evento_id: eventoAtual.id,
        fornecedor_id: fornecedor.id,
        categoria_evento: novoFornecedor.categoria,
        status: novoFornecedor.status,
        valor_orcado: valorOuNull(novoFornecedor.valor_orcado),
        valor_fechado: valorOuNull(novoFornecedor.valor_fechado),
      });

    await depoisSalvar(error, () =>
      setNovoFornecedor({
        nome: "",
        categoria: "buffet",
        telefone: "",
        email: "",
        responsavel_nome: "",
        valor_orcado: "",
        valor_fechado: "",
        status: "orcamento",
      }),
    );
  }

  async function atualizarStatusFornecedor(
    item: FornecedorEvento,
    status: string,
  ) {
    const { error } = await supabase
      .from("organizacao_fornecedores_evento")
      .update({ status })
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function editarFornecedor(item: FornecedorEvento) {
    const fornecedor = item.fornecedor;
    const nome = window.prompt(
      "Alterar nome do fornecedor",
      fornecedor?.nome || "",
    );
    if (nome === null) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("O nome do fornecedor não pode ficar vazio.");
      return;
    }

    const telefone = window.prompt(
      "Alterar telefone",
      fornecedor?.telefone || "",
    );
    if (telefone === null) return;

    const email = window.prompt("Alterar e-mail", fornecedor?.email || "");
    if (email === null) return;

    const valor = window.prompt(
      "Alterar valor fechado",
      item.valor_fechado ? String(item.valor_fechado) : "",
    );
    if (valor === null) return;

    setSalvando(true);

    const { error: fornecedorError } = await supabase
      .from("organizacao_fornecedores")
      .update({
        nome: nomeLimpo,
        telefone: limpar(telefone),
        telefone_normalizado: normalizarTelefone(telefone),
        email: limpar(email),
      })
      .eq("id", item.fornecedor_id);

    if (fornecedorError) {
      await depoisSalvar(fornecedorError);
      return;
    }

    const { error } = await supabase
      .from("organizacao_fornecedores_evento")
      .update({ valor_fechado: valorOuNull(valor) })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function abrirContratoFornecedor(item: FornecedorEvento) {
    const contratacaoExistente = contratacoes.find(
      (contratacao) => contratacao.fornecedor_evento_id === item.id,
    );

    if (contratacaoExistente) {
      setAba("contratacoes");
      return;
    }

    const confirmar = window.confirm(
      `Criar uma contratação para "${item.fornecedor?.nome || "Fornecedor"}"?`,
    );
    if (!confirmar || !eventoAtual || !tenantId) return;

    setSalvando(true);
    const { error } = await supabase.from("organizacao_contratacoes").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      fornecedor_evento_id: item.id,
      titulo: `Contrato - ${item.fornecedor?.nome || "Fornecedor"}`,
      valor_contratado: valorOuZero(
        item.valor_fechado || item.valor_orcado || 0,
      ),
      valor_entrada: 0,
      valor_pago: 0,
      parcelas: 1,
      status: "pendente",
    });

    await depoisSalvar(error);
    if (!error) {
      setAba("contratacoes");
    }
  }

  async function abrirPagamentoFornecedor(item: FornecedorEvento) {
    const contratacaoExistente = contratacoes.find(
      (contratacao) => contratacao.fornecedor_evento_id === item.id,
    );

    if (contratacaoExistente) {
      setAba("contratacoes");
      return;
    }

    await abrirContratoFornecedor(item);
  }

  async function excluirFornecedor(item: FornecedorEvento) {
    const confirmar = window.confirm(
      `Remover "${item.fornecedor?.nome || "Fornecedor"}" deste evento?`,
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("organizacao_fornecedores_evento")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function criarContratacao() {
    if (!eventoAtual || !tenantId || !novaContratacao.titulo.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("organizacao_contratacoes").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      fornecedor_evento_id: novaContratacao.fornecedor_evento_id || null,
      titulo: novaContratacao.titulo.trim(),
      valor_contratado: valorOuZero(novaContratacao.valor_contratado),
      valor_entrada: valorOuZero(novaContratacao.valor_entrada),
      valor_pago: valorOuZero(novaContratacao.valor_pago),
      parcelas: Number(novaContratacao.parcelas || 1),
      data_vencimento: novaContratacao.data_vencimento || null,
      status: novaContratacao.status,
    });
    await depoisSalvar(error, () =>
      setNovaContratacao({
        titulo: "",
        fornecedor_evento_id: "",
        valor_contratado: "",
        valor_entrada: "",
        valor_pago: "",
        parcelas: "1",
        data_vencimento: "",
        status: "pendente",
      }),
    );
  }

  async function editarContratacao(item: Contratacao) {
    const titulo = window.prompt("Alterar título da contratação", item.titulo);
    if (titulo === null) return;

    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErro("O título da contratação não pode ficar vazio.");
      return;
    }

    const valorContratado = window.prompt(
      "Alterar valor contratado",
      String(item.valor_contratado || ""),
    );
    if (valorContratado === null) return;

    const valorPago = window.prompt(
      "Alterar valor pago",
      String(item.valor_pago || ""),
    );
    if (valorPago === null) return;

    const vencimento = window.prompt(
      "Alterar vencimento no formato AAAA-MM-DD",
      item.data_vencimento || "",
    );
    if (vencimento === null) return;

    const valorContratadoNumero = valorOuZero(valorContratado);
    const valorPagoNumero = valorOuZero(valorPago);
    const status =
      valorPagoNumero >= valorContratadoNumero && valorContratadoNumero > 0
        ? "pago"
        : valorPagoNumero > 0
          ? "parcial"
          : item.status;

    const { error } = await supabase
      .from("organizacao_contratacoes")
      .update({
        titulo: tituloLimpo,
        valor_contratado: valorContratadoNumero,
        valor_pago: valorPagoNumero,
        data_vencimento: vencimento.trim() || null,
        status,
        data_pagamento:
          status === "pago"
            ? new Date().toISOString().slice(0, 10)
            : item.data_pagamento,
      })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function marcarContratacaoPaga(item: Contratacao) {
    const confirmar = window.confirm(`Marcar "${item.titulo}" como pago?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("organizacao_contratacoes")
      .update({
        valor_pago: valorOuZero(item.valor_contratado),
        status: "pago",
        data_pagamento: new Date().toISOString().slice(0, 10),
      })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function anexarComprovanteContratacao(item: Contratacao) {
    const comprovanteUrl = window.prompt(
      "Informe a URL do comprovante",
      item.comprovante_url || "",
    );
    if (comprovanteUrl === null) return;

    const { error } = await supabase
      .from("organizacao_contratacoes")
      .update({ comprovante_url: limpar(comprovanteUrl) })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function excluirContratacao(item: Contratacao) {
    const confirmar = window.confirm(`Excluir a contratação "${item.titulo}"?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("organizacao_contratacoes")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function criarEquipe() {
    if (
      !eventoAtual ||
      !tenantId ||
      !novoEquipe.nome.trim() ||
      !novoEquipe.funcao.trim()
    )
      return;
    setSalvando(true);
    const { error } = await supabase.from("organizacao_equipe").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      nome: novoEquipe.nome.trim(),
      funcao: novoEquipe.funcao.trim(),
      telefone: limpar(novoEquipe.telefone),
      email: limpar(novoEquipe.email),
      horario_inicio: datetimeOuNull(novoEquipe.horario_inicio),
      horario_fim: datetimeOuNull(novoEquipe.horario_fim),
      contato_principal: novoEquipe.contato_principal,
      status: "confirmado",
    });
    await depoisSalvar(error, () =>
      setNovoEquipe({
        nome: "",
        funcao: "",
        telefone: "",
        email: "",
        horario_inicio: "",
        horario_fim: "",
        contato_principal: false,
      }),
    );
  }

  async function editarEquipe(item: Equipe) {
    const nome = window.prompt("Alterar nome", item.nome);
    if (nome === null) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("O nome da equipe não pode ficar vazio.");
      return;
    }

    const funcao = window.prompt("Alterar função", item.funcao);
    if (funcao === null) return;

    const telefone = window.prompt("Alterar telefone", item.telefone || "");
    if (telefone === null) return;

    const { error } = await supabase
      .from("organizacao_equipe")
      .update({
        nome: nomeLimpo,
        funcao: funcao.trim() || item.funcao,
        telefone: limpar(telefone),
      })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function atualizarStatusEquipe(item: Equipe, status: string) {
    const { error } = await supabase
      .from("organizacao_equipe")
      .update({ status })
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function excluirEquipe(item: Equipe) {
    const confirmar = window.confirm(`Excluir "${item.nome}" da equipe?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("organizacao_equipe")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function criarChecklistCartao(acao: AcaoProducao) {
    if (!eventoAtual || !tenantId) return;

    const item = (novoChecklistCartao[acao.id] || "").trim();
    if (!item) return;

    setSalvando(true);
    const { error } = await supabase.from("organizacao_checklist").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      item,
      categoria: "producao",
      tipo: "planejamento",
      descricao: `acao:${acao.id}`,
      responsavel_nome: limpar(acao.responsavel_nome),
      obrigatorio: false,
      concluido: false,
      ordem: checklist.length + 1,
    });

    await depoisSalvar(error, () =>
      setNovoChecklistCartao((prev) => ({ ...prev, [acao.id]: "" })),
    );
  }

  async function criarChecklist() {
    if (!eventoAtual || !tenantId || !novoChecklist.item.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("organizacao_checklist").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      item: novoChecklist.item.trim(),
      categoria: novoChecklist.categoria || "geral",
      tipo: novoChecklist.tipo,
      responsavel_nome: limpar(novoChecklist.responsavel_nome),
      obrigatorio: novoChecklist.obrigatorio,
      ordem: checklist.length + 1,
    });
    await depoisSalvar(error, () =>
      setNovoChecklist({
        item: "",
        categoria: "geral",
        tipo: "dia_evento",
        responsavel_nome: "",
        obrigatorio: false,
      }),
    );
  }

  async function alternarChecklist(item: Checklist) {
    const concluido = !item.concluido;
    const { error } = await supabase
      .from("organizacao_checklist")
      .update({
        concluido,
        concluido_em: concluido ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function usarChecklistPadrao() {
    if (!eventoAtual || !tenantId) return;

    const itensExistentes = new Set(
      checklist.map((item) => item.item.trim().toLowerCase()),
    );
    const itensParaInserir = CHECKLIST_PADRAO_DIA.filter(
      (item) => !itensExistentes.has(item.item.trim().toLowerCase()),
    ).map((item, index) => ({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      item: item.item,
      categoria: item.categoria,
      tipo: item.tipo,
      obrigatorio: item.obrigatorio,
      ordem: checklist.length + index + 1,
    }));

    if (itensParaInserir.length === 0) {
      setErro("O checklist padrão já foi aplicado neste evento.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("organizacao_checklist")
      .insert(itensParaInserir);
    await depoisSalvar(error);
  }

  async function alterarChecklist(item: Checklist) {
    const novoItem = window.prompt("Alterar item do checklist", item.item);
    if (novoItem === null) return;

    const itemLimpo = novoItem.trim();
    if (!itemLimpo) {
      setErro("O item do checklist não pode ficar vazio.");
      return;
    }

    const novaCategoria = window.prompt(
      "Alterar categoria",
      item.categoria || "geral",
    );
    if (novaCategoria === null) return;

    const { error } = await supabase
      .from("organizacao_checklist")
      .update({
        item: itemLimpo,
        categoria: novaCategoria.trim() || "geral",
      })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function excluirChecklist(item: Checklist) {
    const confirmar = window.confirm(
      `Excluir o item "${item.item}" do checklist?`,
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("organizacao_checklist")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function criarAgenda() {
    if (!eventoAtual || !novoAgenda.titulo.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("event_agenda_items").insert({
      tenant_id: tenantId || null,
      evento_id: eventoAtual.id,
      titulo: novoAgenda.titulo.trim(),
      categoria: limpar(novoAgenda.categoria) || "cerimonial",
      data_inicio: datetimeOuNull(novoAgenda.data_inicio),
      data_fim: datetimeOuNull(novoAgenda.data_fim),
      responsavel: limpar(novoAgenda.responsavel),
      descricao: limpar(novoAgenda.descricao),
      status: "pendente",
    });
    await depoisSalvar(error, () =>
      setNovoAgenda({
        titulo: "",
        categoria: "cerimonial",
        data_inicio: "",
        data_fim: "",
        responsavel: "",
        descricao: "",
      }),
    );
  }

  async function usarRoteiroPadrao() {
    if (!eventoAtual) return;

    const modelo = ROTEIROS_PADRAO.find(
      (item) => item.value === modeloRoteiroPadrao,
    );

    if (!modelo) {
      setErro("Selecione um modelo de roteiro padrão.");
      return;
    }

    const confirmar = window.confirm(
      `Adicionar o roteiro padrão "${modelo.label}" ao evento?\n\nOs itens que já existirem pelo mesmo título não serão duplicados.`,
    );
    if (!confirmar) return;

    const titulosExistentes = new Set(
      agenda
        .map((item) => (item.titulo || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const itensParaInserir = modelo.items
      .filter(([titulo]) => !titulosExistentes.has(String(titulo).trim().toLowerCase()))
      .map(([titulo, categoria, inicio, fim], index) => ({
        tenant_id: tenantId || null,
        evento_id: eventoAtual.id,
        titulo: String(titulo),
        categoria: String(categoria),
        data_inicio: montarDataHoraDoEvento(eventoAtual, String(inicio)),
        data_fim: montarDataHoraDoEvento(eventoAtual, String(fim)),
        responsavel: null,
        descricao: `Criado pelo roteiro padrão: ${modelo.label}`,
        status: "pendente",
        cor: null,
      }));

    if (itensParaInserir.length === 0) {
      setErro("Este roteiro padrão já foi aplicado neste evento.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("event_agenda_items")
      .insert(itensParaInserir);

    await depoisSalvar(error);
  }

  function abrirEdicaoAgenda(item: AgendaItem) {
    setAgendaEditando(item);
    setFormAgendaEditando({
      titulo: item.titulo || "",
      categoria: item.categoria || "cerimonial",
      data_inicio: datetimeLocalInput(item.data_inicio),
      data_fim: datetimeLocalInput(item.data_fim),
      responsavel: item.responsavel || "",
      descricao: item.descricao || "",
      status: item.status || "pendente",
    });
  }

  function fecharEdicaoAgenda() {
    setAgendaEditando(null);
    setFormAgendaEditando({
      titulo: "",
      categoria: "cerimonial",
      data_inicio: "",
      data_fim: "",
      responsavel: "",
      descricao: "",
      status: "pendente",
    });
  }

  async function salvarAgendaEditada() {
    if (!agendaEditando) return;

    const titulo = formAgendaEditando.titulo.trim();
    if (!titulo) {
      setErro("O título do roteiro não pode ficar vazio.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("event_agenda_items")
      .update({
        titulo,
        categoria: limpar(formAgendaEditando.categoria) || "cerimonial",
        data_inicio: datetimeOuNull(formAgendaEditando.data_inicio),
        data_fim: datetimeOuNull(formAgendaEditando.data_fim),
        responsavel: limpar(formAgendaEditando.responsavel),
        descricao: limpar(formAgendaEditando.descricao),
        status: limpar(formAgendaEditando.status) || "pendente",
      })
      .eq("id", agendaEditando.id);

    await depoisSalvar(error, fecharEdicaoAgenda);
  }

  async function duplicarAgenda(item: AgendaItem) {
    if (!eventoAtual) return;

    setSalvando(true);
    const { error } = await supabase.from("event_agenda_items").insert({
      tenant_id: tenantId || item.tenant_id || null,
      evento_id: eventoAtual.id,
      titulo: `${String(item.titulo || "Item do roteiro")} - cópia`,
      categoria: item.categoria || "cerimonial",
      data_inicio: item.data_inicio,
      data_fim: item.data_fim,
      responsavel: item.responsavel,
      descricao: item.descricao,
      status: item.status || "pendente",
      cor: item.cor,
    });

    await depoisSalvar(error);
  }

  async function excluirAgenda(item: AgendaItem) {
    const confirmar = window.confirm(
      `Excluir "${String(item.titulo || "Item do roteiro")}" do roteiro?`,
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("event_agenda_items")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function depoisSalvar(
    error: { message?: string } | Error | null,
    limparFormulario?: () => void,
  ) {
    if (error) {
      setErro(error.message || "Erro ao salvar.");
      setSalvando(false);
      return;
    }

    limparFormulario?.();
    if (eventoAtual) await carregarOrganizacao(eventoAtual);
    setSalvando(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 24, fontWeight: 800 }}>
        Carregando Organização...
      </div>
    );
  }

  return (
    <div className="organizacao-page">
      <style>{styles}</style>

      <div className="org-header">
        <div>
          <div className="org-eyebrow">OmniStage</div>
          <h1>Organização</h1>
          <p>
            Planejamento, contratações, fornecedores e execução do evento em um
            só lugar.
          </p>
        </div>

        <div className="org-event-select">
          <label>Evento</label>
          <select
            value={eventoAtual?.id || ""}
            onChange={(e) => trocarEvento(e.target.value)}
          >
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nome || "Evento sem nome"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro ? <div className="org-alert">{erro}</div> : null}

      {!eventoAtual ? (
        <div className="org-empty">
          Nenhum evento encontrado para carregar a Organização.
        </div>
      ) : (
        <>
          <section className="org-summary-card">
            <div>
              <span className="org-badge">
                {eventoAtual.status || "Evento"}
              </span>
              <h2>{eventoAtual.nome || "Evento sem nome"}</h2>
              <p>
                {formatarDataEvento(eventoAtual)} ·{" "}
                {eventoAtual.nome_local ||
                  eventoAtual.local ||
                  "Local não informado"}
              </p>
            </div>
            <div className="org-progress-box">
              <strong>{metricas.progresso}%</strong>
              <span>progresso geral</span>
              <div className="org-progress">
                <i style={{ width: `${Math.min(metricas.progresso, 100)}%` }} />
              </div>
            </div>
          </section>

          <section className="org-metrics-grid">
            <Metric
              title="Dias restantes"
              value={metricas.diasRestantes ?? "--"}
              detail="até o evento"
            />
            <Metric
              title="Produção"
              value={`${metricas.acoesConcluidas}/${metricas.acoesTotal}`}
              detail={`${metricas.acoesAtrasadas} atrasadas`}
              danger={metricas.acoesAtrasadas > 0}
            />
            <Metric
              title="Fornecedores"
              value={`${metricas.fornecedoresContratados}/${metricas.fornecedoresTotal}`}
              detail="contratados/confirmados"
            />
            <Metric
              title="Financeiro"
              value={formatarMoeda(metricas.saldoPendente)}
              detail="saldo pendente"
              danger={metricas.saldoPendente > 0}
            />
            <Metric
              title="Equipe"
              value={metricas.equipeTotal}
              detail="pessoas na operação"
            />
            <Metric
              title="Roteiro"
              value={metricas.roteiroTotal}
              detail="itens na timeline"
            />
          </section>

          <div className="org-toolbar">
            <div className="org-tabs">
              <button
                className={aba === "visao" ? "active" : ""}
                onClick={() => setAba("visao")}
              >
                Visão Geral
              </button>
              <button
                className={aba === "equipe" ? "active" : ""}
                onClick={() => setAba("equipe")}
              >
                Equipe
              </button>
              <button
                className={aba === "contratacoes" ? "active" : ""}
                onClick={() => setAba("contratacoes")}
              >
                Contratações
              </button>
              <button
                className={aba === "producao" ? "active" : ""}
                onClick={() => setAba("producao")}
              >
                Produção
              </button>
              <button
                className={aba === "roteiro" ? "active" : ""}
                onClick={() => setAba("roteiro")}
              >
                Roteiro
              </button>
              <button
                className={aba === "pendencias" ? "active" : ""}
                onClick={() => setAba("pendencias")}
              >
                Pendências
              </button>
            </div>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar na organização..."
            />
          </div>

          {aba === "visao" && (
            <div className="org-grid-two">
              <Panel
                title="Próximas ações"
                subtitle="Ações e roteiro mais próximos"
              >
                {[
                  ...producaoFiltrada
                    .slice(0, 4)
                    .map((a) => ({
                      titulo: a.titulo,
                      detalhe: `${labelStatus(a.status)} · ${formatarData(a.data_limite)}`,
                      status: a.status,
                    })),
                  ...agendaFiltrada
                    .slice(0, 4)
                    .map((a) => ({
                      titulo: a.titulo || "Item do roteiro",
                      detalhe: `${a.categoria || "Roteiro"} · ${formatarDataHora(a.data_inicio)}`,
                      status: a.status || "pendente",
                    })),
                ]
                  .slice(0, 6)
                  .map((item, index) => (
                    <MiniRow
                      key={index}
                      title={item.titulo}
                      detail={item.detalhe}
                      status={item.status}
                    />
                  ))}
              </Panel>

              <Panel
                title="Pendências críticas"
                subtitle="Itens que exigem atenção"
              >
                {pendencias.length === 0 ? (
                  <Empty text="Nenhuma pendência crítica encontrada." />
                ) : (
                  pendencias
                    .slice(0, 6)
                    .map((item, index) => (
                      <MiniRow
                        key={index}
                        title={item.titulo}
                        detail={`${item.tipo} · ${item.detalhe}`}
                        status={item.criticidade}
                      />
                    ))
                )}
              </Panel>

              <Panel
                title="Financeiro do evento"
                subtitle="Contratado, pago e pendente"
              >
                <div className="org-money-grid">
                  <div>
                    <span>Contratado</span>
                    <strong>{formatarMoeda(metricas.valorContratado)}</strong>
                  </div>
                  <div>
                    <span>Pago</span>
                    <strong>{formatarMoeda(metricas.valorPago)}</strong>
                  </div>
                  <div>
                    <span>Pendente</span>
                    <strong>{formatarMoeda(metricas.saldoPendente)}</strong>
                  </div>
                </div>
              </Panel>

              <Panel title="Checklist" subtitle="Conclusão dos preparativos">
                <div className="org-progress big">
                  <i
                    style={{
                      width: `${metricas.checklistTotal ? Math.round((metricas.checklistConcluido / metricas.checklistTotal) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="org-muted">
                  {metricas.checklistConcluido} de {metricas.checklistTotal}{" "}
                  itens concluídos.
                </p>
              </Panel>
            </div>
          )}

          {aba === "equipe" && renderEquipe()}
          {aba === "contratacoes" && renderContratacoesUnificadas()}
          {aba === "producao" && renderProducao()}
          {aba === "roteiro" && renderRoteiro()}

          {aba === "pendencias" && (
            <Panel
              title="Central de Pendências"
              subtitle="Alertas automáticos de ações, contratos, fornecedores e checklist"
            >
              {pendencias.length === 0 ? (
                <Empty text="Nenhuma pendência encontrada para este evento." />
              ) : (
                <div className="org-list">
                  {pendencias.map((item, index) => (
                    <MiniRow
                      key={index}
                      title={item.titulo}
                      detail={`${item.tipo} · ${item.detalhe}`}
                      status={item.criticidade}
                    />
                  ))}
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );

  function renderProducao() {
    const fornecedorNome = (fornecedorId?: string | null) =>
      fornecedoresEvento.find((item) => item.fornecedor_id === fornecedorId)
        ?.fornecedor?.nome || "";

    const acoesPorData = producaoFiltrada
      .filter((acao) => acao.data_limite)
      .sort((a, b) =>
        String(a.data_limite).localeCompare(String(b.data_limite)),
      );

    const acoesSemData = producaoFiltrada.filter((acao) => !acao.data_limite);

    const checklistDoCartao = (acaoId: string) =>
      checklist.filter((item) => item.descricao === `acao:${acaoId}`);

    const renderCardProducao = (acao: AcaoProducao) => {
      const checklistItens = checklistDoCartao(acao.id);
      const checklistConcluidos = checklistItens.filter((item) => item.concluido).length;

      return (
        <div
          key={acao.id}
          className={`org-trello-card ${
            acaoArrastadaId === acao.id ? "dragging" : ""
          }`}
          draggable
          onDragStart={(e) => {
            setAcaoArrastadaId(acao.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", acao.id);
          }}
          onDragEnd={() => setAcaoArrastadaId(null)}
          onDoubleClick={() => setAcaoAberta(acao)}
        >
          <div className="org-card-tags">
            <span className={`org-category-tag ${acao.categoria}`}>
              {labelCategoriaProducao(acao.categoria)}
            </span>
            <span className={`org-priority-tag ${acao.prioridade}`}>
              {labelStatus(acao.prioridade)}
            </span>
          </div>

          <button
            type="button"
            className="org-card-title-button"
            onClick={() => setAcaoAberta(acao)}
          >
            {acao.titulo}
          </button>

          {(acao.responsavel_nome || acao.data_limite || acao.fornecedor_id || checklistItens.length > 0) && (
            <div className="org-card-meta">
              {acao.responsavel_nome && <span>👤 {acao.responsavel_nome}</span>}
              {acao.data_limite && (
                <span
                  className={
                    isAtrasada(acao.data_limite, acao.status) ? "danger" : ""
                  }
                >
                  📅 {formatarData(acao.data_limite)}
                </span>
              )}
              {checklistItens.length > 0 && (
                <span>☑️ {checklistConcluidos}/{checklistItens.length}</span>
              )}
              {acao.fornecedor_id && (
                <span>🏢 {fornecedorNome(acao.fornecedor_id)}</span>
              )}
            </div>
          )}

          <div className="org-card-footer-actions">
            <button type="button" onClick={() => setAcaoAberta(acao)}>
              Abrir cartão
            </button>
            <button type="button" onClick={() => editarAcao(acao)}>
              Editar
            </button>
            <button
              type="button"
              onClick={() =>
                alterarStatusAcao(
                  acao,
                  acao.status === "concluido" ? "a_fazer" : "concluido",
                )
              }
            >
              {acao.status === "concluido" ? "Reabrir" : "Concluir"}
            </button>
          </div>
        </div>
      );
    };

    const renderAdicionarNoQuadro = (status: string) => {
      const atual = novaAcaoRapida[status] || {
        titulo: "",
        categoria: "outros",
      };

      if (!quickAddAberto[status]) {
        return (
          <div className="org-quick-card">
            <button
              type="button"
              onClick={() =>
                setQuickAddAberto((prev) => ({ ...prev, [status]: true }))
              }
            >
              + Adicionar cartão
            </button>
          </div>
        );
      }

      return (
        <div className="org-quick-card">
          <input
            placeholder="Título da ação..."
            value={atual.titulo}
            onChange={(e) =>
              setNovaAcaoRapida((prev) => ({
                ...prev,
                [status]: { ...atual, titulo: e.target.value },
              }))
            }
          />
          <select
            value={atual.categoria || "outros"}
            onChange={(e) =>
              setNovaAcaoRapida((prev) => ({
                ...prev,
                [status]: { ...atual, categoria: e.target.value },
              }))
            }
          >
            {CATEGORIAS_PRODUCAO.map((categoria) => (
              <option key={categoria.value} value={categoria.value}>
                {categoria.label}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => criarAcaoRapida(status)}
              disabled={salvando || !atual.titulo.trim()}
            >
              Salvar cartão
            </button>
            <button
              type="button"
              onClick={() =>
                setQuickAddAberto((prev) => ({ ...prev, [status]: false }))
              }
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    };

    return (
      <Panel
        title="Produção"
        subtitle="Central estilo Trello para organizar ações, setores e prazos do evento"
      >
        <div className="org-section-toolbar">
          <div>
            <strong>Central de produção</strong>
            <span>
              Crie cartões por setor, mova o status e acompanhe por quadro,
              ações, calendário ou cronograma.
            </span>
          </div>
          <div className="org-view-toggle">
            <button
              type="button"
              className={visualizacaoProducao === "quadro" ? "active" : ""}
              onClick={() => setVisualizacaoProducao("quadro")}
            >
              Quadro
            </button>
            <button
              type="button"
              className={visualizacaoProducao === "acoes" ? "active" : ""}
              onClick={() => setVisualizacaoProducao("acoes")}
            >
              Ações
            </button>
            <button
              type="button"
              className={visualizacaoProducao === "calendario" ? "active" : ""}
              onClick={() => setVisualizacaoProducao("calendario")}
            >
              Calendário
            </button>
            <button
              type="button"
              className={visualizacaoProducao === "cronograma" ? "active" : ""}
              onClick={() => setVisualizacaoProducao("cronograma")}
            >
              Cronograma
            </button>
          </div>
        </div>

        <div className="org-form-grid producao">
          <input
            placeholder="Título da ação"
            value={novaAcao.titulo}
            onChange={(e) =>
              setNovaAcao({ ...novaAcao, titulo: e.target.value })
            }
          />
          <select
            value={novaAcao.categoria}
            onChange={(e) =>
              setNovaAcao({ ...novaAcao, categoria: e.target.value })
            }
          >
            {CATEGORIAS_PRODUCAO.map((categoria) => (
              <option key={categoria.value} value={categoria.value}>
                {categoria.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Responsável"
            value={novaAcao.responsavel_nome}
            onChange={(e) =>
              setNovaAcao({ ...novaAcao, responsavel_nome: e.target.value })
            }
          />
          <input
            type="date"
            value={novaAcao.data_limite}
            onChange={(e) =>
              setNovaAcao({ ...novaAcao, data_limite: e.target.value })
            }
          />
          <select
            value={novaAcao.prioridade}
            onChange={(e) =>
              setNovaAcao({ ...novaAcao, prioridade: e.target.value })
            }
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
          <select
            value={novaAcao.fornecedor_id}
            onChange={(e) =>
              setNovaAcao({ ...novaAcao, fornecedor_id: e.target.value })
            }
          >
            <option value="">Fornecedor opcional</option>
            {fornecedoresEvento.map((item) => (
              <option key={item.id} value={item.fornecedor_id}>
                {item.fornecedor?.nome || "Fornecedor"}
              </option>
            ))}
          </select>
          <button
            onClick={criarAcao}
            disabled={salvando || !novaAcao.titulo.trim()}
          >
            Adicionar ação
          </button>
        </div>

        {visualizacaoProducao === "quadro" && (
          <div className="org-trello-board">
            {COLUNAS_PRODUCAO.map((coluna) => {
              const itens = producaoFiltrada.filter(
                (acao) =>
                  normalizarStatusProducao(acao.status) === coluna.value,
              );
              return (
                <div
                  key={coluna.value}
                  className={`org-trello-column ${
                    acaoArrastadaId ? "drop-enabled" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const acaoId =
                      e.dataTransfer.getData("text/plain") || acaoArrastadaId;
                    const acao = encontrarAcaoPorId(acaoId);
                    if (acao) moverAcaoParaColuna(acao, coluna.value);
                  }}
                >
                  <div className="org-trello-head">
                    <div>
                      <strong>{coluna.label}</strong>
                      <span>{coluna.description}</span>
                    </div>
                    <em>{itens.length}</em>
                  </div>
                  <div className="org-trello-list">
                    {itens.map(renderCardProducao)}
                    {itens.length === 0 && (
                      <Empty text="Nenhuma ação nesta etapa." />
                    )}
                    {renderAdicionarNoQuadro(coluna.value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {visualizacaoProducao === "acoes" && (
          <div className="org-actions-table-wrap">
            <table className="org-actions-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Ação</th>
                  <th>Categoria</th>
                  <th>Responsável</th>
                  <th>Prazo</th>
                  <th>Prioridade</th>
                  <th>Fornecedor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {producaoFiltrada.map((acao) => (
                  <tr key={acao.id}>
                    <td>
                      <span className={`org-pill ${acao.status}`}>
                        {labelStatus(acao.status)}
                      </span>
                    </td>
                    <td>
                      <strong>{acao.titulo}</strong>
                    </td>
                    <td>{labelCategoriaProducao(acao.categoria)}</td>
                    <td>{acao.responsavel_nome || "-"}</td>
                    <td
                      className={
                        isAtrasada(acao.data_limite, acao.status)
                          ? "org-danger-text"
                          : ""
                      }
                    >
                      {formatarData(acao.data_limite)}
                    </td>
                    <td>{labelStatus(acao.prioridade)}</td>
                    <td>{fornecedorNome(acao.fornecedor_id) || "-"}</td>
                    <td>
                      <button type="button" onClick={() => setAcaoAberta(acao)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {producaoFiltrada.length === 0 && (
              <Empty text="Nenhuma ação de produção encontrada." />
            )}
          </div>
        )}

        {visualizacaoProducao === "calendario" && (
          <div className="org-calendar-list">
            {acoesPorData.map((acao) => (
              <div key={acao.id} className="org-calendar-row">
                <div className="org-calendar-date">
                  {formatarData(acao.data_limite)}
                </div>
                <div className="org-calendar-content">
                  <strong>{acao.titulo}</strong>
                  <span>
                    {labelCategoriaProducao(acao.categoria)} ·{" "}
                    {labelStatus(acao.status)} ·{" "}
                    {acao.responsavel_nome || "Sem responsável"}
                  </span>
                </div>
                <button type="button" onClick={() => setAcaoAberta(acao)}>
                  Abrir cartão
                </button>
              </div>
            ))}
            {acoesPorData.length === 0 && (
              <Empty text="Nenhuma ação com prazo para exibir no calendário." />
            )}
          </div>
        )}

        {visualizacaoProducao === "cronograma" && (
          <div className="org-timeline-view">
            {acoesPorData.map((acao, index) => (
              <div key={acao.id} className="org-timeline-item">
                <div className="org-timeline-marker">
                  <span>{index + 1}</span>
                </div>
                <div className="org-timeline-card">
                  <div>
                    <span className="org-timeline-date">
                      {formatarData(acao.data_limite)}
                    </span>
                    <h3>{acao.titulo}</h3>
                    <p>
                      {labelCategoriaProducao(acao.categoria)} ·{" "}
                      {labelStatus(acao.status)} ·{" "}
                      {acao.responsavel_nome || "Sem responsável"}
                    </p>
                  </div>
                  <div className="org-card-actions compact">
                    <button type="button" onClick={() => setAcaoAberta(acao)}>
                      Abrir cartão
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        alterarStatusAcao(
                          acao,
                          acao.status === "concluido" ? "a_fazer" : "concluido",
                        )
                      }
                    >
                      {acao.status === "concluido" ? "Reabrir" : "Concluir"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {acoesSemData.length > 0 && (
              <div className="org-without-date">
                <strong>Ações sem prazo</strong>
                <span>
                  {acoesSemData.length} ação(ões) ainda precisam de data para
                  entrar no cronograma.
                </span>
              </div>
            )}
            {acoesPorData.length === 0 && (
              <Empty text="Nenhuma ação com prazo para montar o cronograma." />
            )}
          </div>
        )}

        {acaoAberta && (
          <div
            className="org-modal-backdrop"
            onClick={() => setAcaoAberta(null)}
          >
            <div
              className="org-card-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="org-card-modal-main">
                <button
                  type="button"
                  className="org-modal-close"
                  onClick={() => setAcaoAberta(null)}
                >
                  ×
                </button>
                <span className={`org-category-tag ${acaoAberta.categoria}`}>
                  {labelCategoriaProducao(acaoAberta.categoria)}
                </span>
                <input
                  className="org-card-title-input"
                  value={acaoAberta.titulo}
                  onChange={(e) =>
                    setAcaoAberta({ ...acaoAberta, titulo: e.target.value })
                  }
                  onBlur={(e) => {
                    const titulo = e.target.value.trim();
                    if (!titulo) {
                      setErro("O título da ação não pode ficar vazio.");
                      return;
                    }
                    const tituloAtual =
                      producao.find((item) => item.id === acaoAberta.id)?.titulo ||
                      acaoAberta.titulo;
                    if (titulo !== tituloAtual) {
                      atualizarAcaoCampo(acaoAberta, "titulo", titulo);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <p className="org-muted">
                  Na lista {labelStatus(acaoAberta.status)}
                </p>

                <div className="org-modal-fields">
                  <label>
                    Status
                    <select
                      value={acaoAberta.status}
                      onChange={(e) =>
                        atualizarAcaoCampo(acaoAberta, "status", e.target.value)
                      }
                    >
                      {STATUS_PRODUCAO.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Categoria
                    <select
                      value={acaoAberta.categoria}
                      onChange={(e) =>
                        atualizarAcaoCampo(
                          acaoAberta,
                          "categoria",
                          e.target.value,
                        )
                      }
                    >
                      {CATEGORIAS_PRODUCAO.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioridade
                    <select
                      value={acaoAberta.prioridade}
                      onChange={(e) =>
                        atualizarAcaoCampo(
                          acaoAberta,
                          "prioridade",
                          e.target.value,
                        )
                      }
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </label>
                  <label>
                    Prazo
                    <input
                      id={`org-card-date-${acaoAberta.id}`}
                      type="date"
                      value={acaoAberta.data_limite ? acaoAberta.data_limite.slice(0, 10) : ""}
                      onChange={(e) =>
                        atualizarAcaoCampo(
                          acaoAberta,
                          "data_limite",
                          e.target.value || null,
                        )
                      }
                    />
                  </label>
                  <label>
                    Responsável
                    <input
                      value={acaoAberta.responsavel_nome || ""}
                      onChange={(e) =>
                        setAcaoAberta({
                          ...acaoAberta,
                          responsavel_nome: e.target.value,
                        })
                      }
                      onBlur={(e) =>
                        atualizarAcaoCampo(
                          acaoAberta,
                          "responsavel_nome",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    Fornecedor
                    <select
                      value={acaoAberta.fornecedor_id || ""}
                      onChange={(e) =>
                        atualizarAcaoCampo(
                          acaoAberta,
                          "fornecedor_id",
                          e.target.value || null,
                        )
                      }
                    >
                      <option value="">Sem fornecedor</option>
                      {fornecedoresEvento.map((item) => (
                        <option key={item.id} value={item.fornecedor_id}>
                          {item.fornecedor?.nome || "Fornecedor"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="org-modal-section">
                  <h3>Descrição</h3>
                  <textarea
                    className="org-description-input"
                    placeholder="Adicione uma descrição mais detalhada..."
                    value={acaoAberta.descricao || ""}
                    onChange={(e) =>
                      setAcaoAberta({ ...acaoAberta, descricao: e.target.value })
                    }
                    onBlur={(e) =>
                      atualizarAcaoCampo(acaoAberta, "descricao", e.target.value)
                    }
                  />
                </div>

                <div className="org-modal-section">
                  <h3>Detalhes</h3>
                  <p>
                    Responsável:{" "}
                    {acaoAberta.responsavel_nome || "Sem responsável"}
                  </p>
                  <p>Prazo: {formatarData(acaoAberta.data_limite)}</p>
                  <p>
                    Fornecedor:{" "}
                    {fornecedorNome(acaoAberta.fornecedor_id) ||
                      "Sem fornecedor vinculado"}
                  </p>
                </div>

                <div className="org-modal-section">
                  <h3>Checklist do cartão</h3>
                  <div className="org-card-checklist-input">
                    <input
                      placeholder="Adicionar item ao checklist..."
                      value={novoChecklistCartao[acaoAberta.id] || ""}
                      onChange={(e) =>
                        setNovoChecklistCartao((prev) => ({
                          ...prev,
                          [acaoAberta.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") criarChecklistCartao(acaoAberta);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => criarChecklistCartao(acaoAberta)}
                      disabled={salvando || !(novoChecklistCartao[acaoAberta.id] || "").trim()}
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="org-card-checklist-list">
                    {checklistDoCartao(acaoAberta.id).map((item) => (
                      <label key={item.id} className="org-card-checklist-row">
                        <input
                          type="checkbox"
                          checked={item.concluido}
                          onChange={() => alternarChecklist(item)}
                        />
                        <span className={item.concluido ? "done" : ""}>
                          {item.item}
                        </span>
                        <button type="button" onClick={() => alterarChecklist(item)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => excluirChecklist(item)}
                        >
                          Excluir
                        </button>
                      </label>
                    ))}
                    {checklistDoCartao(acaoAberta.id).length === 0 && (
                      <p>Nenhum item de checklist neste cartão.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="org-card-modal-sidebar">
                <strong>Adicionar ao cartão</strong>
                <button type="button" onClick={() => abrirEdicaoEtiqueta(acaoAberta)}>
                  🏷️ Etiquetas
                </button>
                <button type="button" onClick={() => abrirEdicaoData(acaoAberta)}>
                  🕒 Datas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(
                      `.org-card-checklist-input input`,
                    );
                    input?.focus();
                  }}
                >
                  ☑️ Checklist
                </button>
                <button type="button" onClick={() => abrirEdicaoMembro(acaoAberta)}>
                  👥 Membros
                </button>
                <button type="button" onClick={() => abrirVinculoFornecedor(acaoAberta)}>
                  🏢 Fornecedor
                </button>
                <button type="button" onClick={() => abrirEdicaoDescricao(acaoAberta)}>
                  📝 Descrição
                </button>

                <strong>Ações do cartão</strong>
                <button type="button" onClick={() => editarAcao(acaoAberta)}>
                  ✏️ Editar dados
                </button>
                <button
                  type="button"
                  onClick={() =>
                    alterarStatusAcao(
                      acaoAberta,
                      acaoAberta.status === "concluido"
                        ? "a_fazer"
                        : "concluido",
                    )
                  }
                >
                  {acaoAberta.status === "concluido"
                    ? "↩️ Reabrir"
                    : "✅ Concluir"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(acaoAberta.titulo);
                  }}
                >
                  🔗 Copiar título
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    excluirAcao(acaoAberta);
                    setAcaoAberta(null);
                  }}
                >
                  🗑️ Excluir cartão
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    );
  }


  async function criarChecklistRoteiro(itemAgenda: AgendaItem) {
    if (!eventoAtual || !tenantId) return;
    const texto = (novoChecklistRoteiro[itemAgenda.id] || "").trim();
    if (!texto) return;

    setSalvando(true);
    const { error } = await supabase.from("organizacao_checklist").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      agenda_item_id: itemAgenda.id,
      item: texto,
      categoria: itemAgenda.categoria || "roteiro",
      tipo: "dia_evento",
      obrigatorio: true,
      concluido: false,
      responsavel_nome: itemAgenda.responsavel || null,
    });

    await depoisSalvar(error, () =>
      setNovoChecklistRoteiro((prev) => ({ ...prev, [itemAgenda.id]: "" })),
    );
  }

  function progressoChecklistAgenda(itemAgenda: AgendaItem) {
    const agendaItemId = itemAgenda?.id ? String(itemAgenda.id) : "";
    const itens = agendaItemId ? checklistPorAgenda[agendaItemId] || [] : [];
    const total = itens.length;
    const concluidos = itens.filter((item) => item.concluido).length;
    const percentual = total ? Math.round((concluidos / total) * 100) : 0;
    return { itens, total, concluidos, percentual };
  }

  function nomeFornecedorContrato(item: Contratacao) {
    const vinculo = fornecedoresEvento.find(
      (fornecedor) => fornecedor.id === item.fornecedor_evento_id,
    );
    return vinculo?.fornecedor?.nome || "Sem fornecedor vinculado";
  }

  function contratacoesDoFornecedor(fornecedorEventoId: string) {
    return contratacoesFiltradas.filter(
      (contratacao) => contratacao.fornecedor_evento_id === fornecedorEventoId,
    );
  }

  function renderContratacoesUnificadas() {
    const contratacoesSemFornecedor = contratacoesFiltradas.filter(
      (contratacao) => !contratacao.fornecedor_evento_id,
    );

    return (
      <Panel
        title="Contratações"
        subtitle="Fornecedores, serviços contratados, contratos e pagamentos em uma única visão"
      >
        <div className="org-money-grid contratacoes-resumo">
          <div>
            <span>Total contratado</span>
            <strong>{formatarMoeda(metricas.valorContratado)}</strong>
          </div>
          <div>
            <span>Total pago</span>
            <strong>{formatarMoeda(metricas.valorPago)}</strong>
          </div>
          <div>
            <span>Saldo pendente</span>
            <strong>{formatarMoeda(metricas.saldoPendente)}</strong>
          </div>
        </div>

        <div className="org-section-title">
          <div>
            <span className="org-eyebrow">Fornecedor</span>
            <h3>Adicionar fornecedor ao evento</h3>
          </div>
        </div>

        <div className="org-form-grid fornecedor">
          <input
            placeholder="Nome do fornecedor"
            value={novoFornecedor.nome}
            onChange={(e) =>
              setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })
            }
          />
          <select
            value={novoFornecedor.categoria}
            onChange={(e) =>
              setNovoFornecedor({
                ...novoFornecedor,
                categoria: e.target.value,
              })
            }
          >
            {CATEGORIAS_FORNECEDOR.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Telefone"
            value={novoFornecedor.telefone}
            onChange={(e) =>
              setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })
            }
          />
          <input
            placeholder="E-mail"
            value={novoFornecedor.email}
            onChange={(e) =>
              setNovoFornecedor({ ...novoFornecedor, email: e.target.value })
            }
          />
          <input
            placeholder="Valor fechado"
            value={novoFornecedor.valor_fechado}
            onChange={(e) =>
              setNovoFornecedor({
                ...novoFornecedor,
                valor_fechado: e.target.value,
              })
            }
          />
          <button
            onClick={criarFornecedor}
            disabled={salvando || !novoFornecedor.nome.trim()}
          >
            Adicionar fornecedor
          </button>
        </div>

        <div className="org-section-title">
          <div>
            <span className="org-eyebrow">Serviço / contrato</span>
            <h3>Adicionar serviço contratado</h3>
          </div>
        </div>

        <div className="org-form-grid contratacao">
          <input
            placeholder="Serviço contratado. Ex.: DJ + som + iluminação"
            value={novaContratacao.titulo}
            onChange={(e) =>
              setNovaContratacao({
                ...novaContratacao,
                titulo: e.target.value,
              })
            }
          />
          <select
            value={novaContratacao.fornecedor_evento_id}
            onChange={(e) =>
              setNovaContratacao({
                ...novaContratacao,
                fornecedor_evento_id: e.target.value,
              })
            }
          >
            <option value="">Sem fornecedor vinculado</option>
            {fornecedoresEvento.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fornecedor?.nome || "Fornecedor"}
              </option>
            ))}
          </select>
          <input
            placeholder="Valor contratado"
            value={novaContratacao.valor_contratado}
            onChange={(e) =>
              setNovaContratacao({
                ...novaContratacao,
                valor_contratado: e.target.value,
              })
            }
          />
          <input
            placeholder="Valor pago"
            value={novaContratacao.valor_pago}
            onChange={(e) =>
              setNovaContratacao({
                ...novaContratacao,
                valor_pago: e.target.value,
              })
            }
          />
          <input
            type="date"
            value={novaContratacao.data_vencimento}
            onChange={(e) =>
              setNovaContratacao({
                ...novaContratacao,
                data_vencimento: e.target.value,
              })
            }
          />
          <button
            onClick={criarContratacao}
            disabled={salvando || !novaContratacao.titulo.trim()}
          >
            Adicionar serviço
          </button>
        </div>

        <div className="org-contract-groups">
          {fornecedoresFiltrados.map((fornecedorEvento) => {
            const servicos = contratacoesDoFornecedor(fornecedorEvento.id);
            const contratado = servicos.reduce(
              (total, item) => total + toNumber(item.valor_contratado),
              0,
            );
            const pago = servicos.reduce(
              (total, item) => total + toNumber(item.valor_pago),
              0,
            );
            return (
              <div key={fornecedorEvento.id} className="org-contract-group">
                <div className="org-contract-header">
                  <div>
                    <span className={`org-pill ${fornecedorEvento.status}`}>
                      {labelStatus(fornecedorEvento.status)}
                    </span>
                    <h3>{fornecedorEvento.fornecedor?.nome || "Fornecedor"}</h3>
                    <p>
                      {labelCategoria(
                        fornecedorEvento.fornecedor?.categoria ||
                          fornecedorEvento.categoria_evento,
                      )}{" "}
                      · {fornecedorEvento.fornecedor?.telefone || "Sem telefone"}
                    </p>
                  </div>
                  <div className="org-finance-values">
                    <strong>{formatarMoeda(contratado)}</strong>
                    <span>Pago {formatarMoeda(pago)}</span>
                    <span>Saldo {formatarMoeda(contratado - pago)}</span>
                  </div>
                </div>

                <div className="org-card-actions compact">
                  <select
                    value={fornecedorEvento.status}
                    onChange={(e) =>
                      atualizarStatusFornecedor(fornecedorEvento, e.target.value)
                    }
                  >
                    {STATUS_FORNECEDOR.map((s) => (
                      <option key={s} value={s}>
                        {labelStatus(s)}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => editarFornecedor(fornecedorEvento)}>
                    ✏️ Editar fornecedor
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => excluirFornecedor(fornecedorEvento)}
                  >
                    🗑️ Excluir
                  </button>
                </div>

                <div className="org-service-list">
                  {servicos.length === 0 ? (
                    <Empty text="Nenhum serviço contratado para este fornecedor." />
                  ) : (
                    servicos.map((servico) => (
                      <div key={servico.id} className="org-service-card">
                        <div>
                          <span className={`org-pill ${servico.status}`}>
                            {labelStatus(servico.status)}
                          </span>
                          <h4>{servico.titulo}</h4>
                          <p>
                            Vencimento {formatarData(servico.data_vencimento)} ·{" "}
                            {servico.parcelas || 1} parcela(s)
                          </p>
                        </div>
                        <div className="org-finance-values compact-values">
                          <strong>{formatarMoeda(toNumber(servico.valor_contratado))}</strong>
                          <span>Pago {formatarMoeda(toNumber(servico.valor_pago))}</span>
                          <span>
                            Saldo{" "}
                            {formatarMoeda(
                              toNumber(
                                servico.valor_pendente ??
                                  toNumber(servico.valor_contratado) -
                                    toNumber(servico.valor_pago),
                              ),
                            )}
                          </span>
                        </div>
                        <div className="org-card-actions compact">
                          <button type="button" onClick={() => editarContratacao(servico)}>
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => marcarContratacaoPaga(servico)}
                            disabled={servico.status === "pago"}
                          >
                            ✅ Marcar pago
                          </button>
                          <button
                            type="button"
                            onClick={() => anexarComprovanteContratacao(servico)}
                          >
                            📎 Comprovante
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => excluirContratacao(servico)}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {contratacoesSemFornecedor.length > 0 && (
            <div className="org-contract-group">
              <div className="org-contract-header">
                <div>
                  <span className="org-pill pendente">Sem fornecedor</span>
                  <h3>Serviços sem fornecedor vinculado</h3>
                  <p>Contratações cadastradas sem vínculo com fornecedor.</p>
                </div>
              </div>
              <div className="org-service-list">
                {contratacoesSemFornecedor.map((servico) => (
                  <div key={servico.id} className="org-service-card">
                    <div>
                      <span className={`org-pill ${servico.status}`}>
                        {labelStatus(servico.status)}
                      </span>
                      <h4>{servico.titulo}</h4>
                      <p>
                        {nomeFornecedorContrato(servico)} · Vencimento{" "}
                        {formatarData(servico.data_vencimento)}
                      </p>
                    </div>
                    <div className="org-finance-values compact-values">
                      <strong>{formatarMoeda(toNumber(servico.valor_contratado))}</strong>
                      <span>Pago {formatarMoeda(toNumber(servico.valor_pago))}</span>
                    </div>
                    <div className="org-card-actions compact">
                      <button type="button" onClick={() => editarContratacao(servico)}>
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarContratacaoPaga(servico)}
                        disabled={servico.status === "pago"}
                      >
                        ✅ Marcar pago
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => excluirContratacao(servico)}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fornecedoresFiltrados.length === 0 && contratacoesSemFornecedor.length === 0 && (
            <Empty text="Nenhuma contratação encontrada." />
          )}
        </div>
      </Panel>
    );
  }

  function renderFornecedores() {
    return (
      <Panel
        title="Fornecedores"
        subtitle="Cadastro separado de contatos e convidados"
      >
        <div className="org-form-grid fornecedor">
          <input
            placeholder="Nome do fornecedor"
            value={novoFornecedor.nome}
            onChange={(e) =>
              setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })
            }
          />
          <select
            value={novoFornecedor.categoria}
            onChange={(e) =>
              setNovoFornecedor({
                ...novoFornecedor,
                categoria: e.target.value,
              })
            }
          >
            {CATEGORIAS_FORNECEDOR.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Telefone"
            value={novoFornecedor.telefone}
            onChange={(e) =>
              setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })
            }
          />
          <input
            placeholder="E-mail"
            value={novoFornecedor.email}
            onChange={(e) =>
              setNovoFornecedor({ ...novoFornecedor, email: e.target.value })
            }
          />
          <input
            placeholder="Valor fechado"
            value={novoFornecedor.valor_fechado}
            onChange={(e) =>
              setNovoFornecedor({
                ...novoFornecedor,
                valor_fechado: e.target.value,
              })
            }
          />
          <button
            onClick={criarFornecedor}
            disabled={salvando || !novoFornecedor.nome.trim()}
          >
            Adicionar
          </button>
        </div>
        <div className="org-card-list">
          {fornecedoresFiltrados.map((item) => (
            <div key={item.id} className="org-item-card">
              <div className="org-item-main">
                <span className={`org-pill ${item.status}`}>
                  {labelStatus(item.status)}
                </span>
                <h3>{item.fornecedor?.nome || "Fornecedor"}</h3>
                <p>
                  {labelCategoria(
                    item.fornecedor?.categoria || item.categoria_evento,
                  )}{" "}
                  · {item.fornecedor?.telefone || "Sem telefone"} ·{" "}
                  {formatarMoeda(
                    toNumber(item.valor_fechado || item.valor_orcado),
                  )}
                </p>
              </div>
              <div className="org-card-actions">
                <select
                  value={item.status}
                  onChange={(e) =>
                    atualizarStatusFornecedor(item, e.target.value)
                  }
                >
                  {STATUS_FORNECEDOR.map((s) => (
                    <option key={s} value={s}>
                      {labelStatus(s)}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => editarFornecedor(item)}>
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => abrirContratoFornecedor(item)}
                >
                  📄 Contrato
                </button>
                <button
                  type="button"
                  onClick={() => abrirPagamentoFornecedor(item)}
                >
                  💰 Pagamento
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => excluirFornecedor(item)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
          {fornecedoresFiltrados.length === 0 && (
            <Empty text="Nenhum fornecedor encontrado." />
          )}
        </div>
      </Panel>
    );
  }

  function renderContratacoes(financeiro: boolean) {
    return (
      <Panel
        title={financeiro ? "Financeiro" : "Contratações"}
        subtitle="Contratos, vencimentos, pagamentos e saldo pendente"
      >
        {!financeiro && (
          <div className="org-form-grid contratacao">
            <input
              placeholder="Título da contratação"
              value={novaContratacao.titulo}
              onChange={(e) =>
                setNovaContratacao({
                  ...novaContratacao,
                  titulo: e.target.value,
                })
              }
            />
            <select
              value={novaContratacao.fornecedor_evento_id}
              onChange={(e) =>
                setNovaContratacao({
                  ...novaContratacao,
                  fornecedor_evento_id: e.target.value,
                })
              }
            >
              <option value="">Sem fornecedor vinculado</option>
              {fornecedoresEvento.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fornecedor?.nome || "Fornecedor"}
                </option>
              ))}
            </select>
            <input
              placeholder="Valor contratado"
              value={novaContratacao.valor_contratado}
              onChange={(e) =>
                setNovaContratacao({
                  ...novaContratacao,
                  valor_contratado: e.target.value,
                })
              }
            />
            <input
              placeholder="Valor pago"
              value={novaContratacao.valor_pago}
              onChange={(e) =>
                setNovaContratacao({
                  ...novaContratacao,
                  valor_pago: e.target.value,
                })
              }
            />
            <input
              type="date"
              value={novaContratacao.data_vencimento}
              onChange={(e) =>
                setNovaContratacao({
                  ...novaContratacao,
                  data_vencimento: e.target.value,
                })
              }
            />
            <button
              onClick={criarContratacao}
              disabled={salvando || !novaContratacao.titulo.trim()}
            >
              Adicionar
            </button>
          </div>
        )}
        <div className="org-card-list">
          {contratacoesFiltradas.map((item) => (
            <div key={item.id} className="org-item-card finance">
              <div className="org-item-main">
                <span className={`org-pill ${item.status}`}>
                  {labelStatus(item.status)}
                </span>
                <h3>{item.titulo}</h3>
                <p>
                  Vencimento {formatarData(item.data_vencimento)} ·{" "}
                  {item.parcelas || 1} parcela(s)
                </p>
              </div>
              <div className="org-finance-values">
                <strong>
                  {formatarMoeda(toNumber(item.valor_contratado))}
                </strong>
                <span>Pago {formatarMoeda(toNumber(item.valor_pago))}</span>
                <span>
                  Pendente{" "}
                  {formatarMoeda(
                    toNumber(
                      item.valor_pendente ??
                        toNumber(item.valor_contratado) -
                          toNumber(item.valor_pago),
                    ),
                  )}
                </span>
              </div>
              <div className="org-card-actions compact">
                <button type="button" onClick={() => editarContratacao(item)}>
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => marcarContratacaoPaga(item)}
                  disabled={item.status === "pago"}
                >
                  ✅ Marcar pago
                </button>
                <button
                  type="button"
                  onClick={() => anexarComprovanteContratacao(item)}
                >
                  📎 Comprovante
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => excluirContratacao(item)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
          {contratacoesFiltradas.length === 0 && (
            <Empty text="Nenhuma contratação encontrada." />
          )}
        </div>
      </Panel>
    );
  }

  function renderRoteiro() {
    const agendaVisivel = Array.isArray(agendaFiltrada) ? agendaFiltrada : [];

    return (
      <Panel
        title="Roteiro do Evento"
        subtitle="Timeline e cerimonial usando event_agenda_items"
      >
        <div className="org-template-actions">
          <div>
            <strong>Roteiro padrão</strong>
            <span>Use um modelo inicial e ajuste horários, responsáveis e itens depois.</span>
          </div>
          <select
            value={modeloRoteiroPadrao}
            onChange={(e) => setModeloRoteiroPadrao(e.target.value)}
          >
            {ROTEIROS_PADRAO.map((modelo) => (
              <option key={modelo.value} value={modelo.value}>
                {modelo.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={usarRoteiroPadrao} disabled={salvando}>
            Usar roteiro padrão
          </button>
        </div>

        <div className="org-form-grid roteiro">
          <input
            placeholder="Título"
            value={novoAgenda.titulo}
            onChange={(e) =>
              setNovoAgenda({ ...novoAgenda, titulo: e.target.value })
            }
          />
          <input
            type="datetime-local"
            value={novoAgenda.data_inicio}
            onChange={(e) =>
              setNovoAgenda({ ...novoAgenda, data_inicio: e.target.value })
            }
          />
          <input
            type="datetime-local"
            value={novoAgenda.data_fim}
            onChange={(e) =>
              setNovoAgenda({ ...novoAgenda, data_fim: e.target.value })
            }
          />
          <input
            placeholder="Responsável"
            value={novoAgenda.responsavel}
            onChange={(e) =>
              setNovoAgenda({ ...novoAgenda, responsavel: e.target.value })
            }
          />
          <button
            onClick={criarAgenda}
            disabled={salvando || !novoAgenda.titulo.trim()}
          >
            Adicionar
          </button>
        </div>
        <div className="org-timeline">
          {agendaVisivel.map((item) => {
            const progresso = progressoChecklistAgenda(item);
            return (
              <div key={item.id || `${item.titulo || "roteiro"}-${item.data_inicio || ""}`} className="org-timeline-row roteiro-com-checklist">
                <div className="org-time">
                  <strong>{hora(item.data_inicio)}</strong>
                  <span>{hora(item.data_fim)}</span>
                </div>
                <div className="org-dot" />
                <div className="org-timeline-content">
                  <h3>{String(item.titulo || "Item do roteiro")}</h3>
                  <p>
                    {String(item.categoria || "Roteiro")} ·{" "}
                    {String(item.responsavel || "Sem responsável")}
                  </p>
                  {item.descricao ? <small>{String(item.descricao)}</small> : null}

                  <div className="org-roteiro-checklist">
                    <div className="org-roteiro-checklist-head">
                      <div>
                        <strong>Checklist operacional</strong>
                        <span>
                          {progresso.concluidos}/{progresso.total} concluídos
                        </span>
                      </div>
                      <div className="org-progress mini">
                        <i style={{ width: `${progresso.percentual}%` }} />
                      </div>
                    </div>

                    <div className="org-roteiro-checklist-list">
                      {progresso.itens.length === 0 ? (
                        <p className="org-muted">Nenhum checklist vinculado a este item do roteiro.</p>
                      ) : (
                        progresso.itens.map((check) => (
                          <div
                            key={check.id}
                            className={`org-roteiro-check ${check.concluido ? "done" : ""}`}
                          >
                            <button
                              type="button"
                              className="org-check-toggle small"
                              onClick={() => alternarChecklist(check)}
                              aria-label={check.concluido ? "Reabrir item" : "Concluir item"}
                            >
                              {check.concluido ? "✓" : ""}
                            </button>
                            <span>{String(check.item || "")}</span>
                            <button type="button" onClick={() => alterarChecklist(check)}>
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => excluirChecklist(check)}
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="org-inline-add-check">
                      <input
                        value={novoChecklistRoteiro[item.id] || ""}
                        onChange={(e) =>
                          setNovoChecklistRoteiro((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") criarChecklistRoteiro(item);
                        }}
                        placeholder="Adicionar item ao checklist deste roteiro..."
                      />
                      <button
                        type="button"
                        onClick={() => criarChecklistRoteiro(item)}
                        disabled={salvando || !(novoChecklistRoteiro[item.id] || "").trim()}
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="org-row-actions">
                    <button type="button" onClick={() => abrirEdicaoAgenda(item)}>
                      ✏️ Editar
                    </button>
                    <button type="button" onClick={() => duplicarAgenda(item)}>
                      📄 Duplicar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => excluirAgenda(item)}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {agendaVisivel.length === 0 && (
            <Empty text="Nenhum item de roteiro encontrado." />
          )}
        </div>

        {agendaEditando && (
          <div
            className="org-modal-backdrop"
            onClick={fecharEdicaoAgenda}
          >
            <div
              className="org-agenda-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="org-agenda-modal-header">
                <div>
                  <span className="org-eyebrow">Roteiro do evento</span>
                  <h2>Editar item do roteiro</h2>
                  <p>Ajuste horário, categoria, responsável e descrição.</p>
                </div>
                <button
                  type="button"
                  className="org-modal-close static"
                  onClick={fecharEdicaoAgenda}
                >
                  ×
                </button>
              </div>

              <div className="org-agenda-modal-grid">
                <label className="full">
                  Título
                  <input
                    value={formAgendaEditando.titulo}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        titulo: e.target.value,
                      })
                    }
                    autoFocus
                  />
                </label>

                <label>
                  Categoria
                  <select
                    value={formAgendaEditando.categoria}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        categoria: e.target.value,
                      })
                    }
                  >
                    {CATEGORIAS_ROTEIRO.map((categoria) => (
                      <option key={categoria.value} value={categoria.value}>
                        {categoria.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={formAgendaEditando.status}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>

                <label>
                  Início
                  <input
                    type="datetime-local"
                    value={formAgendaEditando.data_inicio}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        data_inicio: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Fim
                  <input
                    type="datetime-local"
                    value={formAgendaEditando.data_fim}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        data_fim: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="full">
                  Responsável
                  <input
                    list="organizacao-equipe-roteiro"
                    value={formAgendaEditando.responsavel}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        responsavel: e.target.value,
                      })
                    }
                    placeholder="Nome do responsável"
                  />
                  <datalist id="organizacao-equipe-roteiro">
                    {equipe.map((pessoa) => (
                      <option key={pessoa.id} value={pessoa.nome} />
                    ))}
                  </datalist>
                </label>

                <label className="full">
                  Descrição
                  <textarea
                    value={formAgendaEditando.descricao}
                    onChange={(e) =>
                      setFormAgendaEditando({
                        ...formAgendaEditando,
                        descricao: e.target.value,
                      })
                    }
                    placeholder="Observações, detalhes operacionais ou instruções para a equipe..."
                  />
                </label>
              </div>

              <div className="org-agenda-modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={fecharEdicaoAgenda}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => duplicarAgenda(agendaEditando)}
                  disabled={salvando}
                >
                  📄 Duplicar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={async () => {
                    const item = agendaEditando;
                    fecharEdicaoAgenda();
                    await excluirAgenda(item);
                  }}
                  disabled={salvando}
                >
                  🗑️ Excluir
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={salvarAgendaEditada}
                  disabled={salvando || !formAgendaEditando.titulo.trim()}
                >
                  Salvar alterações
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    );
  }

  function renderEquipe() {
    return (
      <Panel title="Equipe" subtitle="Equipe operacional do dia do evento">
        <div className="org-form-grid equipe">
          <input
            placeholder="Nome"
            value={novoEquipe.nome}
            onChange={(e) =>
              setNovoEquipe({ ...novoEquipe, nome: e.target.value })
            }
          />
          <input
            placeholder="Função"
            value={novoEquipe.funcao}
            onChange={(e) =>
              setNovoEquipe({ ...novoEquipe, funcao: e.target.value })
            }
          />
          <input
            placeholder="Telefone"
            value={novoEquipe.telefone}
            onChange={(e) =>
              setNovoEquipe({ ...novoEquipe, telefone: e.target.value })
            }
          />
          <label className="org-check">
            <input
              type="checkbox"
              checked={novoEquipe.contato_principal}
              onChange={(e) =>
                setNovoEquipe({
                  ...novoEquipe,
                  contato_principal: e.target.checked,
                })
              }
            />{" "}
            Principal
          </label>
          <button
            onClick={criarEquipe}
            disabled={
              salvando || !novoEquipe.nome.trim() || !novoEquipe.funcao.trim()
            }
          >
            Adicionar
          </button>
        </div>
        <div className="org-card-list">
          {equipeFiltrada.map((item) => (
            <div key={item.id} className="org-item-card">
              <div className="org-item-main">
                <span className={`org-pill ${item.status}`}>
                  {item.contato_principal
                    ? "Principal"
                    : labelStatus(item.status)}
                </span>
                <h3>{item.nome}</h3>
                <p>
                  {item.funcao} · {item.telefone || "Sem telefone"}
                </p>
              </div>
              <span className="org-muted">
                {formatarDataHora(item.horario_inicio)}
              </span>
              <div className="org-card-actions">
                <select
                  value={item.status}
                  onChange={(e) => atualizarStatusEquipe(item, e.target.value)}
                >
                  <option value="convidado">Convidado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="presente">Presente</option>
                  <option value="ausente">Ausente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    atualizarStatusEquipe(
                      item,
                      item.status === "presente" ? "confirmado" : "presente",
                    )
                  }
                >
                  {item.status === "presente" ? "↩️ Reabrir" : "✅ Confirmar"}
                </button>
                <button type="button" onClick={() => editarEquipe(item)}>
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => excluirEquipe(item)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
          {equipeFiltrada.length === 0 && (
            <Empty text="Nenhum membro da equipe encontrado." />
          )}
        </div>
      </Panel>
    );
  }

  function renderChecklist() {
    return (
      <Panel
        title="Checklist do Dia"
        subtitle="Itens de montagem, cerimônia, operação e desmontagem"
      >
        <div className="org-checklist-actions">
          <button
            onClick={usarChecklistPadrao}
            disabled={salvando || !eventoAtual}
          >
            {checklist.length === 0
              ? "Usar checklist padrão"
              : "Adicionar itens padrão restantes"}
          </button>
          <span>{CHECKLIST_PADRAO_DIA.length} itens padrão disponíveis</span>
        </div>

        <div className="org-form-grid checklist">
          <input
            placeholder="Item do checklist"
            value={novoChecklist.item}
            onChange={(e) =>
              setNovoChecklist({ ...novoChecklist, item: e.target.value })
            }
          />
          <input
            placeholder="Categoria"
            value={novoChecklist.categoria}
            onChange={(e) =>
              setNovoChecklist({ ...novoChecklist, categoria: e.target.value })
            }
          />
          <select
            value={novoChecklist.tipo}
            onChange={(e) =>
              setNovoChecklist({ ...novoChecklist, tipo: e.target.value })
            }
          >
            <option value="planejamento">Planejamento</option>
            <option value="dia_evento">Dia do evento</option>
            <option value="montagem">Montagem</option>
            <option value="desmontagem">Desmontagem</option>
            <option value="outro">Outro</option>
          </select>
          <label className="org-check">
            <input
              type="checkbox"
              checked={novoChecklist.obrigatorio}
              onChange={(e) =>
                setNovoChecklist({
                  ...novoChecklist,
                  obrigatorio: e.target.checked,
                })
              }
            />{" "}
            Obrigatório
          </label>
          <button
            onClick={criarChecklist}
            disabled={salvando || !novoChecklist.item.trim()}
          >
            Adicionar
          </button>
        </div>
        <div className="org-card-list">
          {checklistFiltrado.map((item) => (
            <div
              key={item.id}
              className={`org-check-row ${item.concluido ? "done" : ""}`}
            >
              <button
                className="org-check-toggle"
                onClick={() => alternarChecklist(item)}
                aria-label={
                  item.concluido
                    ? "Marcar como pendente"
                    : "Marcar como concluído"
                }
              >
                {item.concluido ? "✓" : ""}
              </button>
              <div className="org-check-content">
                <h3>{item.item}</h3>
                <p>
                  {item.categoria} · {labelStatus(item.tipo)}{" "}
                  {item.obrigatorio ? "· obrigatório" : ""}
                </p>
              </div>
              <div className="org-row-actions">
                <button type="button" onClick={() => alternarChecklist(item)}>
                  {item.concluido ? "↩️ Reabrir" : "✅ Concluir"}
                </button>
                <button type="button" onClick={() => alterarChecklist(item)}>
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => excluirChecklist(item)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
          {checklistFiltrado.length === 0 && (
            <Empty text="Nenhum item de checklist encontrado. Use o checklist padrão ou adicione itens manualmente." />
          )}
        </div>
      </Panel>
    );
  }
}

function Metric({
  title,
  value,
  detail,
  danger,
}: {
  title: string;
  value: string | number;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className={`org-metric ${danger ? "danger" : ""}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="org-panel">
      <div className="org-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SubTabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="org-subtabs">
      {items.map((item) => (
        <button
          key={item}
          className={active === item ? "active" : ""}
          onClick={() => onChange(item)}
        >
          {labelStatus(item)}
        </button>
      ))}
    </div>
  );
}

function MiniRow({
  title,
  detail,
  status,
}: {
  title: string | null;
  detail: string;
  status: string;
}) {
  return (
    <div className="org-mini-row">
      <div>
        <strong>{title || "Sem título"}</strong>
        <span>{detail}</span>
      </div>
      <em className={`org-pill ${status}`}>{labelStatus(status)}</em>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="org-empty-inline">{text}</div>;
}

function filtrar<T>(
  items: T[],
  termo: string,
  campos: (item: T) => Array<string | number | boolean | null | undefined>,
) {
  if (!Array.isArray(items)) return [];
  if (!termo) return items;
  return items.filter((item) =>
    campos(item).some((campo) =>
      String(campo ?? "")
        .toLowerCase()
        .includes(termo),
    ),
  );
}

function limpar(value: string | null | undefined) {
  const clean = (value || "").trim();
  return clean || null;
}

function normalizarTelefone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function valorOuNull(value: string | number | null | undefined) {
  const parsed = toNumber(value);
  return String(value || "").trim() ? parsed : null;
}

function valorOuZero(value: string | number | null | undefined) {
  return toNumber(value);
}

function montarDataHoraDoEvento(evento: Evento, horario: string) {
  const dataBase = (evento.data_inicio || evento.data_evento || "").slice(0, 10);
  if (!dataBase || !horario) return null;

  const [hora, minuto] = horario.split(":");
  const data = new Date(
    `${dataBase}T${String(hora || "00").padStart(2, "0")}:${String(
      minuto || "00",
    ).padStart(2, "0")}:00-03:00`,
  );

  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

function datetimeOuNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function datetimeLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function formatarMoeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatarData(value: string | null | undefined) {
  if (!value) return "sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatarDataHora(value: string | null | undefined) {
  if (!value) return "sem horário";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem horário";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hora(value: string | null | undefined) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcularDiasRestantes(evento: Evento | null) {
  const raw = evento?.data_inicio || evento?.data_evento;
  if (!raw) return null;
  const date = new Date(raw + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatarDataEvento(evento: Evento) {
  const data = evento.data_inicio || evento.data_evento;
  const dia = data ? formatarData(data) : "Data não informada";
  const horaInicio = evento.hora_inicio
    ? String(evento.hora_inicio).slice(0, 5)
    : "";
  return horaInicio ? `${dia} às ${horaInicio}` : dia;
}

function normalizarStatusProducao(status: string | null | undefined) {
  if (status === "pendente") return "a_fazer";
  if (status === "atrasado") return "aguardando_terceiro";
  if (
    status === "ideia" ||
    status === "a_fazer" ||
    status === "em_andamento" ||
    status === "aguardando_terceiro" ||
    status === "concluido"
  )
    return status;
  return "a_fazer";
}

function isAtrasada(dataLimite: string | null, status: string | null) {
  if (!dataLimite || status === "concluido" || status === "cancelado")
    return false;
  const limite = new Date(dataLimite);
  limite.setHours(23, 59, 59, 999);
  return limite.getTime() < Date.now();
}

function labelCategoria(value: string | null | undefined) {
  const found = CATEGORIAS_FORNECEDOR.find((item) => item.value === value);
  return found?.label || labelStatus(value || "outros");
}

function labelCategoriaProducao(value?: string | null) {
  return (
    CATEGORIAS_PRODUCAO.find((categoria) => categoria.value === value)?.label ||
    "⭐ Outros"
  );
}

function labelStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    visao: "Visão Geral",
    planejamento: "Planejamento",
    execucao: "Execução",
    pendencias: "Pendências",
    producao: "Produção",
    fornecedores: "Fornecedores",
    contratacoes: "Contratações",
    financeiro: "Financeiro",
    roteiro: "Roteiro",
    equipe: "Equipe",
    checklist: "Checklist",
    pendente: "Pendente",
    ideia: "Ideias",
    a_fazer: "A fazer",
    aguardando_terceiro: "Aguardando terceiros",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    atrasado: "Atrasado",
    cancelado: "Cancelado",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
    urgente: "Urgente",
    orcamento: "Orçamento",
    negociando: "Negociando",
    contratado: "Contratado",
    confirmado: "Confirmado",
    dispensado: "Dispensado",
    parcial: "Parcial",
    pago: "Pago",
    vencido: "Vencido",
    convidado: "Convidado",
    presente: "Presente",
    ausente: "Ausente",
    dia_evento: "Dia do evento",
    montagem: "Montagem",
    desmontagem: "Desmontagem",
    outro: "Outro",
  };
  return labels[value || ""] || String(value || "").replace(/_/g, " ");
}

const styles = `
.organizacao-page { display: flex; flex-direction: column; gap: 22px; color: #0f172a; }
.org-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.org-eyebrow { color: #6d28d9; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
.org-header h1 { margin: 4px 0 6px; font-size: clamp(30px, 5vw, 48px); line-height: 1; letter-spacing: -.06em; }
.org-header p { margin: 0; color: #64748b; font-weight: 600; max-width: 720px; }
.org-event-select { min-width: 280px; padding: 14px; border-radius: 20px; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 14px 35px rgba(15,23,42,.05); }
.org-event-select label { display: block; font-size: 12px; font-weight: 900; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .08em; }
.org-event-select select, .org-toolbar input, .org-form-grid input, .org-form-grid select, .org-item-card select { width: 100%; border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px 13px; background: #fff; color: #0f172a; font-weight: 700; outline: none; }
.org-alert { padding: 14px 16px; border-radius: 18px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-weight: 800; }
.org-empty, .org-empty-inline { padding: 22px; border-radius: 20px; border: 1px dashed #cbd5e1; color: #64748b; font-weight: 800; background: #f8fafc; text-align: center; }
.org-summary-card { ${styleToCss(cardStyle)} display: flex; justify-content: space-between; gap: 18px; padding: 24px; align-items: center; }
.org-summary-card h2 { margin: 10px 0 6px; font-size: 28px; letter-spacing: -.04em; }
.org-summary-card p { margin: 0; color: #64748b; font-weight: 700; }
.org-badge, .org-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 900; background: #ede9fe; color: #5b21b6; text-transform: uppercase; letter-spacing: .04em; font-style: normal; }
.org-progress-box { min-width: 210px; }
.org-progress-box strong { font-size: 36px; letter-spacing: -.05em; display: block; }
.org-progress-box span, .org-muted { color: #64748b; font-weight: 700; }
.org-progress { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 10px; }
.org-progress.big { height: 14px; }
.org-progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6d28d9, #10b981); }
.org-metrics-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
.org-metric { ${styleToCss(cardStyle)} padding: 18px; min-height: 120px; display: flex; flex-direction: column; justify-content: space-between; }
.org-metric span { color: #64748b; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
.org-metric strong { font-size: 28px; letter-spacing: -.05em; }
.org-metric small { color: #64748b; font-weight: 700; }
.org-metric.danger strong { color: #dc2626; }
.org-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.org-toolbar input { max-width: 320px; }
.org-tabs, .org-subtabs { display: flex; flex-wrap: wrap; gap: 8px; }
.org-tabs button, .org-subtabs button, .org-form-grid button { border: 0; border-radius: 999px; padding: 12px 16px; background: #fff; color: #475569; font-weight: 900; cursor: pointer; border: 1px solid #e2e8f0; }
.org-tabs button.active, .org-subtabs button.active, .org-form-grid button { background: #6d28d9; color: #fff; border-color: #6d28d9; }
.org-form-grid button:disabled { opacity: .55; cursor: not-allowed; }
.org-subtabs { margin: -4px 0 0; }
.org-grid-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.org-panel { ${styleToCss(cardStyle)} padding: 20px; }
.org-panel-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.org-panel h2 { margin: 0; font-size: 22px; letter-spacing: -.04em; }
.org-panel p { margin: 4px 0 0; color: #64748b; font-weight: 700; }
.org-template-actions { display: grid; grid-template-columns: minmax(0, 1fr) 280px auto; gap: 12px; align-items: center; padding: 16px; border: 1px solid #e2e8f0; border-radius: 22px; background: #f8fafc; margin-bottom: 16px; }
.org-template-actions strong { display: block; color: #0f172a; font-size: 16px; font-weight: 950; }
.org-template-actions span { display: block; color: #64748b; font-weight: 800; margin-top: 4px; }
.org-template-actions select { width: 100%; border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px 13px; background: #fff; color: #0f172a; font-weight: 800; outline: none; }
.org-template-actions button { border: 0; border-radius: 999px; padding: 12px 18px; background: #6d28d9; color: #fff; font-weight: 950; cursor: pointer; white-space: nowrap; }
.org-template-actions button:disabled { opacity: .55; cursor: not-allowed; }
.org-form-grid { display: grid; gap: 10px; margin-bottom: 16px; }
.org-form-grid.five { grid-template-columns: 1.4fr 1fr .8fr .75fr auto; }
.org-form-grid.fornecedor { grid-template-columns: 1.3fr .8fr .8fr 1fr .8fr auto; }
.org-form-grid.contratacao { grid-template-columns: 1.2fr 1fr .75fr .75fr .75fr auto; }
.org-form-grid.roteiro { grid-template-columns: 1.2fr .9fr .9fr .9fr auto; }
.org-form-grid.equipe, .org-form-grid.checklist { grid-template-columns: 1fr 1fr .85fr .65fr auto; }
.org-card-list, .org-list { display: flex; flex-direction: column; gap: 10px; }
.org-item-card, .org-mini-row, .org-check-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid #e2e8f0; background: #fff; border-radius: 18px; padding: 14px; }
.org-checklist-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 14px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
.org-checklist-actions button { border: 0; border-radius: 999px; padding: 12px 16px; background: #6d28d9; color: #fff; font-weight: 900; cursor: pointer; }
.org-checklist-actions button:disabled { opacity: .55; cursor: not-allowed; }
.org-checklist-actions span { color: #64748b; font-weight: 800; font-size: 13px; }
.org-check-content { flex: 1; min-width: 0; }
.org-check-toggle { width: 32px; height: 32px; border-radius: 10px; border: 1px solid #cbd5e1; background: #fff; color: #16a34a; font-weight: 900; cursor: pointer; }
.org-row-actions, .org-card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.org-card-actions { justify-content: flex-end; }
.org-card-actions.compact { max-width: 460px; }
.org-item-main { min-width: 0; flex: 1; }
.org-row-actions button, .org-card-actions button { border: 1px solid #e2e8f0; background: #fff; color: #475569; border-radius: 999px; padding: 9px 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.org-row-actions button:disabled, .org-card-actions button:disabled { opacity: .55; cursor: not-allowed; }
.org-row-actions button.danger, .org-card-actions button.danger { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.org-item-card h3, .org-mini-row strong, .org-check-row h3 { margin: 6px 0 4px; font-size: 16px; letter-spacing: -.02em; }
.org-item-card p, .org-mini-row span, .org-check-row p { margin: 0; color: #64748b; font-weight: 700; font-size: 13px; }
.org-item-card select { max-width: 190px; }
.org-card-actions select { min-width: 165px; }
.org-pill.concluido, .org-pill.pago, .org-pill.confirmado, .org-pill.presente, .org-pill.contratado { background: #dcfce7; color: #166534; }
.org-pill.atrasado, .org-pill.vencido, .org-pill.alta, .org-pill.critica { background: #fee2e2; color: #991b1b; }
.org-pill.pendente, .org-pill.parcial, .org-pill.negociando, .org-pill.orcamento, .org-pill.media { background: #fef3c7; color: #92400e; }
.org-pill.cancelado, .org-pill.ausente, .org-pill.dispensado { background: #f1f5f9; color: #475569; }
.org-finance-values { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; min-width: 170px; }
.org-finance-values strong { font-size: 18px; }
.org-finance-values span { color: #64748b; font-weight: 800; font-size: 12px; }
.org-money-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.org-money-grid div { padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
.org-money-grid span { display: block; color: #64748b; font-weight: 900; font-size: 12px; text-transform: uppercase; }
.org-money-grid strong { display: block; margin-top: 8px; font-size: 20px; letter-spacing: -.04em; }
.org-timeline { display: flex; flex-direction: column; gap: 12px; }
.org-timeline-row { display: grid; grid-template-columns: 74px 16px 1fr; gap: 12px; align-items: start; }
.org-time { display: flex; flex-direction: column; align-items: flex-end; color: #475569; font-weight: 900; }
.org-time span { color: #94a3b8; font-size: 12px; }
.org-dot { width: 14px; height: 14px; border-radius: 999px; background: #6d28d9; margin-top: 4px; box-shadow: 0 0 0 5px #ede9fe; }
.org-timeline-row h3 { margin: 0 0 4px; font-size: 17px; }
.org-timeline-content .org-row-actions { margin-top: 10px; }
.org-timeline-row p, .org-timeline-row small { margin: 0; color: #64748b; font-weight: 700; }
.org-check { display: flex; align-items: center; gap: 8px; font-weight: 900; color: #475569; }
.org-check-row { width: 100%; text-align: left; cursor: pointer; }
.org-check-row span { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #cbd5e1; border-radius: 9px; color: #fff; font-weight: 900; flex: 0 0 auto; }
.org-check-row.done span { background: #16a34a; border-color: #16a34a; }
.org-check-row.done h3 { text-decoration: line-through; color: #64748b; }

.org-section-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; padding: 14px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
.org-section-toolbar strong { display: block; font-size: 15px; letter-spacing: -.02em; }
.org-section-toolbar span { display: block; color: #64748b; font-weight: 700; font-size: 13px; margin-top: 2px; }
.org-view-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 5px; border-radius: 999px; background: #fff; border: 1px solid #e2e8f0; }
.org-view-toggle button { border: 0; border-radius: 999px; padding: 9px 13px; background: transparent; color: #475569; font-weight: 900; cursor: pointer; }
.org-view-toggle button.active { background: #6d28d9; color: #fff; }
.org-form-grid.producao { grid-template-columns: 1.35fr .9fr .9fr .75fr .75fr 1fr auto; }
.org-kanban { display: grid; grid-template-columns: repeat(5, minmax(240px, 1fr)); gap: 12px; align-items: stretch; overflow-x: auto; padding-bottom: 6px; }
.org-kanban-column { min-width: 240px; border-radius: 22px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; }
.org-kanban-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.org-kanban-head strong { display: block; font-size: 15px; letter-spacing: -.02em; }
.org-kanban-head span { display: block; margin-top: 3px; color: #64748b; font-weight: 700; font-size: 12px; line-height: 1.35; }
.org-kanban-head em { min-width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: #fff; color: #0f172a; font-weight: 900; font-style: normal; border: 1px solid #e2e8f0; }
.org-kanban-list { display: flex; flex-direction: column; gap: 10px; }
.org-kanban-card { align-items: stretch; flex-direction: column; }
.org-kanban-card .org-card-actions { justify-content: flex-start; }
.org-calendar-list { display: flex; flex-direction: column; gap: 10px; }
.org-calendar-row { display: grid; grid-template-columns: 150px 1fr auto; gap: 12px; align-items: center; padding: 14px; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; }
.org-calendar-date { font-weight: 950; color: #6d28d9; }
.org-calendar-content strong { display: block; color: #0f172a; }
.org-calendar-content span { display: block; color: #64748b; font-weight: 700; font-size: 13px; margin-top: 3px; }
.org-calendar-row button { border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 9px 12px; font-weight: 900; cursor: pointer; }

.org-pill.ideia { background: #e0f2fe; color: #075985; }
.org-pill.a_fazer { background: #ede9fe; color: #5b21b6; }
.org-pill.aguardando_terceiro { background: #ffedd5; color: #9a3412; }


.org-trello-board { display: grid; grid-template-columns: repeat(5, minmax(280px, 1fr)); gap: 14px; align-items: stretch; overflow-x: auto; padding-bottom: 8px; }
.org-trello-column { min-width: 280px; border-radius: 24px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; }
.org-trello-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.org-trello-head strong { display: block; font-size: 16px; letter-spacing: -.02em; color: #0f172a; }
.org-trello-head span { display: block; margin-top: 3px; color: #64748b; font-weight: 750; font-size: 12px; line-height: 1.35; }
.org-trello-head em { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: #fff; color: #0f172a; font-weight: 950; font-style: normal; border: 1px solid #e2e8f0; }
.org-trello-list { display: flex; flex-direction: column; gap: 10px; }
.org-trello-column.drop-enabled { outline: 2px dashed rgba(124,58,237,.35); outline-offset: -6px; }
.org-trello-card { border: 1px solid #dbe3ef; border-radius: 18px; background: #fff; padding: 12px; box-shadow: 0 8px 18px rgba(15,23,42,.06); }
.org-trello-card.dragging { opacity: .55; transform: rotate(1deg); }
.org-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.org-category-tag, .org-priority-tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 8px; font-weight: 900; font-size: 11px; background: #ede9fe; color: #5b21b6; }
.org-priority-tag.alta, .org-priority-tag.urgente { background: #fee2e2; color: #991b1b; }
.org-priority-tag.media { background: #fef3c7; color: #92400e; }
.org-priority-tag.baixa { background: #dcfce7; color: #166534; }
.org-card-title-button { width: 100%; text-align: left; border: 0; background: transparent; padding: 0; color: #0f172a; cursor: pointer; font-weight: 950; font-size: 15px; line-height: 1.25; }
.org-card-title-button:hover { color: #6d28d9; }
.org-card-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; color: #64748b; font-weight: 800; font-size: 12px; }
.org-card-meta .danger { color: #b91c1c; background: #fee2e2; border-radius: 999px; padding: 2px 6px; }
.org-card-footer-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.org-card-footer-actions button, .org-quick-card button, .org-actions-table button { border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 7px 9px; font-size: 12px; font-weight: 900; cursor: pointer; color: #334155; }
.org-card-footer-actions button:hover, .org-quick-card button:hover, .org-actions-table button:hover { border-color: #7c3aed; color: #6d28d9; }
.org-quick-card { border: 1px dashed #cbd5e1; border-radius: 18px; padding: 10px; background: rgba(255,255,255,.75); display: grid; gap: 8px; }
.org-quick-card input, .org-quick-card select { width: 100%; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px; font-weight: 800; background: #fff; color: #0f172a; }
.org-actions-table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; }
.org-actions-table { width: 100%; border-collapse: collapse; min-width: 980px; }
.org-actions-table th, .org-actions-table td { text-align: left; padding: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 750; }
.org-actions-table th { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; background: #f8fafc; }
.org-actions-table tr:last-child td { border-bottom: 0; }
.org-danger-text { color: #b91c1c !important; font-weight: 950 !important; }
.org-timeline-view { position: relative; display: flex; flex-direction: column; gap: 14px; padding-left: 20px; }
.org-timeline-view:before { content: ""; position: absolute; left: 35px; top: 10px; bottom: 10px; width: 3px; border-radius: 999px; background: linear-gradient(180deg, #7c3aed, #14b8a6); }
.org-timeline-item { position: relative; display: grid; grid-template-columns: 52px 1fr; gap: 12px; align-items: stretch; }
.org-timeline-marker { position: relative; z-index: 1; display: flex; justify-content: center; padding-top: 14px; }
.org-timeline-marker span { width: 34px; height: 34px; border-radius: 999px; background: #fff; border: 3px solid #7c3aed; display: inline-flex; align-items: center; justify-content: center; font-weight: 950; color: #6d28d9; }
.org-timeline-card { border: 1px solid #e2e8f0; border-radius: 22px; background: #fff; padding: 16px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; box-shadow: 0 10px 24px rgba(15,23,42,.05); }
.org-timeline-card h3 { margin: 5px 0; color: #0f172a; }
.org-timeline-card p { margin: 0; color: #64748b; font-weight: 800; }
.org-timeline-date { color: #6d28d9; font-weight: 950; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
.org-without-date { border: 1px dashed #cbd5e1; border-radius: 20px; padding: 14px 16px; background: #f8fafc; display: flex; flex-direction: column; gap: 3px; color: #64748b; font-weight: 800; }
.org-without-date strong { color: #0f172a; }
.org-modal-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
.org-card-modal { width: min(1120px, 96vw); max-height: 90vh; overflow: auto; background: #f8fafc; border-radius: 26px; border: 1px solid #e2e8f0; box-shadow: 0 30px 80px rgba(15,23,42,.3); display: grid; grid-template-columns: 1fr 280px; }
.org-card-modal-main { padding: 28px; position: relative; }
.org-card-modal-main h2 { margin: 12px 0 4px; color: #0f172a; font-size: 30px; line-height: 1.1; }
.org-modal-close { position: absolute; top: 18px; right: 18px; width: 38px; height: 38px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-size: 24px; }
.org-modal-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 20px 0; }
.org-modal-fields label { display: flex; flex-direction: column; gap: 6px; color: #64748b; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.org-modal-fields select, .org-modal-fields input { border: 1px solid #e2e8f0; border-radius: 14px; padding: 11px 12px; background: #fff; color: #0f172a; font-weight: 900; text-transform: none; letter-spacing: 0; }
.org-card-title-input { width: 100%; border: 2px solid transparent; border-radius: 14px; background: transparent; color: #0f172a; font-size: 30px; line-height: 1.1; font-weight: 950; letter-spacing: -.04em; padding: 8px 10px; margin: 10px 0 2px; outline: none; }
.org-card-title-input:focus { border-color: #7c3aed; background: #fff; }
.org-description-input { width: 100%; min-height: 100px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; color: #0f172a; font-weight: 750; resize: vertical; outline: none; }
.org-description-input:focus { border-color: #7c3aed; }
.org-card-checklist-input { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 12px; }
.org-card-checklist-input input { border: 1px solid #e2e8f0; border-radius: 14px; padding: 11px 12px; font-weight: 800; outline: none; }
.org-card-checklist-input input:focus { border-color: #7c3aed; }
.org-card-checklist-input button, .org-card-checklist-row button { border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 9px 11px; font-weight: 900; cursor: pointer; }
.org-card-checklist-row { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid #f1f5f9; color: #334155; font-weight: 850; }
.org-card-checklist-row .done { text-decoration: line-through; color: #94a3b8; }
.org-card-checklist-row .danger { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
.org-modal-section { margin-top: 18px; padding: 16px; border-radius: 18px; background: #fff; border: 1px solid #e2e8f0; }
.org-modal-section h3 { margin: 0 0 8px; color: #0f172a; }
.org-modal-section p { margin: 4px 0; color: #475569; font-weight: 750; }
.org-card-modal-sidebar { border-left: 1px solid #e2e8f0; padding: 24px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
.org-card-modal-sidebar strong { color: #0f172a; font-size: 16px; margin-bottom: 6px; }
.org-card-modal-sidebar button { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 14px; padding: 12px; text-align: left; font-weight: 900; cursor: pointer; color: #334155; }
.org-card-modal-sidebar button:hover { border-color: #7c3aed; color: #6d28d9; }
.org-card-modal-sidebar button.danger { color: #b91c1c; }


.org-section-title { margin-top: 24px; margin-bottom: 12px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.org-section-title h3 { margin: 4px 0 0; font-size: 16px; color: #0f172a; }
.contratacoes-resumo { margin-bottom: 18px; }
.org-contract-groups { display: grid; gap: 16px; margin-top: 20px; }
.org-contract-group { border: 1px solid rgba(226,232,240,0.95); border-radius: 20px; background: rgba(255,255,255,0.86); padding: 16px; }
.org-contract-header, .org-service-card { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.org-contract-header h3, .org-service-card h4 { margin: 8px 0 4px; color: #0f172a; }
.org-service-list { display: grid; gap: 12px; margin-top: 14px; }
.org-service-card { border: 1px solid rgba(226,232,240,0.9); border-radius: 16px; padding: 14px; background: #f8fafc; }
.compact-values { min-width: 140px; text-align: right; }
.roteiro-com-checklist .org-timeline-content { width: 100%; }
.org-roteiro-checklist { margin-top: 14px; border: 1px solid rgba(226,232,240,0.95); border-radius: 16px; padding: 14px; background: rgba(248,250,252,0.82); }
.org-roteiro-checklist-head { display: grid; gap: 8px; margin-bottom: 10px; }
.org-roteiro-checklist-head > div:first-child { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.org-progress.mini { height: 7px; border-radius: 999px; }
.org-roteiro-checklist-list { display: grid; gap: 8px; }
.org-roteiro-check { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; padding: 8px; border-radius: 12px; background: white; border: 1px solid rgba(226,232,240,0.7); }
.org-roteiro-check.done span { text-decoration: line-through; color: #64748b; }
.org-check-toggle.small { width: 24px; height: 24px; min-width: 24px; border-radius: 8px; }
.org-inline-add-check { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 10px; }
.org-inline-add-check input { min-width: 0; }

@media (max-width: 1100px) { .org-template-actions { grid-template-columns: 1fr; } .org-metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .org-form-grid, .org-form-grid.five, .org-form-grid.fornecedor, .org-form-grid.contratacao, .org-form-grid.roteiro, .org-form-grid.equipe, .org-form-grid.checklist, .org-form-grid.producao { grid-template-columns: 1fr 1fr; } }
.org-agenda-modal { width: min(860px, 94vw); max-height: 90vh; overflow: auto; background: #fff; border-radius: 26px; border: 1px solid #e2e8f0; box-shadow: 0 30px 80px rgba(15,23,42,.3); padding: 28px; }
.org-agenda-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
.org-agenda-modal-header h2 { margin: 4px 0 6px; color: #0f172a; font-size: 28px; line-height: 1.1; }
.org-agenda-modal-header p { margin: 0; color: #64748b; font-weight: 800; }
.org-modal-close.static { position: static; flex: 0 0 auto; }
.org-agenda-modal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.org-agenda-modal-grid label { display: flex; flex-direction: column; gap: 7px; color: #64748b; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.org-agenda-modal-grid label.full { grid-column: 1 / -1; }
.org-agenda-modal-grid input, .org-agenda-modal-grid select, .org-agenda-modal-grid textarea { width: 100%; border: 1px solid #dbe4f0; border-radius: 16px; padding: 13px 14px; background: #fff; color: #0f172a; font-size: 15px; font-weight: 850; text-transform: none; letter-spacing: 0; outline: none; }
.org-agenda-modal-grid input:focus, .org-agenda-modal-grid select:focus, .org-agenda-modal-grid textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
.org-agenda-modal-grid textarea { min-height: 120px; resize: vertical; }
.org-agenda-modal-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
.org-agenda-modal-actions button { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 14px; padding: 12px 16px; font-weight: 950; cursor: pointer; color: #334155; }
.org-agenda-modal-actions button.primary { border-color: #7c3aed; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; }
.org-agenda-modal-actions button.secondary { background: #fff; }
.org-agenda-modal-actions button.danger { color: #b91c1c; background: #fff; border-color: rgba(185,28,28,.22); }
.org-agenda-modal-actions button:disabled { opacity: .55; cursor: not-allowed; }

@media (max-width: 760px) { .org-card-modal { grid-template-columns: 1fr; } .org-card-modal-sidebar { border-left: 0; border-top: 1px solid #e2e8f0; } .org-modal-fields, .org-agenda-modal-grid { grid-template-columns: 1fr; } .org-timeline-card { flex-direction: column; } .org-header, .org-summary-card, .org-toolbar, .org-item-card, .org-mini-row, .org-checklist-actions { flex-direction: column; align-items: stretch; } .org-event-select, .org-toolbar input { max-width: none; width: 100%; } .org-metrics-grid, .org-grid-two, .org-money-grid { grid-template-columns: 1fr; } .org-form-grid, .org-form-grid.five, .org-form-grid.fornecedor, .org-form-grid.contratacao, .org-form-grid.roteiro, .org-form-grid.equipe, .org-form-grid.checklist, .org-form-grid.producao { grid-template-columns: 1fr; } .org-check-row { align-items: flex-start; } .org-row-actions, .org-card-actions { width: 100%; justify-content: flex-end; } .org-item-card select { max-width: none; } .org-finance-values { align-items: flex-start; } }

@media (max-width: 760px) { .org-contract-header, .org-service-card { display: grid; } .compact-values { text-align: left; } .org-inline-add-check { grid-template-columns: 1fr; } }
`;

function styleToCss(style: React.CSSProperties) {
  return Object.entries(style)
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${value};`,
    )
    .join("");
}
