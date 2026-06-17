"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AbaOrganizacao =
  | "visao"
  | "equipe"
  | "fornecedores"
  | "servicos"
  | "producao"
  | "roteiro"
  | "pendencias"
  | "financeiro";
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
  evento_id: string | null;
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
  categoria: string | null;
  responsavel_nome?: string | null;
  responsavel_telefone?: string | null;
  telefone: string | null;
  telefone_normalizado: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  tipo_pessoa?: string | null;
  logradouro: string | null;
  cep?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  site: string | null;
  instagram: string | null;
  pix_tipo?: string | null;
  pix_chave: string | null;
  banco?: string | null;
  agencia?: string | null;
  agencia_digito?: string | null;
  conta?: string | null;
  conta_digito?: string | null;
  codigo_externo?: string | null;
  observacoes: string | null;
  ativo: boolean;
  eh_cliente?: boolean;
  eh_fornecedor?: boolean;
  eh_equipe?: boolean;
  responsavel_tenant_contato_id?: string | null;
  nucleo_id?: string | null;
};

type OrganizacaoCadastro = Fornecedor;

type TenantContato = {
  id: string;
  tenant_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
};

type FornecedorEvento = {
  id: string;
  tenant_id: string;
  evento_id: string;
  cadastro_id: string;
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
  status_aprovacao: "orcamento" | "aprovado" | "cancelado" | string;
  unidade: string | null;
  quantidade: number | null;
  forma_pagamento: string | null;
  orcamento_url: string | null;
  contrato_url: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  nf_numero: string | null;
  nf_data: string | null;
  nf_valor: number | null;
};

type OrganizacaoCliente = {
  id: string;
  tenant_id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  logradouro: string | null;
  observacoes: string | null;
  criado_em: string;
};

type Parcela = {
  id: string;
  tenant_id: string;
  evento_id: string;
  contratacao_id: string | null;
  numero: number;
  descricao: string | null;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "atrasado" | string;
  forma_pagamento: string | null;
  documento: string | null;
  observacoes: string | null;
  criado_em: string;
  // campos financeiros
  competencia: string | null;
  data_emissao: string | null;
  cliente: string | null;
  cadastro_cliente_id: string | null;
  cadastro_fornecedor_id: string | null;
  tipo: "receber" | "pagar" | string;
  plano_de_contas: string | null;
  empresa: string | null;
  conta_corrente: string | null;
  centro_de_custo: string | null;
  historico: string | null;
  numero_doc: string | null;
};

type FornecedorServico = {
  id: string;
  tenant_id: string;
  fornecedor_id: string;
  titulo: string;
  descricao: string | null;
  unidade: string | null;
  preco_custo: number;
  preco_venda: number;
  ativo: boolean;
  criado_em: string;
};

type ContratacaoItem = {
  id: string;
  tenant_id: string;
  contratacao_id: string;
  titulo: string;
  quantidade_item: number;
  unidade: string | null;
  quantidade: number;
  preco_custo: number;
  preco_venda: number;
  aprovado: boolean;
  criado_em: string;
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

type FornecedorEquipeMembro = {
  id: string;
  tenant_id: string;
  fornecedor_id: string;
  evento_id: string | null;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  status: string;
  horario_inicio: string | null;
  horario_fim: string | null;
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

const fornecedorVazio = {
  tipo_pessoa: "fisica",
  nome: "",
  categoria: "buffet",
  responsavel_nome: "",
  responsavel_telefone: "",
  responsavel_tenant_contato_id: null as string | null,
  telefone: "",
  email: "",
  documento: "",
  codigo_externo: "",
  endereco: "",
  cep: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  instagram: "",
  pix_tipo: "",
  pix: "",
  banco: "",
  agencia: "",
  agencia_digito: "",
  conta: "",
  conta_digito: "",
  observacoes: "",
  status: "orcamento",
};

const abasFornecedorModal = ["principais", "endereco", "financeiro", "observacao"] as const;
const abaFornecedorModalLabel: Record<typeof abasFornecedorModal[number], string> = {
  principais: "Dados Principais",
  endereco: "Endereço",
  financeiro: "Financeiro",
  observacao: "Observação",
};

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
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "24px",
  boxShadow: "var(--shadow-card)",
};

export default function OrganizacaoPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [producao, setProducao] = useState<AcaoProducao[]>([]);
  const [checklist, setChecklist] = useState<Checklist[]>([]);
  const [fornecedoresEvento, setFornecedoresEvento] = useState<
    FornecedorEvento[]
  >([]);
  const [fornecedoresCadastrados, setFornecedoresCadastrados] = useState<Fornecedor[]>([]);
  const [clientesCadastrados, setClientesCadastrados] = useState<OrganizacaoCliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);
  const [contratacoes, setContratacoes] = useState<Contratacao[]>([]);
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [fornecedorEquipe, setFornecedorEquipe] = useState<FornecedorEquipeMembro[]>([]);
  const [fornecedorEquipeForm, setFornecedorEquipeForm] = useState<Record<string, { nome: string; funcao: string; telefone: string; horario_inicio: string; horario_fim: string }>>({});
  const [fornecedorEquipeSalvando, setFornecedorEquipeSalvando] = useState(false);
  const [fornecedorEquipeEditando, setFornecedorEquipeEditando] = useState<string | null>(null);
  const [fornecedorEquipeEditForm, setFornecedorEquipeEditForm] = useState<{ nome: string; funcao: string; telefone: string; horario_inicio: string; horario_fim: string }>({ nome: "", funcao: "", telefone: "", horario_inicio: "", horario_fim: "" });
  const [fornecedorExpandido, setFornecedorExpandido] = useState<string | null>(null);
  const [fornecedorAba, setFornecedorAba] = useState<Record<string, "dados" | "equipe" | "servicos">>({});
  const [novoServico, setNovoServico] = useState<Record<string, { titulo: string; valor_contratado: string; valor_pago: string; data_vencimento: string; status: string }>>({});
  const [contratacaoItens, setContratacaoItens] = useState<ContratacaoItem[]>([]);
  const [contratacaoEdits, setContratacaoEdits] = useState<Record<string, { qtd: string; unidade: string }>>({});
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [nfModal, setNfModal] = useState<string | null>(null); // contratacao id
  const [nfForm, setNfForm] = useState<{ nf_numero: string; nf_data: string; nf_valor: string }>({ nf_numero: "", nf_data: "", nf_valor: "" });
  const [parcelaModal, setParcelaModal] = useState<string | null>(null); // contratacao id
  const [parcelaModalTitulo, setParcelaModalTitulo] = useState<string>("");
  const [parcelaForm, setParcelaForm] = useState<{ numero_parcelas: string; valor_total: string; data_inicio: string; forma_pagamento: string; documento: string }>({ numero_parcelas: "1", valor_total: "", data_inicio: "", forma_pagamento: "", documento: "" });
  const [parcelasPreview, setParcelasPreview] = useState<{ data: string; valor: string; descricao: string }[]>([]);
  const [liquidando, setLiquidando] = useState<Record<string, string>>({}); // parcelaId → data_pagamento
  const [confirmarDialog, setConfirmarDialog] = useState<{ mensagem: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string } | null>(null);
  const [novaParcelaModal, setNovaParcelaModal] = useState(false);
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [novoFornecedorParcelaModal, setNovoFornecedorParcelaModal] = useState(false);
  const [novoFornecedorParcela, setNovoFornecedorParcela] = useState({ nome: "", categoria: "buffet", responsavel_nome: "", telefone: "", email: "", documento: "", endereco: "", instagram: "", pix: "", conta_corrente: "", observacoes: "" });
  const [novaParcelaForm, setNovaParcelaForm] = useState({
    numero_doc: "", competencia: "", data_emissao: "", data_vencimento: "",
    numero_parcelas: "1", valor: "", cliente: "", plano_de_contas: "",
    empresa: "", conta_corrente: "", centro_de_custo: "", historico: "",
    forma_pagamento: "", documento: "",
  });
  const [financeiroSubAba, setFinanceiroSubAba] = useState<"receber" | "pagar">("receber");
  const [novaParcelaPagarModal, setNovaParcelaPagarModal] = useState(false);
  const [fornecedorDropdownAberto, setFornecedorDropdownAberto] = useState(false);
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState<string | null>(null);
  const [novoFornecedorPagarModal, setNovoFornecedorPagarModal] = useState(false);
  const [novoFornecedorParcelaForm, setNovoFornecedorParcelaForm] = useState({ nome: "", documento: "", telefone: "", email: "", endereco: "", observacoes: "" });
  const [novaParcelaPagarForm, setNovaParcelaPagarForm] = useState({
    numero_doc: "", competencia: "", data_emissao: "", data_vencimento: "",
    numero_parcelas: "1", valor: "", fornecedor: "", plano_de_contas: "",
    empresa: "", conta_corrente: "", centro_de_custo: "", historico: "",
    forma_pagamento: "", documento: "",
  });

  function pedirConfirmacao(mensagem: string, confirmLabel?: string): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmarDialog({
        mensagem,
        confirmLabel,
        onConfirm: () => { setConfirmarDialog(null); resolve(true); },
        onCancel: () => { setConfirmarDialog(null); resolve(false); },
      });
    });
  }
  const [fornecedorServicos, setFornecedorServicos] = useState<FornecedorServico[]>([]);
  const [novoFornecedorServico, setNovoFornecedorServico] = useState<Record<string, { titulo: string; descricao: string; unidade: string; preco_custo: string; preco_venda: string }>>({});
  const [servicoExpandido, setServicoExpandido] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState<Record<string, { titulo: string; quantidade_item: string; unidade: string; quantidade: string; preco_custo: string; preco_venda: string }>>({});
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
  const [quickAddAberto, setQuickAddAberto] = useState<Record<string, boolean>>(
    {},
  );

  const [novaAcaoRapida, setNovaAcaoRapida] = useState<
    Record<string, { titulo: string; categoria: string }>
  >({});
  const [acaoAberta, setAcaoAberta] = useState<AcaoProducao | null>(null);
  const [acaoArrastadaId, setAcaoArrastadaId] = useState<string | null>(null);
  const [novoChecklistCartao, setNovoChecklistCartao] = useState<
    Record<string, string>
  >({});
  const [novoChecklistRoteiro, setNovoChecklistRoteiro] = useState<
    Record<string, string>
  >({});
  const [fornecedorFormAberto, setFornecedorFormAberto] = useState(false);
  const [vincularFornecedorAberto, setVincularFornecedorAberto] = useState(false);
  const [fornecedorEditandoId, setFornecedorEditandoId] = useState<string | null>(null);
  const [novoFornecedor, setNovoFornecedor] = useState({ ...fornecedorVazio });
  const [fornecedorAbaModal, setFornecedorAbaModal] = useState<"principais" | "endereco" | "financeiro" | "observacao">("principais");
  const [tenantContatos, setTenantContatos] = useState<TenantContato[]>([]);
  const [responsavelDropdownAberto, setResponsavelDropdownAberto] = useState(false);
  const [responsavelNovoModal, setResponsavelNovoModal] = useState(false);
  const [responsavelNovoForm, setResponsavelNovoForm] = useState({ nome: "", telefone: "", email: "" });
  const [buscandoCepFornecedor, setBuscandoCepFornecedor] = useState(false);
  const [buscandoCnpjFornecedor, setBuscandoCnpjFornecedor] = useState(false);
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
  const [menuEquipeAberto, setMenuEquipeAberto] = useState(false);
  const [cadastroEquipeAberto, setCadastroEquipeAberto] = useState(false);
  const [abaCadastroEquipe, setAbaCadastroEquipe] = useState<"interna" | "fornecedores">("interna");
  const [etapaEquipe, setEtapaEquipe] = useState<1 | 2>(1);
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
      const agendaItemId = item.agenda_item_id
        ? String(item.agenda_item_id)
        : "";
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
      fornecedoresCadastradosRes,
      contratacoesRes,
      equipeRes,
      agendaRes,
      fornecedorEquipeRes,
      contratacaoItensRes,
      fornecedorServicosRes,
      parcelasRes,
      clientesCadastradosRes,
      tenantContatosRes,
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
        .from("organizacao_cadastros")
        .select("*")
        .eq("tenant_id", evento.tenant_id)
        .eq("eh_fornecedor", true)
        .order("nome", { ascending: true }),
      supabase
        .from("organizacao_contratacoes")
        .select("*")
        .eq("evento_id", eventoId)
        .order("data_vencimento", { ascending: true, nullsFirst: false }),
      supabase
        .from("organizacao_equipe")
        .select("*")
        .eq("tenant_id", evento.tenant_id)
        .order("contato_principal", { ascending: false }),
      supabase
        .from("event_agenda_items")
        .select(
          "id, evento_id, tenant_id, titulo, descricao, categoria, data_inicio, data_fim, status, responsavel, cor",
        )
        .eq("evento_id", eventoId)
        .order("data_inicio", { ascending: true, nullsFirst: false }),
      supabase
        .from("organizacao_fornecedor_equipe")
        .select("*")
        .eq("evento_id", eventoId)
        .order("criado_em", { ascending: true }),
      supabase
        .from("organizacao_contratacao_itens")
        .select("*")
        .eq("tenant_id", evento.tenant_id)
        .order("criado_em", { ascending: true }),
      supabase
        .from("organizacao_fornecedor_servicos")
        .select("*")
        .eq("tenant_id", evento.tenant_id)
        .order("criado_em", { ascending: true }),
      supabase
        .from("organizacao_parcelas")
        .select("*")
        .eq("evento_id", eventoId)
        .order("data_vencimento", { ascending: true, nullsFirst: false }),
      supabase
        .from("organizacao_cadastros")
        .select("*")
        .eq("tenant_id", evento.tenant_id)
        .eq("eh_cliente", true)
        .order("nome", { ascending: true }),
      supabase
        .from("tenant_contatos")
        .select("id, tenant_id, nome, telefone, email")
        .eq("tenant_id", evento.tenant_id)
        .order("nome", { ascending: true }),
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
    if (fornecedoresCadastradosRes.error)
      setErro(
        "Erro ao carregar cadastro de fornecedores: " +
          fornecedoresCadastradosRes.error.message,
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
      new Set(vinculos.map((v) => v.cadastro_id).filter(Boolean)),
    );
    let fornecedoresPorId: Record<string, Fornecedor> = {};

    if (fornecedorIds.length > 0) {
      const { data: fornecedoresData } = await supabase
        .from("organizacao_cadastros")
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
    const fornecedoresFixos = (fornecedoresCadastradosRes.data || []) as Fornecedor[];
    setFornecedoresCadastrados(fornecedoresFixos);
    setClientesCadastrados((clientesCadastradosRes.data || []) as OrganizacaoCliente[]);
    setFornecedoresEvento(
      vinculos.map((vinculo) => ({
        ...vinculo,
        fornecedor:
          fornecedoresPorId[vinculo.cadastro_id] ||
          fornecedoresFixos.find((fornecedor) => fornecedor.id === vinculo.cadastro_id) ||
          null,
      })),
    );
    setContratacoes((contratacoesRes.data || []) as Contratacao[]);
    setEquipe((equipeRes.data || []) as Equipe[]);
    setAgenda((agendaRes.data || []) as AgendaItem[]);
    setFornecedorEquipe((fornecedorEquipeRes.data || []) as FornecedorEquipeMembro[]);
    setContratacaoItens((contratacaoItensRes.data || []) as ContratacaoItem[]);
    setFornecedorServicos((fornecedorServicosRes.data || []) as FornecedorServico[]);
    setParcelas((parcelasRes.data || []) as Parcela[]);
    setTenantContatos((tenantContatosRes.data || []) as TenantContato[]);
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

  const fornecedoresParaSelecao = useMemo(() => {
    return filtrar<Fornecedor>(fornecedoresCadastrados, termoBusca, (fornecedor) => [
      fornecedor.nome,
      fornecedor.responsavel_nome,
      fornecedor.telefone,
      fornecedor.email,
      fornecedor.categoria,
    ]);
  }, [fornecedoresCadastrados, termoBusca]);
  const contratacoesFiltradas = filtrar<Contratacao>(
    contratacoes,
    termoBusca,
    (c) => [c.titulo, c.status, c.forma_pagamento],
  );
  const chaveEquipe = (item: Pick<Equipe, "nome" | "telefone">) => {
    const telefone = (item.telefone || "").replace(/\D/g, "");
    return telefone || item.nome.trim().toLowerCase();
  };

  const equipeParaSelecao = useMemo(() => {
    const porChave = new Map<string, Equipe>();

    equipe.forEach((item) => {
      const chave = chaveEquipe(item);
      const atual = porChave.get(chave);
      const itemDoEventoAtual = item.evento_id === eventoAtual?.id;
      const atualDoEventoAtual = atual?.evento_id === eventoAtual?.id;

      if (!atual || (itemDoEventoAtual && !atualDoEventoAtual)) {
        porChave.set(chave, item);
      }
    });

    return filtrar<Equipe>(Array.from(porChave.values()), termoBusca, (e) => [
      e.nome,
      e.funcao,
      e.telefone,
      e.status,
    ]);
  }, [equipe, eventoAtual?.id, termoBusca]);

  const equipeDoEvento = equipeParaSelecao.filter(
    (item) => item.evento_id === eventoAtual?.id,
  );

  const equipeFiltrada = equipeDoEvento;
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
      evento_id: null,
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
      evento_id: null,
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
      valor === null || String(valor).trim() === ""
        ? null
        : String(valor).trim();

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
      prev && prev.id === acao.id
        ? ({ ...prev, ...patch } as AcaoProducao)
        : prev,
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
    const concluido_em =
      status === "concluido" ? new Date().toISOString() : null;
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
    const input = document.getElementById(
      `org-card-date-${acao.id}`,
    ) as HTMLInputElement | null;
    input?.focus();
    (input as any)?.showPicker?.();
  }

  function abrirEdicaoEtiqueta(acao: AcaoProducao) {
    const categorias = CATEGORIAS_PRODUCAO.map(
      (c) => `${c.value} = ${c.label}`,
    ).join("\n");
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
      .map(
        (item) =>
          `${item.cadastro_id} = ${item.fornecedor?.nome || "Fornecedor"}`,
      )
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
    if (!await pedirConfirmacao(`Excluir a ação "${acao.titulo}"?`)) return;
    const { error } = await supabase.from("organizacao_producao").delete().eq("id", acao.id);
    await depoisSalvar(error);
  }

  function camposFornecedorParaSalvar() {
    return {
      eh_fornecedor: true,
      tipo_pessoa: novoFornecedor.tipo_pessoa,
      nome: novoFornecedor.nome.trim(),
      categoria: novoFornecedor.categoria,
      responsavel_nome: limpar(novoFornecedor.responsavel_nome),
      responsavel_telefone: limpar(novoFornecedor.responsavel_telefone),
      responsavel_tenant_contato_id: novoFornecedor.responsavel_tenant_contato_id || null,
      telefone: limpar(novoFornecedor.telefone),
      telefone_normalizado: normalizarTelefone(novoFornecedor.telefone),
      email: limpar(novoFornecedor.email),
      cpf_cnpj: limpar(novoFornecedor.documento),
      codigo_externo: limpar(novoFornecedor.codigo_externo),
      logradouro: limpar(novoFornecedor.endereco),
      cep: limpar(novoFornecedor.cep),
      numero: limpar(novoFornecedor.numero),
      complemento: limpar(novoFornecedor.complemento),
      bairro: limpar(novoFornecedor.bairro),
      cidade: limpar(novoFornecedor.cidade),
      instagram: limpar(novoFornecedor.instagram),
      pix_tipo: limpar(novoFornecedor.pix_tipo),
      pix_chave: limpar(novoFornecedor.pix),
      banco: limpar(novoFornecedor.banco),
      agencia: limpar(novoFornecedor.agencia),
      agencia_digito: limpar(novoFornecedor.agencia_digito),
      conta: limpar(novoFornecedor.conta),
      conta_digito: limpar(novoFornecedor.conta_digito),
      observacoes: limpar(novoFornecedor.observacoes),
    };
  }

  async function vincularNucleoEmpresa(
    cadastroId: string,
    nomeEmpresa: string,
    tenantContatoId: string | null,
  ) {
    if (!tenantId || !nomeEmpresa.trim()) return;

    const nomeBusca = nomeEmpresa.trim();

    let nucleoId: string | null = null;

    const { data: nucleoExistente } = await supabase
      .from("contato_grupos")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("tipo_nucleo", "empresa")
      .ilike("nome", nomeBusca)
      .maybeSingle();

    if (nucleoExistente?.id) {
      nucleoId = nucleoExistente.id;
    } else {
      const { data: nucleoCriado, error: nucleoError } = await supabase
        .from("contato_grupos")
        .insert({
          tenant_id: tenantId,
          nome: nomeBusca,
          tipo_nucleo: "empresa",
          tipo: "organizacao",
          origem: "organizacao",
        })
        .select("id")
        .single();

      if (nucleoError || !nucleoCriado?.id) return;
      nucleoId = nucleoCriado.id;
    }

    if (!nucleoId) return;

    await supabase
      .from("organizacao_cadastros")
      .update({ nucleo_id: nucleoId })
      .eq("id", cadastroId);

    if (tenantContatoId) {
      const { data: membroExistente } = await supabase
        .from("contato_grupo_membros")
        .select("id")
        .eq("grupo_contato_id", nucleoId)
        .eq("tenant_contato_id", tenantContatoId)
        .maybeSingle();

      if (!membroExistente?.id) {
        await supabase.from("contato_grupo_membros").insert({
          tenant_id: tenantId,
          grupo_contato_id: nucleoId,
          tenant_contato_id: tenantContatoId,
          papel: "responsavel",
          papel_nucleo: "responsavel",
          recebe_comunicacao: true,
          principal_envio: true,
        });
      }
    }
  }

  async function criarResponsavelContato() {
    if (!tenantId || !responsavelNovoForm.nome.trim()) return;
    setSalvando(true);
    const { data: contato, error } = await supabase
      .from("tenant_contatos")
      .insert({
        tenant_id: tenantId,
        nome: responsavelNovoForm.nome.trim(),
        telefone: limpar(responsavelNovoForm.telefone),
        telefone_normalizado: normalizarTelefone(responsavelNovoForm.telefone),
        email: limpar(responsavelNovoForm.email),
        tipo_contato: "adulto",
        origem: "organizacao",
      })
      .select("id, tenant_id, nome, telefone, email")
      .single();

    if (error || !contato) {
      setErro("Erro ao criar contato: " + (error?.message || ""));
      setSalvando(false);
      return;
    }

    setTenantContatos((prev) => [...prev, contato as TenantContato]);
    setNovoFornecedor((prev) => ({
      ...prev,
      responsavel_nome: contato.nome,
      responsavel_telefone: contato.telefone ? mascararTelefone(contato.telefone) : "",
      responsavel_tenant_contato_id: contato.id,
    }));
    setResponsavelNovoModal(false);
    setSalvando(false);
  }

  async function vincularCadastroAoEvento(cadastroId: string) {
    if (!eventoAtual || !tenantId) return;
    const jaVinculado = fornecedoresEvento.some(
      (item) => item.cadastro_id === cadastroId && item.evento_id === eventoAtual.id,
    );
    if (jaVinculado) return;
    await supabase.from("organizacao_fornecedores_evento").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      cadastro_id: cadastroId,
      categoria_evento: novoFornecedor.categoria,
      status: novoFornecedor.status,
    });
  }

  async function criarFornecedor() {
    if (!eventoAtual || !tenantId || !novoFornecedor.nome.trim()) return;

    const nomeBusca = novoFornecedor.nome.trim();
    const documentoBusca = limpar(novoFornecedor.documento);
    const { data: possiveisDuplicados } = await supabase
      .from("organizacao_cadastros")
      .select("id, nome, cpf_cnpj")
      .eq("tenant_id", tenantId)
      .or(
        documentoBusca
          ? `nome.ilike.${nomeBusca},cpf_cnpj.eq.${documentoBusca}`
          : `nome.ilike.${nomeBusca}`,
      );

    if (possiveisDuplicados && possiveisDuplicados.length > 0) {
      const existente = possiveisDuplicados[0];
      const atualizar = await pedirConfirmacao(
        `Já existe um cadastro com esse nome/documento: "${existente.nome}". Não é permitido cadastrar a mesma pessoa ou empresa duas vezes — ela pode estar em vários eventos, mas só pode ter um cadastro. Quer atualizar o cadastro existente com esses dados e vinculá-lo a este evento?`,
        "Atualizar Cadastro",
      );
      if (!atualizar) return;

      setSalvando(true);
      const { error: updateError } = await supabase
        .from("organizacao_cadastros")
        .update(camposFornecedorParaSalvar())
        .eq("id", existente.id);
      if (updateError) { await depoisSalvar(updateError); return; }

      await vincularCadastroAoEvento(existente.id);
      if (novoFornecedor.tipo_pessoa === "juridica" && nomeBusca) {
        await vincularNucleoEmpresa(existente.id, nomeBusca, novoFornecedor.responsavel_tenant_contato_id);
      }
      await depoisSalvar(null, () => setNovoFornecedor({ ...fornecedorVazio }));
      return;
    }

    setSalvando(true);

    const { data: fornecedor, error: fornecedorError } = await supabase
      .from("organizacao_cadastros")
      .insert({
        tenant_id: tenantId,
        origem_evento_id: eventoAtual.id,
        ...camposFornecedorParaSalvar(),
      })
      .select("id")
      .single();

    if (fornecedorError || !fornecedor?.id) {
      await depoisSalvar(
        fornecedorError || new Error("Fornecedor não criado."),
      );
      return;
    }

    await vincularCadastroAoEvento(fornecedor.id);
    if (novoFornecedor.tipo_pessoa === "juridica" && nomeBusca) {
      await vincularNucleoEmpresa(fornecedor.id, nomeBusca, novoFornecedor.responsavel_tenant_contato_id);
    }
    await depoisSalvar(null, () => setNovoFornecedor({ ...fornecedorVazio }));
  }

  async function alternarFornecedorNoEvento(fornecedor: Fornecedor, selecionado: boolean) {
    if (!eventoAtual || !tenantId) return;

    setSalvando(true);

    const vinculoAtual = fornecedoresEvento.find(
      (item) => item.cadastro_id === fornecedor.id && item.evento_id === eventoAtual.id,
    );

    if (!selecionado) {
      if (!vinculoAtual) {
        setSalvando(false);
        return;
      }

      const { error } = await supabase
        .from("organizacao_fornecedores_evento")
        .delete()
        .eq("id", vinculoAtual.id);
      await depoisSalvar(error);
      return;
    }

    if (vinculoAtual) {
      setSalvando(false);
      return;
    }

    const { error } = await supabase
      .from("organizacao_fornecedores_evento")
      .insert({
        tenant_id: tenantId,
        evento_id: eventoAtual.id,
        cadastro_id: fornecedor.id,
        categoria_evento: fornecedor.categoria || "fornecedor",
        status: "confirmado",
        valor_orcado: null,
        valor_fechado: null,
      });

    await depoisSalvar(error);
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

  function abrirEdicaoFornecedor(item: FornecedorEvento) {
    const f = item.fornecedor;
    const tipoPessoa = f?.tipo_pessoa || "fisica";
    setNovoFornecedor({
      tipo_pessoa: tipoPessoa,
      nome: f?.nome || "",
      categoria: f?.categoria || "buffet",
      responsavel_nome: f?.responsavel_nome || "",
      responsavel_telefone: f?.responsavel_telefone ? mascararTelefone(f.responsavel_telefone) : "",
      responsavel_tenant_contato_id: f?.responsavel_tenant_contato_id || null,
      telefone: f?.telefone ? mascararTelefone(f.telefone) : "",
      email: f?.email || "",
      documento: f?.cpf_cnpj ? (tipoPessoa === "juridica" ? mascararCnpj(f.cpf_cnpj) : mascararCpf(f.cpf_cnpj)) : "",
      codigo_externo: f?.codigo_externo || "",
      endereco: f?.logradouro || "",
      cep: f?.cep ? mascararCep(f.cep) : "",
      numero: f?.numero || "",
      complemento: f?.complemento || "",
      bairro: f?.bairro || "",
      cidade: f?.cidade || "",
      instagram: f?.instagram || "",
      pix_tipo: f?.pix_tipo || "",
      pix: f?.pix_chave || "",
      banco: f?.banco || "",
      agencia: f?.agencia || "",
      agencia_digito: f?.agencia_digito || "",
      conta: f?.conta || "",
      conta_digito: f?.conta_digito || "",
      observacoes: f?.observacoes || "",
      status: item.status || "orcamento",
    });
    setFornecedorEditandoId(item.id);
    setFornecedorAbaModal("principais");
    setFornecedorFormAberto(true);
  }

  async function salvarEdicaoFornecedor() {
    const item = fornecedoresEvento.find((f) => f.id === fornecedorEditandoId);
    if (!item || !novoFornecedor.nome.trim()) return;
    setSalvando(true);

    const { error } = await supabase
      .from("organizacao_cadastros")
      .update(camposFornecedorParaSalvar())
      .eq("id", item.cadastro_id);

    if (error) { await depoisSalvar(error); return; }

    const nomeEmpresa = novoFornecedor.nome.trim();
    if (novoFornecedor.tipo_pessoa === "juridica" && nomeEmpresa) {
      await vincularNucleoEmpresa(item.cadastro_id, nomeEmpresa, novoFornecedor.responsavel_tenant_contato_id);
    }

    await depoisSalvar(null, () => {
      setFornecedorEditandoId(null);
      setFornecedorFormAberto(false);
      setNovoFornecedor({ ...fornecedorVazio });
    });
  }

  async function buscarCepFornecedor() {
    const cep = novoFornecedor.cep.replace(/\D/g, "");
    if (cep.length !== 8) { setErro("Informe um CEP válido (8 dígitos)."); return; }
    setBuscandoCepFornecedor(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNovoFornecedor((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade ? `${data.localidade} - ${data.uf}` : prev.cidade,
        }));
        return;
      }

      const resAlt = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (!resAlt.ok) { setErro("CEP não encontrado."); return; }
      const dataAlt = await resAlt.json();
      setNovoFornecedor((prev) => ({
        ...prev,
        endereco: dataAlt.street || prev.endereco,
        bairro: dataAlt.neighborhood || prev.bairro,
        cidade: dataAlt.city ? `${dataAlt.city} - ${dataAlt.state}` : prev.cidade,
      }));
    } catch {
      setErro("Erro ao buscar CEP.");
    } finally {
      setBuscandoCepFornecedor(false);
    }
  }

  async function buscarCnpjFornecedor() {
    const cnpj = novoFornecedor.documento.replace(/\D/g, "");
    if (cnpj.length !== 14) { setErro("Informe um CNPJ válido (14 dígitos) para buscar."); return; }
    setBuscandoCnpjFornecedor(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) { setErro("CNPJ não encontrado."); return; }
      const data = await res.json();
      setNovoFornecedor((prev) => ({
        ...prev,
        tipo_pessoa: "juridica",
        nome: data.nome_fantasia || data.razao_social || prev.nome,
        telefone: data.ddd_telefone_1 ? mascararTelefone(data.ddd_telefone_1) : prev.telefone,
        email: data.email || prev.email,
        cep: data.cep ? mascararCep(data.cep) : prev.cep,
        endereco: data.logradouro || prev.endereco,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.municipio ? `${data.municipio} - ${data.uf}` : prev.cidade,
      }));
    } catch {
      setErro("Erro ao buscar CNPJ.");
    } finally {
      setBuscandoCnpjFornecedor(false);
    }
  }

  async function abrirContratoFornecedor(item: FornecedorEvento) {
    const contratacaoExistente = contratacoes.find(
      (contratacao) => contratacao.fornecedor_evento_id === item.id,
    );

    if (contratacaoExistente) {
      setAba("servicos");
      return;
    }

    if (!await pedirConfirmacao(`Criar uma contratação para "${item.fornecedor?.nome || "Fornecedor"}"?`)) return;
    if (!eventoAtual || !tenantId) return;

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
      setAba("servicos");
    }
  }

  async function abrirPagamentoFornecedor(item: FornecedorEvento) {
    const contratacaoExistente = contratacoes.find(
      (contratacao) => contratacao.fornecedor_evento_id === item.id,
    );

    if (contratacaoExistente) {
      setAba("servicos");
      return;
    }

    await abrirContratoFornecedor(item);
  }

  async function excluirFornecedor(item: FornecedorEvento) {
    if (!await pedirConfirmacao(`Remover "${item.fornecedor?.nome || "Fornecedor"}" deste evento?`)) return;

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
    if (!await pedirConfirmacao(`Marcar "${item.titulo}" como pago?`)) return;

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

  async function atualizarContratacaoCampo(item: Contratacao, campo: "unidade" | "quantidade", valor: string) {
    const update = campo === "quantidade" ? { quantidade: Number(valor) || 1 } : { unidade: valor || null };
    const { error } = await supabase.from("organizacao_contratacoes").update(update).eq("id", item.id);
    if (error) { setErro("Erro ao atualizar: " + error.message); return; }
    setContratacoes((prev) => prev.map((c) => c.id === item.id ? { ...c, ...update } : c));
  }

  async function salvarContratacaoEdits(item: Contratacao) {
    const edits = contratacaoEdits[item.id];
    if (!edits) return;
    const update = { quantidade: Number(edits.qtd) || 1, unidade: edits.unidade || null };
    const { error } = await supabase.from("organizacao_contratacoes").update(update).eq("id", item.id);
    if (error) { setErro("Erro ao salvar: " + error.message); return; }
    setContratacoes((prev) => prev.map((c) => c.id === item.id ? { ...c, ...update } : c));
    setContratacaoEdits((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
  }

  async function aprovarContratacao(item: Contratacao) {
    const { error } = await supabase.from("organizacao_contratacoes").update({ status_aprovacao: "aprovado" }).eq("id", item.id);
    if (error) { setErro("Erro ao aprovar: " + error.message); return; }
    setContratacoes((prev) => prev.map((c) => c.id === item.id ? { ...c, status_aprovacao: "aprovado" } : c));
    // Approve all items of this contratação
    const itensIds = contratacaoItens.filter((i) => i.contratacao_id === item.id).map((i) => i.id);
    if (itensIds.length > 0) {
      await supabase.from("organizacao_contratacao_itens").update({ aprovado: true }).in("id", itensIds);
      setContratacaoItens((prev) => prev.map((i) => itensIds.includes(i.id) ? { ...i, aprovado: true } : i));
    }
  }

  async function cancelarContratacao(item: Contratacao) {
    const { error } = await supabase.from("organizacao_contratacoes").update({ status_aprovacao: "cancelado" }).eq("id", item.id);
    if (error) { setErro("Erro ao cancelar: " + error.message); return; }
    setContratacoes((prev) => prev.map((c) => c.id === item.id ? { ...c, status_aprovacao: "cancelado" } : c));
  }

  async function toggleItemAprovado(item: ContratacaoItem) {
    const novoValor = !item.aprovado;
    const { error } = await supabase.from("organizacao_contratacao_itens").update({ aprovado: novoValor }).eq("id", item.id);
    if (error) { setErro("Erro ao atualizar item: " + error.message); return; }
    setContratacaoItens((prev) => prev.map((i) => i.id === item.id ? { ...i, aprovado: novoValor } : i));
    // Se todos os itens da contratação estão aprovados, aprova a contratação
    const contratId = item.contratacao_id;
    const todosItens = contratacaoItens.map((i) => i.id === item.id ? { ...i, aprovado: novoValor } : i).filter((i) => i.contratacao_id === contratId);
    if (todosItens.length > 0 && todosItens.every((i) => i.aprovado)) {
      await supabase.from("organizacao_contratacoes").update({ status_aprovacao: "aprovado" }).eq("id", contratId);
      setContratacoes((prev) => prev.map((c) => c.id === contratId ? { ...c, status_aprovacao: "aprovado" } : c));
    } else if (!novoValor) {
      // Se desmarcou um item, volta para orcamento
      await supabase.from("organizacao_contratacoes").update({ status_aprovacao: "orcamento" }).eq("id", contratId);
      setContratacoes((prev) => prev.map((c) => c.id === contratId ? { ...c, status_aprovacao: "orcamento" } : c));
    }
  }

  async function aprovarOrcamento(item: Contratacao) {
    const { error } = await supabase.from("organizacao_contratacoes").update({ status: "contratado" }).eq("id", item.id);
    if (error) { setErro("Erro ao aprovar: " + error.message); return; }
    setContratacoes((prev) => prev.map((c) => c.id === item.id ? { ...c, status: "contratado" } : c));
  }

  async function salvarNF(item: Contratacao) {
    const update = { nf_numero: nfForm.nf_numero || null, nf_data: nfForm.nf_data || null, nf_valor: nfForm.nf_valor ? Number(nfForm.nf_valor) : null };
    const { error } = await supabase.from("organizacao_contratacoes").update(update).eq("id", item.id);
    if (error) { setErro("Erro ao salvar NF: " + error.message); return; }
    setContratacoes((prev) => prev.map((c) => c.id === item.id ? { ...c, ...update } : c));
    setNfModal(null);
  }

  function calcularParcelasPreview(n: number, valorTotal: number, dataInicio: string, titulo: string) {
    const dataStr = dataInicio || new Date().toISOString().split("T")[0];
    const [anoI, mesI, diaI] = dataStr.split("-").map(Number);
    const valorBase = Math.floor((valorTotal / n) * 100) / 100;
    const resto = Math.round((valorTotal - valorBase * n) * 100) / 100;
    return Array.from({ length: n }, (_, i) => {
      let mes = mesI - 1 + i;
      const ano = anoI + Math.floor(mes / 12);
      mes = mes % 12;
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();
      const dia = Math.min(diaI || 1, diasNoMes);
      const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const valor = i === n - 1 ? String(Math.round((valorBase + resto) * 100) / 100) : String(valorBase);
      return { data, valor, descricao: n > 1 ? `Parcela ${i + 1}/${n}` : titulo };
    });
  }

  async function gerarParcelas(item: Contratacao, previewOverride?: { data: string; valor: string; descricao: string }[]) {
    const preview = previewOverride ?? (parcelasPreview.length > 0 ? parcelasPreview : calcularParcelasPreview(
      Math.max(1, parseInt(parcelaForm.numero_parcelas) || 1),
      Number(parcelaForm.valor_total) || toNumber(item.valor_contratado),
      parcelaForm.data_inicio,
      item.titulo
    ));
    const novasParcelas = preview.map((p, i) => ({
        tenant_id: item.tenant_id,
        evento_id: item.evento_id,
        contratacao_id: item.id,
        numero: i + 1,
        descricao: p.descricao,
        valor: Number(p.valor) || 0,
        data_vencimento: p.data || null,
        status: "pendente",
        forma_pagamento: parcelaForm.forma_pagamento || null,
        documento: parcelaForm.documento || null,
      }));
    console.log("gerarParcelas novasParcelas:", novasParcelas);
    // Remove parcelas antigas desta contratação
    const delRes = await supabase.from("organizacao_parcelas").delete().eq("contratacao_id", item.id);
    if (delRes.error) { console.error("delete error:", delRes.error); setErro("Erro ao limpar parcelas: " + delRes.error.message); return; }
    const { data, error } = await supabase.from("organizacao_parcelas").insert(novasParcelas).select();
    console.log("insert result:", { data, error });
    if (error) { setErro("Erro ao gerar parcelas: " + error.message + " | " + JSON.stringify(error)); return; }
    setParcelas((prev) => [...prev.filter((p) => p.contratacao_id !== item.id), ...(data as Parcela[])]);
    setParcelaModal(null);
    setParcelasPreview([]);
    setAba("financeiro");
  }

  async function criarClienteInlineParaParcela() {
    if (!tenantId || !novoFornecedorParcela.nome.trim()) { setErro("Informe o nome do cliente."); return; }
    const { data: cliente, error } = await supabase.from("organizacao_cadastros").insert({
      tenant_id: tenantId,
      eh_cliente: true,
      nome: novoFornecedorParcela.nome.trim(),
      cpf_cnpj: novoFornecedorParcela.documento || null,
      telefone: novoFornecedorParcela.telefone || null,
      email: novoFornecedorParcela.email || null,
      logradouro: novoFornecedorParcela.endereco || null,
      observacoes: novoFornecedorParcela.observacoes || null,
    }).select().single();
    if (error || !cliente) { setErro("Erro ao criar cliente: " + error?.message); return; }
    setClientesCadastrados((prev) => [...prev, cliente as OrganizacaoCliente]);
    setClienteSelecionadoId(cliente.id);
    setNovaParcelaForm((prev) => ({ ...prev, cliente: cliente.nome }));
    setNovoFornecedorParcelaModal(false);
    setNovoFornecedorParcela({ nome: "", categoria: "buffet", responsavel_nome: "", telefone: "", email: "", documento: "", endereco: "", instagram: "", pix: "", conta_corrente: "", observacoes: "" });
  }

  async function buscarOuCriarCliente(nome: string): Promise<string | null> {
    if (!eventoAtual || !tenantId || !nome.trim()) return null;
    const existente = clientesCadastrados.find((c) => c.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    if (existente) return existente.id;
    const { data: cliente, error } = await supabase.from("organizacao_cadastros").insert({
      tenant_id: tenantId,
      eh_cliente: true,
      nome: nome.trim(),
    }).select().single();
    if (error || !cliente) { setErro("Erro ao criar cliente: " + error?.message); return null; }
    setClientesCadastrados((prev) => [...prev, cliente as OrganizacaoCliente]);
    return cliente.id;
  }

  async function criarFornecedorInlineParaParcela() {
    if (!tenantId || !novoFornecedorParcelaForm.nome.trim()) { setErro("Informe o nome do fornecedor."); return; }
    const { data: fornecedor, error } = await supabase.from("organizacao_cadastros").insert({
      tenant_id: tenantId,
      eh_fornecedor: true,
      nome: novoFornecedorParcelaForm.nome.trim(),
      cpf_cnpj: novoFornecedorParcelaForm.documento || null,
      telefone: novoFornecedorParcelaForm.telefone || null,
      email: novoFornecedorParcelaForm.email || null,
      logradouro: novoFornecedorParcelaForm.endereco || null,
      observacoes: novoFornecedorParcelaForm.observacoes || null,
    }).select().single();
    if (error || !fornecedor) { setErro("Erro ao criar fornecedor: " + error?.message); return; }
    setFornecedoresCadastrados((prev) => [...prev, fornecedor as Fornecedor]);
    setFornecedorSelecionadoId(fornecedor.id);
    setNovaParcelaPagarForm((prev) => ({ ...prev, fornecedor: fornecedor.nome }));
    setNovoFornecedorPagarModal(false);
    setNovoFornecedorParcelaForm({ nome: "", documento: "", telefone: "", email: "", endereco: "", observacoes: "" });
  }

  async function buscarOuCriarFornecedorParcela(nome: string): Promise<string | null> {
    if (!eventoAtual || !tenantId || !nome.trim()) return null;
    const existente = fornecedoresCadastrados.find((f) => f.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    if (existente) return existente.id;
    const { data: fornecedor, error } = await supabase.from("organizacao_cadastros").insert({
      tenant_id: tenantId,
      eh_fornecedor: true,
      nome: nome.trim(),
    }).select().single();
    if (error || !fornecedor) { setErro("Erro ao criar fornecedor: " + error?.message); return null; }
    setFornecedoresCadastrados((prev) => [...prev, fornecedor as Fornecedor]);
    return fornecedor.id;
  }

  async function salvarNovaParcela() {
    if (!eventoAtual?.id) return;
    const valorTotal = parseFloat(novaParcelaForm.valor.replace(",", ".")) || 0;
    if (!valorTotal) { setErro("Informe o valor."); return; }
    const n = Math.max(1, parseInt(novaParcelaForm.numero_parcelas) || 1);
    const tenantId = eventoAtual.tenant_id;
    const valorBase = Math.floor((valorTotal / n) * 100) / 100;
    const resto = Math.round((valorTotal - valorBase * n) * 100) / 100;
    const dataStr = novaParcelaForm.data_vencimento || new Date().toISOString().split("T")[0];
    const [anoI, mesI, diaI] = dataStr.split("-").map(Number);
    const clienteIdResolvido = clienteSelecionadoId || (novaParcelaForm.cliente.trim() ? await buscarOuCriarCliente(novaParcelaForm.cliente) : null);
    const novasParcelas = Array.from({ length: n }, (_, i) => {
      let mes = mesI - 1 + i;
      const ano = anoI + Math.floor(mes / 12);
      mes = mes % 12;
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();
      const dia = Math.min(diaI || 1, diasNoMes);
      const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const valor = i === n - 1 ? Math.round((valorBase + resto) * 100) / 100 : valorBase;
      return {
        tenant_id: tenantId,
        evento_id: eventoAtual.id,
        contratacao_id: null,
        numero: i + 1,
        descricao: n > 1 ? `Parcela ${i + 1}/${n}` : (novaParcelaForm.historico || null),
        valor,
        data_vencimento: data,
        status: "pendente",
        forma_pagamento: novaParcelaForm.forma_pagamento || null,
        documento: novaParcelaForm.documento || null,
        competencia: novaParcelaForm.competencia || null,
        data_emissao: novaParcelaForm.data_emissao || null,
        cliente: novaParcelaForm.cliente || null,
        cadastro_cliente_id: clienteIdResolvido || null,
        tipo: "receber",
        plano_de_contas: novaParcelaForm.plano_de_contas || null,
        empresa: novaParcelaForm.empresa || null,
        conta_corrente: novaParcelaForm.conta_corrente || null,
        centro_de_custo: novaParcelaForm.centro_de_custo || null,
        historico: novaParcelaForm.historico || null,
        numero_doc: novaParcelaForm.numero_doc || null,
        observacoes: null,
      };
    });
    const { data, error } = await supabase.from("organizacao_parcelas").insert(novasParcelas).select();
    if (error) { setErro("Erro ao criar parcela: " + error.message); return; }
    setParcelas((prev) => [...prev, ...(data as Parcela[])]);
    setNovaParcelaModal(false);
    setClienteSelecionadoId(null);
    setNovaParcelaForm({ numero_doc: "", competencia: "", data_emissao: "", data_vencimento: "", numero_parcelas: "1", valor: "", cliente: "", plano_de_contas: "", empresa: "", conta_corrente: "", centro_de_custo: "", historico: "", forma_pagamento: "", documento: "" });
  }

  async function salvarNovaParcelaPagar() {
    if (!eventoAtual?.id) return;
    const valorTotal = parseFloat(novaParcelaPagarForm.valor.replace(",", ".")) || 0;
    if (!valorTotal) { setErro("Informe o valor."); return; }
    const n = Math.max(1, parseInt(novaParcelaPagarForm.numero_parcelas) || 1);
    const tenantId = eventoAtual.tenant_id;
    const valorBase = Math.floor((valorTotal / n) * 100) / 100;
    const resto = Math.round((valorTotal - valorBase * n) * 100) / 100;
    const dataStr = novaParcelaPagarForm.data_vencimento || new Date().toISOString().split("T")[0];
    const [anoI, mesI, diaI] = dataStr.split("-").map(Number);
    const fornecedorIdResolvido = fornecedorSelecionadoId || (novaParcelaPagarForm.fornecedor.trim() ? await buscarOuCriarFornecedorParcela(novaParcelaPagarForm.fornecedor) : null);
    const novasParcelas = Array.from({ length: n }, (_, i) => {
      let mes = mesI - 1 + i;
      const ano = anoI + Math.floor(mes / 12);
      mes = mes % 12;
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();
      const dia = Math.min(diaI || 1, diasNoMes);
      const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const valor = i === n - 1 ? Math.round((valorBase + resto) * 100) / 100 : valorBase;
      return {
        tenant_id: tenantId,
        evento_id: eventoAtual.id,
        contratacao_id: null,
        numero: i + 1,
        descricao: n > 1 ? `Parcela ${i + 1}/${n}` : (novaParcelaPagarForm.historico || null),
        valor,
        data_vencimento: data,
        status: "pendente",
        forma_pagamento: novaParcelaPagarForm.forma_pagamento || null,
        documento: novaParcelaPagarForm.documento || null,
        competencia: novaParcelaPagarForm.competencia || null,
        data_emissao: novaParcelaPagarForm.data_emissao || null,
        cadastro_fornecedor_id: fornecedorIdResolvido || null,
        tipo: "pagar",
        plano_de_contas: novaParcelaPagarForm.plano_de_contas || null,
        empresa: novaParcelaPagarForm.empresa || null,
        conta_corrente: novaParcelaPagarForm.conta_corrente || null,
        centro_de_custo: novaParcelaPagarForm.centro_de_custo || null,
        historico: novaParcelaPagarForm.historico || null,
        numero_doc: novaParcelaPagarForm.numero_doc || null,
        observacoes: null,
      };
    });
    const { data, error } = await supabase.from("organizacao_parcelas").insert(novasParcelas).select();
    if (error) { setErro("Erro ao criar parcela: " + error.message); return; }
    setParcelas((prev) => [...prev, ...(data as Parcela[])]);
    setNovaParcelaPagarModal(false);
    setFornecedorSelecionadoId(null);
    setNovaParcelaPagarForm({ numero_doc: "", competencia: "", data_emissao: "", data_vencimento: "", numero_parcelas: "1", valor: "", fornecedor: "", plano_de_contas: "", empresa: "", conta_corrente: "", centro_de_custo: "", historico: "", forma_pagamento: "", documento: "" });
  }

  async function marcarParcelaPaga(parcela: Parcela, dataPagamento: string) {
    const { error } = await supabase.from("organizacao_parcelas").update({ status: "pago", data_pagamento: dataPagamento }).eq("id", parcela.id);
    if (error) { setErro("Erro ao marcar recebido: " + error.message); return; }
    setParcelas((prev) => prev.map((p) => p.id === parcela.id ? { ...p, status: "pago", data_pagamento: dataPagamento } : p));
    setLiquidando((prev) => { const n = { ...prev }; delete n[parcela.id]; return n; });
  }

  async function reabrirParcela(parcela: Parcela) {
    const { error } = await supabase.from("organizacao_parcelas").update({ status: "pendente", data_pagamento: null }).eq("id", parcela.id);
    if (error) { setErro("Erro ao reabrir parcela: " + error.message); return; }
    setParcelas((prev) => prev.map((p) => p.id === parcela.id ? { ...p, status: "pendente", data_pagamento: null } : p));
  }

  async function excluirParcela(parcela: Parcela) {
    if (!await pedirConfirmacao(`Excluir "${parcela.descricao || `Parcela ${parcela.numero}`}"?`)) return;
    const { error } = await supabase.from("organizacao_parcelas").delete().eq("id", parcela.id);
    if (error) { setErro("Erro ao excluir parcela: " + error.message); return; }
    setParcelas((prev) => prev.filter((p) => p.id !== parcela.id));
  }

  async function excluirContratacao(item: Contratacao) {
    if (!await pedirConfirmacao(`Excluir a contratação "${item.titulo}"?`)) return;

    const { error } = await supabase
      .from("organizacao_contratacoes")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  function getNovoFornecedorServico(fornecedorId: string) {
    return novoFornecedorServico[fornecedorId] || { titulo: "", descricao: "", unidade: "", preco_custo: "", preco_venda: "" };
  }

  async function criarFornecedorServico(fornecedorId: string) {
    if (!tenantId) return;
    const form = getNovoFornecedorServico(fornecedorId);
    if (!form.titulo.trim()) return;
    const { data, error } = await supabase.from("organizacao_fornecedor_servicos").insert({
      tenant_id: tenantId,
      fornecedor_id: fornecedorId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      unidade: form.unidade.trim() || null,
      preco_custo: valorOuZero(form.preco_custo),
      preco_venda: valorOuZero(form.preco_venda),
    }).select().single();
    if (error) { setErro("Erro ao adicionar serviço: " + error.message); return; }
    if (data) setFornecedorServicos((prev) => [...prev, data as FornecedorServico]);
    setNovoFornecedorServico((prev) => ({ ...prev, [fornecedorId]: { titulo: "", descricao: "", unidade: "", preco_custo: "", preco_venda: "" } }));
  }

  async function excluirFornecedorServico(s: FornecedorServico) {
    if (!confirm(`Excluir serviço "${s.titulo}" do catálogo?`)) return;
    const { error } = await supabase.from("organizacao_fornecedor_servicos").delete().eq("id", s.id);
    if (error) { setErro("Erro ao excluir: " + error.message); return; }
    setFornecedorServicos((prev) => prev.filter((x) => x.id !== s.id));
  }

  function getNovoItem(id: string) {
    return novoItem[id] || { titulo: "", quantidade_item: "1", unidade: "", quantidade: "1", preco_custo: "", preco_venda: "" };
  }

  async function criarContratacaoItem(contratacaoId: string) {
    if (!tenantId) return;
    const form = getNovoItem(contratacaoId);
    if (!form.titulo.trim()) return;
    const { data, error } = await supabase.from("organizacao_contratacao_itens").insert({
      tenant_id: tenantId,
      contratacao_id: contratacaoId,
      titulo: form.titulo.trim(),
      quantidade_item: Number(form.quantidade_item) || 1,
      unidade: form.unidade.trim() || null,
      quantidade: Number(form.quantidade) || 1,
      preco_custo: valorOuZero(form.preco_custo),
      preco_venda: valorOuZero(form.preco_venda),
      valor: valorOuZero(form.preco_venda),
    }).select().single();
    if (error) { setErro("Erro ao adicionar item: " + error.message); return; }
    if (data) setContratacaoItens((prev) => [...prev, data as ContratacaoItem]);
    setNovoItem((prev) => ({ ...prev, [contratacaoId]: { titulo: "", quantidade_item: "1", unidade: "", quantidade: "1", preco_custo: "", preco_venda: "" } }));
  }

  async function excluirContratacaoItem(item: ContratacaoItem) {
    const { error } = await supabase.from("organizacao_contratacao_itens").delete().eq("id", item.id);
    if (error) { setErro("Erro ao remover item: " + error.message); return; }
    setContratacaoItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  function getNovoServico(fEventoId: string) {
    return novoServico[fEventoId] || { titulo: "", valor_contratado: "", valor_pago: "", data_vencimento: "", status: "pendente" };
  }

  function setNovoServicoCampo(fEventoId: string, campo: string, valor: string) {
    setNovoServico((prev) => ({ ...prev, [fEventoId]: { ...getNovoServico(fEventoId), [campo]: valor } }));
  }

  async function criarServicoFornecedor(fornecedorEventoId: string) {
    if (!eventoAtual || !tenantId) return;
    const form = getNovoServico(fornecedorEventoId);
    if (!form.titulo.trim()) return;
    setSalvando(true);
    const { data, error } = await supabase.from("organizacao_contratacoes").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      fornecedor_evento_id: fornecedorEventoId,
      titulo: form.titulo.trim(),
      valor_contratado: valorOuZero(form.valor_contratado),
      valor_pago: valorOuZero(form.valor_pago),
      data_vencimento: form.data_vencimento || null,
      status: form.status,
      parcelas: 1,
    }).select().single();
    setSalvando(false);
    if (error) { setErro("Erro ao criar serviço: " + error.message); return; }
    if (data) setContratacoes((prev) => [...prev, data as Contratacao]);
    setNovoServico((prev) => ({ ...prev, [fornecedorEventoId]: { titulo: "", valor_contratado: "", valor_pago: "", data_vencimento: "", status: "pendente" } }));
  }

  function getFormFornecedorEquipe(fornecedorId: string) {
    return fornecedorEquipeForm[fornecedorId] || { nome: "", funcao: "", telefone: "", horario_inicio: "", horario_fim: "" };
  }

  function setFormFornecedorEquipe(fornecedorId: string, campo: string, valor: string) {
    setFornecedorEquipeForm((prev) => ({
      ...prev,
      [fornecedorId]: { ...getFormFornecedorEquipe(fornecedorId), [campo]: valor },
    }));
  }

  async function criarFornecedorEquipeMembro(fornecedorId: string) {
    if (!tenantId || !eventoAtual?.id) return;
    const form = getFormFornecedorEquipe(fornecedorId);
    if (!form.nome.trim()) return;
    setFornecedorEquipeSalvando(true);
    const { data, error } = await supabase.from("organizacao_fornecedor_equipe").insert({
      tenant_id: tenantId,
      fornecedor_id: fornecedorId,
      evento_id: eventoAtual.id,
      nome: form.nome.trim(),
      funcao: form.funcao.trim() || null,
      telefone: limpar(form.telefone) || null,
      horario_inicio: datetimeOuNull(form.horario_inicio),
      horario_fim: datetimeOuNull(form.horario_fim),
      status: "confirmado",
    }).select().single();
    setFornecedorEquipeSalvando(false);
    if (error) { setErro("Erro ao adicionar membro: " + error.message); return; }
    if (data) setFornecedorEquipe((prev) => [...prev, data as FornecedorEquipeMembro]);
    setFornecedorEquipeForm((prev) => ({ ...prev, [fornecedorId]: { nome: "", funcao: "", telefone: "", horario_inicio: "", horario_fim: "" } }));
  }

  async function excluirFornecedorEquipeMembro(membro: FornecedorEquipeMembro) {
    if (!confirm(`Remover ${membro.nome} da equipe do fornecedor?`)) return;
    const { error } = await supabase.from("organizacao_fornecedor_equipe").delete().eq("id", membro.id);
    if (error) { setErro("Erro ao remover: " + error.message); return; }
    setFornecedorEquipe((prev) => prev.filter((m) => m.id !== membro.id));
  }

  async function atualizarStatusFornecedorEquipe(membro: FornecedorEquipeMembro, status: string) {
    const { error } = await supabase.from("organizacao_fornecedor_equipe").update({ status }).eq("id", membro.id);
    if (error) { setErro("Erro ao atualizar status: " + error.message); return; }
    setFornecedorEquipe((prev) => prev.map((m) => m.id === membro.id ? { ...m, status } : m));
  }

  function abrirEdicaoFornecedorEquipe(membro: FornecedorEquipeMembro) {
    setFornecedorEquipeEditando(membro.id);
    setFornecedorEquipeEditForm({
      nome: membro.nome,
      funcao: membro.funcao || "",
      telefone: membro.telefone || "",
      horario_inicio: membro.horario_inicio ? new Date(membro.horario_inicio).toTimeString().slice(0, 5) : "",
      horario_fim: membro.horario_fim ? new Date(membro.horario_fim).toTimeString().slice(0, 5) : "",
    });
  }

  async function salvarEdicaoFornecedorEquipe(membro: FornecedorEquipeMembro) {
    if (!fornecedorEquipeEditForm.nome.trim()) return;
    setFornecedorEquipeSalvando(true);
    const { error } = await supabase.from("organizacao_fornecedor_equipe").update({
      nome: fornecedorEquipeEditForm.nome.trim(),
      funcao: fornecedorEquipeEditForm.funcao.trim() || null,
      telefone: limpar(fornecedorEquipeEditForm.telefone) || null,
      horario_inicio: datetimeOuNull(fornecedorEquipeEditForm.horario_inicio),
      horario_fim: datetimeOuNull(fornecedorEquipeEditForm.horario_fim),
    }).eq("id", membro.id);
    setFornecedorEquipeSalvando(false);
    if (error) { setErro("Erro ao salvar: " + error.message); return; }
    setFornecedorEquipe((prev) => prev.map((m) => m.id === membro.id ? {
      ...m,
      nome: fornecedorEquipeEditForm.nome.trim(),
      funcao: fornecedorEquipeEditForm.funcao.trim() || null,
      telefone: limpar(fornecedorEquipeEditForm.telefone) || null,
      horario_inicio: datetimeOuNull(fornecedorEquipeEditForm.horario_inicio),
      horario_fim: datetimeOuNull(fornecedorEquipeEditForm.horario_fim),
    } : m));
    setFornecedorEquipeEditando(null);
  }

  function gerarCodigoCredencial() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return "EQP-" + code;
  }

  async function criarEquipe() {
    if (!tenantId || !novoEquipe.nome.trim() || !novoEquipe.funcao.trim()) return;
    if (!eventoAtual?.id) {
      setErro("Selecione um evento antes de adicionar um membro à equipe.");
      return;
    }
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
      codigo_credencial: gerarCodigoCredencial(),
    });
    await depoisSalvar(error, () => {
      setNovoEquipe({
        nome: "",
        funcao: "",
        telefone: "",
        email: "",
        horario_inicio: "",
        horario_fim: "",
        contato_principal: false,
      });
      setMenuEquipeAberto(false);
    });
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
    if (!await pedirConfirmacao(`Excluir "${item.nome}" da equipe?`)) return;

    const { error } = await supabase
      .from("organizacao_equipe")
      .delete()
      .eq("id", item.id);
    await depoisSalvar(error);
  }

  async function alternarMembroNoEvento(item: Equipe, selecionado: boolean) {
    if (!eventoAtual || !tenantId) return;

    setSalvando(true);

    if (!selecionado) {
      const { error } = await supabase
        .from("organizacao_equipe")
        .delete()
        .eq("id", item.id)
        .eq("evento_id", eventoAtual.id);
      await depoisSalvar(error);
      return;
    }

    const jaVinculado = equipe.some(
      (pessoa) =>
        pessoa.evento_id === eventoAtual.id &&
        chaveEquipe(pessoa) === chaveEquipe(item),
    );

    if (jaVinculado) {
      setSalvando(false);
      return;
    }

    const { error } = await supabase.from("organizacao_equipe").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      nome: item.nome,
      funcao: item.funcao,
      telefone: item.telefone,
      email: item.email,
      horario_inicio: item.horario_inicio,
      horario_fim: item.horario_fim,
      contato_principal: item.contato_principal,
      status: "convidado",
      codigo_credencial: gerarCodigoCredencial(),
    });

    await depoisSalvar(error);
  }

  async function atualizarCampoEquipe(
    item: Equipe,
    campo: "funcao" | "status" | "horario_inicio" | "horario_fim",
    valor: string,
  ) {
    let valorNormalizado: string | null = valor || null;

    if ((campo === "horario_inicio" || campo === "horario_fim") && valor) {
      const dataBase =
        eventoAtual?.data_inicio ||
        eventoAtual?.data_evento ||
        new Date().toISOString().slice(0, 10);
      valorNormalizado = datetimeOuNull(`${dataBase}T${valor}:00`);
    }

    const { error } = await supabase
      .from("organizacao_equipe")
      .update({ [campo]: valorNormalizado })
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
    if (!await pedirConfirmacao(`Excluir "${item.item}" do checklist?`)) return;

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

    if (!await pedirConfirmacao(`Adicionar o roteiro padrão "${modelo.label}" ao evento? Itens duplicados serão ignorados.`)) return;

    const titulosExistentes = new Set(
      agenda
        .map((item) => (item.titulo || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const itensParaInserir = modelo.items
      .filter(
        ([titulo]) =>
          !titulosExistentes.has(String(titulo).trim().toLowerCase()),
      )
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
    if (!await pedirConfirmacao(`Excluir "${String(item.titulo || "Item do roteiro")}" do roteiro?`)) return;

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
                className={aba === "fornecedores" ? "active" : ""}
                onClick={() => setAba("fornecedores")}
              >
                Fornecedores
              </button>
              <button
                className={aba === "equipe" ? "active" : ""}
                onClick={() => setAba("equipe")}
              >
                Equipe
              </button>
              <button
                className={aba === "servicos" ? "active" : ""}
                onClick={() => setAba("servicos")}
              >
                Serviços Contratados
              </button>
              <button
                className={aba === "financeiro" ? "active" : ""}
                onClick={() => setAba("financeiro")}
              >
                Financeiro
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
                  ...producaoFiltrada.slice(0, 4).map((a) => ({
                    titulo: a.titulo,
                    detalhe: `${labelStatus(a.status)} · ${formatarData(a.data_limite)}`,
                    status: a.status,
                  })),
                  ...agendaFiltrada.slice(0, 4).map((a) => ({
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
          {aba === "fornecedores" && renderFornecedores()}
          {aba === "servicos" && renderContratacoes(false)}
          {aba === "financeiro" && renderFinanceiro()}
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

      {/* Modal de confirmação padronizado */}
      {novaParcelaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 620, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>

            {novoFornecedorParcelaModal ? (<>
              {/* === TELA: NOVO CLIENTE === */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".05em" }}>Novo Cliente</div>
                <button type="button" onClick={() => setNovoFornecedorParcelaModal(false)} style={{ background: "none", border: "none", fontSize: 22, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input type="text" placeholder="Nome do cliente *" value={novoFornecedorParcela.nome}
                  onChange={(e) => setNovoFornecedorParcela({ ...novoFornecedorParcela, nome: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                <input type="text" placeholder="CPF ou CNPJ" value={novoFornecedorParcela.documento}
                  onChange={(e) => setNovoFornecedorParcela({ ...novoFornecedorParcela, documento: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[{ placeholder: "Telefone / WhatsApp", key: "telefone" }, { placeholder: "E-mail", key: "email" }].map(({ placeholder, key }) => (
                  <input key={key} type="text" placeholder={placeholder} value={(novoFornecedorParcela as Record<string,string>)[key]}
                    onChange={(e) => setNovoFornecedorParcela({ ...novoFornecedorParcela, [key]: e.target.value })}
                    style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                ))}
              </div>
              <input type="text" placeholder="Endereço completo" value={novoFornecedorParcela.endereco}
                onChange={(e) => setNovoFornecedorParcela({ ...novoFornecedorParcela, endereco: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", marginBottom: 10 }} />
              <textarea placeholder="Observações" value={novoFornecedorParcela.observacoes}
                onChange={(e) => setNovoFornecedorParcela({ ...novoFornecedorParcela, observacoes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", marginBottom: 18 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={criarClienteInlineParaParcela}
                  style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  Adicionar cliente
                </button>
                <button type="button" onClick={() => setNovoFornecedorParcelaModal(false)}
                  style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid var(--line)", background: "none", color: "var(--muted)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  Cancelar
                </button>
              </div>
            </>) : (<>
            {/* === TELA: NOVA CONTA A RECEBER === */}
            <div style={{ fontWeight: 900, fontSize: 17, color: "var(--text)", marginBottom: 22 }}>+ Nova Conta a Receber</div>

            {/* Linha 1: Número, Competência, Emissão, Vencimento */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Número", key: "numero_doc", type: "text", placeholder: "NF-001" },
                { label: "Competência", key: "competencia", type: "month", placeholder: "" },
                { label: "Emissão", key: "data_emissao", type: "date", placeholder: "" },
                { label: "Vencimento", key: "data_vencimento", type: "date", placeholder: "" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <input type={type} value={(novaParcelaForm as Record<string, string>)[key]} placeholder={placeholder}
                    onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, [key]: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            {/* Linha 2: Parcelas, Valor, Cliente */}
            <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Parcelas</div>
                <input type="number" min="1" value={novaParcelaForm.numero_parcelas}
                  onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, numero_parcelas: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Valor Total (R$)</div>
                <input type="number" value={novaParcelaForm.valor} placeholder="0,00"
                  onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, valor: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Cliente / Fornecedor</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input type="text" value={novaParcelaForm.cliente} placeholder="Buscar cliente..."
                      onChange={(e) => { setNovaParcelaForm({ ...novaParcelaForm, cliente: e.target.value }); setClienteSelecionadoId(null); setClienteDropdownAberto(true); }}
                      onFocus={() => setClienteDropdownAberto(true)}
                      onBlur={() => setTimeout(() => setClienteDropdownAberto(false), 150)}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                    {clienteDropdownAberto && novaParcelaForm.cliente.length >= 1 && (() => {
                      const termo = novaParcelaForm.cliente.toLowerCase();
                      const filtrados = clientesCadastrados.filter((c) => c.nome.toLowerCase().includes(termo));
                      if (filtrados.length === 0) return null;
                      return (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.2)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                          {filtrados.map((c) => (
                            <div key={c.id}
                              onMouseDown={() => { setNovaParcelaForm({ ...novaParcelaForm, cliente: c.nome }); setClienteSelecionadoId(c.id); setClienteDropdownAberto(false); }}
                              style={{ padding: "9px 14px", fontSize: 13, color: "var(--text)", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-soft)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                              {c.nome}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <button type="button"
                    title="Cadastrar novo cliente"
                    onClick={() => { setNovoFornecedorParcela({ nome: "", categoria: "buffet", responsavel_nome: "", telefone: "", email: "", documento: "", endereco: "", instagram: "", pix: "", conta_corrente: "", observacoes: "" }); setNovoFornecedorParcelaModal(true); }}
                    style={{ padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--primary)", cursor: "pointer", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 3: Plano de Contas, Empresa */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Plano de Contas", key: "plano_de_contas", placeholder: "Ex: Receita de Serviços" },
                { label: "Empresa", key: "empresa", placeholder: "Ex: OmniStage Produções" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <input type="text" value={(novaParcelaForm as Record<string, string>)[key]} placeholder={placeholder}
                    onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, [key]: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            {/* Linha 4: Conta Corrente, Centro de Custo, Forma Pagamento, Documento */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Conta Corrente</div>
                <input type="text" value={novaParcelaForm.conta_corrente} placeholder="Ex: Bradesco CC"
                  onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, conta_corrente: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Centro de Custo</div>
                <input type="text" value={novaParcelaForm.centro_de_custo} placeholder="Ex: Eventos"
                  onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, centro_de_custo: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Forma de Pgto</div>
                <select value={novaParcelaForm.forma_pagamento} onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, forma_pagamento: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}>
                  <option value="">Selecione...</option>
                  <option value="pix">PIX</option>
                  <option value="ted">TED</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Documento</div>
                <select value={novaParcelaForm.documento} onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, documento: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}>
                  <option value="">Selecione...</option>
                  <option value="boleto">Boleto</option>
                  <option value="comprovante">Comprovante</option>
                  <option value="cupom_fiscal">Cupom Fiscal</option>
                  <option value="duplicata">Duplicata</option>
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="previsao">Previsão</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Histórico */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Histórico</div>
              <textarea value={novaParcelaForm.historico} placeholder="Observações ou descrição do lançamento"
                onChange={(e) => setNovaParcelaForm({ ...novaParcelaForm, historico: e.target.value })} rows={2}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setNovaParcelaModal(false)}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                Cancelar
              </button>
              <button type="button" onClick={salvarNovaParcela}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                Salvar
              </button>
            </div>
            </>)}
          </div>
        </div>
      )}

      {novaParcelaPagarModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 620, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>

            {novoFornecedorPagarModal ? (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".05em" }}>Novo Fornecedor</div>
                <button type="button" onClick={() => setNovoFornecedorPagarModal(false)} style={{ background: "none", border: "none", fontSize: 22, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input type="text" placeholder="Nome do fornecedor *" value={novoFornecedorParcelaForm.nome}
                  onChange={(e) => setNovoFornecedorParcelaForm({ ...novoFornecedorParcelaForm, nome: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                <input type="text" placeholder="CPF ou CNPJ" value={novoFornecedorParcelaForm.documento}
                  onChange={(e) => setNovoFornecedorParcelaForm({ ...novoFornecedorParcelaForm, documento: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[{ placeholder: "Telefone / WhatsApp", key: "telefone" }, { placeholder: "E-mail", key: "email" }].map(({ placeholder, key }) => (
                  <input key={key} type="text" placeholder={placeholder} value={(novoFornecedorParcelaForm as Record<string,string>)[key]}
                    onChange={(e) => setNovoFornecedorParcelaForm({ ...novoFornecedorParcelaForm, [key]: e.target.value })}
                    style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                ))}
              </div>
              <input type="text" placeholder="Endereço completo" value={novoFornecedorParcelaForm.endereco}
                onChange={(e) => setNovoFornecedorParcelaForm({ ...novoFornecedorParcelaForm, endereco: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", marginBottom: 10 }} />
              <textarea placeholder="Observações" value={novoFornecedorParcelaForm.observacoes}
                onChange={(e) => setNovoFornecedorParcelaForm({ ...novoFornecedorParcelaForm, observacoes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", marginBottom: 18 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={criarFornecedorInlineParaParcela}
                  style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  Adicionar fornecedor
                </button>
                <button type="button" onClick={() => setNovoFornecedorPagarModal(false)}
                  style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid var(--line)", background: "none", color: "var(--muted)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  Cancelar
                </button>
              </div>
            </>) : (<>
            <div style={{ fontWeight: 900, fontSize: 17, color: "var(--text)", marginBottom: 22 }}>+ Nova Conta a Pagar</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Número", key: "numero_doc", type: "text", placeholder: "NF-001" },
                { label: "Competência", key: "competencia", type: "month", placeholder: "" },
                { label: "Emissão", key: "data_emissao", type: "date", placeholder: "" },
                { label: "Vencimento", key: "data_vencimento", type: "date", placeholder: "" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <input type={type} value={(novaParcelaPagarForm as Record<string, string>)[key]} placeholder={placeholder}
                    onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, [key]: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Parcelas</div>
                <input type="number" min="1" value={novaParcelaPagarForm.numero_parcelas}
                  onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, numero_parcelas: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Valor Total (R$)</div>
                <input type="number" value={novaParcelaPagarForm.valor} placeholder="0,00"
                  onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, valor: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Fornecedor</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input type="text" value={novaParcelaPagarForm.fornecedor} placeholder="Buscar fornecedor..."
                      onChange={(e) => { setNovaParcelaPagarForm({ ...novaParcelaPagarForm, fornecedor: e.target.value }); setFornecedorSelecionadoId(null); setFornecedorDropdownAberto(true); }}
                      onFocus={() => setFornecedorDropdownAberto(true)}
                      onBlur={() => setTimeout(() => setFornecedorDropdownAberto(false), 150)}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                    {fornecedorDropdownAberto && novaParcelaPagarForm.fornecedor.length >= 1 && (() => {
                      const termo = novaParcelaPagarForm.fornecedor.toLowerCase();
                      const filtrados = fornecedoresCadastrados.filter((f) => f.nome.toLowerCase().includes(termo));
                      if (filtrados.length === 0) return null;
                      return (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.2)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                          {filtrados.map((f) => (
                            <div key={f.id}
                              onMouseDown={() => { setNovaParcelaPagarForm({ ...novaParcelaPagarForm, fornecedor: f.nome }); setFornecedorSelecionadoId(f.id); setFornecedorDropdownAberto(false); }}
                              style={{ padding: "9px 14px", fontSize: 13, color: "var(--text)", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-soft)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                              {f.nome}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <button type="button"
                    title="Cadastrar novo fornecedor"
                    onClick={() => { setNovoFornecedorParcelaForm({ nome: "", documento: "", telefone: "", email: "", endereco: "", observacoes: "" }); setNovoFornecedorPagarModal(true); }}
                    style={{ padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--primary)", cursor: "pointer", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                    +
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Plano de Contas", key: "plano_de_contas", placeholder: "Ex: Despesa com Fornecedores" },
                { label: "Empresa", key: "empresa", placeholder: "Ex: OmniStage Produções" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <input type="text" value={(novaParcelaPagarForm as Record<string, string>)[key]} placeholder={placeholder}
                    onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, [key]: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Conta Corrente</div>
                <input type="text" value={novaParcelaPagarForm.conta_corrente} placeholder="Ex: Bradesco CC"
                  onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, conta_corrente: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Centro de Custo</div>
                <input type="text" value={novaParcelaPagarForm.centro_de_custo} placeholder="Ex: Eventos"
                  onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, centro_de_custo: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Forma de Pgto</div>
                <select value={novaParcelaPagarForm.forma_pagamento} onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, forma_pagamento: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}>
                  <option value="">Selecione...</option>
                  <option value="pix">PIX</option>
                  <option value="ted">TED</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Documento</div>
                <select value={novaParcelaPagarForm.documento} onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, documento: e.target.value })}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}>
                  <option value="">Selecione...</option>
                  <option value="boleto">Boleto</option>
                  <option value="comprovante">Comprovante</option>
                  <option value="cupom_fiscal">Cupom Fiscal</option>
                  <option value="duplicata">Duplicata</option>
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="previsao">Previsão</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Histórico</div>
              <textarea value={novaParcelaPagarForm.historico} placeholder="Observações ou descrição do lançamento"
                onChange={(e) => setNovaParcelaPagarForm({ ...novaParcelaPagarForm, historico: e.target.value })} rows={2}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setNovaParcelaPagarModal(false)}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                Cancelar
              </button>
              <button type="button" onClick={salvarNovaParcelaPagar}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                Salvar
              </button>
            </div>
            </>)}
          </div>
        </div>
      )}

      {confirmarDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,.3)", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 24, lineHeight: 1.4 }}>{confirmarDialog.mensagem}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={confirmarDialog.onCancel}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                Cancelar
              </button>
              <button type="button" onClick={confirmarDialog.onConfirm}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "var(--red)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {confirmarDialog.confirmLabel || "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderProducao() {
    const fornecedorNome = (fornecedorId?: string | null) =>
      fornecedoresEvento.find((item) => item.cadastro_id === fornecedorId)
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
      const checklistConcluidos = checklistItens.filter(
        (item) => item.concluido,
      ).length;

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

          {(acao.responsavel_nome ||
            acao.data_limite ||
            acao.fornecedor_id ||
            checklistItens.length > 0) && (
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
                <span>
                  ☑️ {checklistConcluidos}/{checklistItens.length}
                </span>
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
              <option key={item.id} value={item.cadastro_id}>
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
                      producao.find((item) => item.id === acaoAberta.id)
                        ?.titulo || acaoAberta.titulo;
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
                      value={
                        acaoAberta.data_limite
                          ? acaoAberta.data_limite.slice(0, 10)
                          : ""
                      }
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
                        <option key={item.id} value={item.cadastro_id}>
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
                      setAcaoAberta({
                        ...acaoAberta,
                        descricao: e.target.value,
                      })
                    }
                    onBlur={(e) =>
                      atualizarAcaoCampo(
                        acaoAberta,
                        "descricao",
                        e.target.value,
                      )
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
                      disabled={
                        salvando ||
                        !(novoChecklistCartao[acaoAberta.id] || "").trim()
                      }
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
                        <button
                          type="button"
                          onClick={() => alterarChecklist(item)}
                        >
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
                <button
                  type="button"
                  onClick={() => abrirEdicaoEtiqueta(acaoAberta)}
                >
                  🏷️ Etiquetas
                </button>
                <button
                  type="button"
                  onClick={() => abrirEdicaoData(acaoAberta)}
                >
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
                <button
                  type="button"
                  onClick={() => abrirEdicaoMembro(acaoAberta)}
                >
                  👥 Membros
                </button>
                <button
                  type="button"
                  onClick={() => abrirVinculoFornecedor(acaoAberta)}
                >
                  🏢 Fornecedor
                </button>
                <button
                  type="button"
                  onClick={() => abrirEdicaoDescricao(acaoAberta)}
                >
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
          {/* 1. Selecionar fornecedor */}
          <select
            value={novaContratacao.fornecedor_evento_id}
            onChange={(e) => setNovaContratacao({ ...novaContratacao, fornecedor_evento_id: e.target.value, titulo: "" })}
          >
            <option value="">Selecione o fornecedor</option>
            {fornecedoresEvento.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fornecedor?.nome || "Fornecedor"}
              </option>
            ))}
          </select>

          {/* 2. Selecionar do catálogo (se fornecedor selecionado e tiver catálogo) */}
          {(() => {
            const fEvento = fornecedoresEvento.find((f) => f.id === novaContratacao.fornecedor_evento_id);
            const catalogo = fEvento ? fornecedorServicos.filter((s) => s.fornecedor_id === fEvento.cadastro_id) : [];
            if (!novaContratacao.fornecedor_evento_id || catalogo.length === 0) return null;
            return (
              <select
                value=""
                onChange={(e) => {
                  const srv = catalogo.find((s) => s.id === e.target.value);
                  if (srv) setNovaContratacao({ ...novaContratacao, titulo: srv.titulo, valor_contratado: String(srv.preco_venda || "") });
                }}
                style={{ gridColumn: "span 1" }}
              >
                <option value="">📋 Selecionar do catálogo...</option>
                {catalogo.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.titulo}{s.unidade ? ` (${s.unidade})` : ""}{s.preco_venda > 0 ? ` — ${s.preco_venda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                  </option>
                ))}
              </select>
            );
          })()}

          {/* 3. Título (preenchido pelo catálogo ou manual) */}
          <input
            placeholder="Descrição do serviço contratado *"
            value={novaContratacao.titulo}
            onChange={(e) => setNovaContratacao({ ...novaContratacao, titulo: e.target.value })}
            style={{ gridColumn: novaContratacao.fornecedor_evento_id && fornecedorServicos.some((s) => s.fornecedor_id === fornecedoresEvento.find((f) => f.id === novaContratacao.fornecedor_evento_id)?.cadastro_id) ? "span 1" : "span 2" }}
          />

          <input
            placeholder="Valor contratado (R$)"
            value={novaContratacao.valor_contratado}
            onChange={(e) => setNovaContratacao({ ...novaContratacao, valor_contratado: e.target.value })}
          />
          <input
            placeholder="Valor pago (R$)"
            value={novaContratacao.valor_pago}
            onChange={(e) => setNovaContratacao({ ...novaContratacao, valor_pago: e.target.value })}
          />
          <input
            type="date"
            value={novaContratacao.data_vencimento}
            onChange={(e) => setNovaContratacao({ ...novaContratacao, data_vencimento: e.target.value })}
          />
          <button
            onClick={criarContratacao}
            disabled={salvando || !novaContratacao.titulo.trim()}
          >
            + Adicionar serviço
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
                      ·{" "}
                      {fornecedorEvento.fornecedor?.telefone || "Sem telefone"}
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
                      atualizarStatusFornecedor(
                        fornecedorEvento,
                        e.target.value,
                      )
                    }
                  >
                    {STATUS_FORNECEDOR.map((s) => (
                      <option key={s} value={s}>
                        {labelStatus(s)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setAba("fornecedores"); abrirEdicaoFornecedor(fornecedorEvento); }}
                  >
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
                          <strong>
                            {formatarMoeda(toNumber(servico.valor_contratado))}
                          </strong>
                          <span>
                            Pago {formatarMoeda(toNumber(servico.valor_pago))}
                          </span>
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
                          <button
                            type="button"
                            onClick={() => editarContratacao(servico)}
                          >
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
                            onClick={() =>
                              anexarComprovanteContratacao(servico)
                            }
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
                      <strong>
                        {formatarMoeda(toNumber(servico.valor_contratado))}
                      </strong>
                      <span>
                        Pago {formatarMoeda(toNumber(servico.valor_pago))}
                      </span>
                    </div>
                    <div className="org-card-actions compact">
                      <button
                        type="button"
                        onClick={() => editarContratacao(servico)}
                      >
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

          {fornecedoresFiltrados.length === 0 &&
            contratacoesSemFornecedor.length === 0 && (
              <Empty text="Nenhuma contratação encontrada." />
            )}
        </div>
      </Panel>
    );
  }

  function renderFornecedores() {
    const F = novoFornecedor;
    const set = (campo: string, valor: string) =>
      setNovoFornecedor((prev) => ({ ...prev, [campo]: valor }));
    const editando = fornecedorEditandoId !== null;

    function fecharForm() {
      setFornecedorFormAberto(false);
      setFornecedorEditandoId(null);
      setNovoFornecedor({ ...fornecedorVazio });
    }

    return (
      <Panel
        title="Fornecedores"
        subtitle="Cadastro completo de fornecedores vinculados ao evento"
      >
        {/* Botões de ação */}
        {!fornecedorFormAberto && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <button
              onClick={() => { setFornecedorFormAberto(true); setFornecedorEditandoId(null); }}
              style={{ background: "#6d28d9", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 900, cursor: "pointer" }}
            >
              + Novo fornecedor
            </button>
            <button
              onClick={() => setVincularFornecedorAberto((prev) => !prev)}
              style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 20px", fontWeight: 900, cursor: "pointer" }}
            >
              {vincularFornecedorAberto ? "Ocultar fornecedores cadastrados" : "Adicionar fornecedor ao evento"}
            </button>
          </div>
        )}

        {/* Lista de fornecedores já cadastrados pra vincular ao evento */}
        {vincularFornecedorAberto && (
          <div style={{ border: "1px solid var(--line)", borderRadius: 18, padding: 20, marginBottom: 24, background: "var(--card-strong)" }}>
            <div style={{ fontWeight: 900, fontSize: 13, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>
              Fornecedores cadastrados no tenant
            </div>
            {fornecedoresParaSelecao.length === 0 ? (
              <Empty text="Nenhum fornecedor cadastrado ainda. Cadastre em Clientes / Fornecedores ou clique em + Novo fornecedor." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fornecedoresParaSelecao.map((fornecedor) => {
                  const vinculado = fornecedoresEvento.some(
                    (item) => item.cadastro_id === fornecedor.id && item.evento_id === eventoAtual?.id,
                  );
                  return (
                    <label
                      key={fornecedor.id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--line)", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={vinculado}
                        onChange={(e) => alternarFornecedorNoEvento(fornecedor, e.target.checked)}
                      />
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                        {fornecedor.nome.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 14, color: "var(--text)" }}>{fornecedor.nome}</strong>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {labelCategoria(fornecedor.categoria)}{fornecedor.telefone ? ` · ${fornecedor.telefone}` : ""}
                        </div>
                      </div>
                      {vinculado && <span className="org-pill confirmado" style={{ fontSize: 10 }}>No evento</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Formulário modal */}
        {fornecedorFormAberto && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "26px 24px", width: "100%", maxWidth: 720, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span className="org-eyebrow">{editando ? "Editar fornecedor" : "Novo fornecedor"}</span>
              <button onClick={fecharForm} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>✕</button>
            </div>

            <div style={fornecedorModalTabsStyle}>
              {abasFornecedorModal.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setFornecedorAbaModal(a)}
                  style={fornecedorAbaModal === a ? fornecedorModalTabActiveStyle : fornecedorModalTabStyle}
                >
                  {abaFornecedorModalLabel[a]}
                </button>
              ))}
            </div>

            {fornecedorAbaModal === "principais" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <CampoFornecedor label="Tipo de pessoa">
                    <select value={F.tipo_pessoa} onChange={(e) => set("tipo_pessoa", e.target.value)} style={fornecedorInputStyle}>
                      <option value="fisica">Pessoa Física</option>
                      <option value="juridica">Pessoa Jurídica</option>
                    </select>
                  </CampoFornecedor>
                  <CampoFornecedor label="Categoria">
                    <select value={F.categoria} onChange={(e) => set("categoria", e.target.value)} style={fornecedorInputStyle}>
                      {CATEGORIAS_FORNECEDOR.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </CampoFornecedor>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <CampoFornecedor label={F.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={F.documento}
                        onChange={(e) => set("documento", F.tipo_pessoa === "juridica" ? mascararCnpj(e.target.value) : mascararCpf(e.target.value))}
                        placeholder={F.tipo_pessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                        maxLength={F.tipo_pessoa === "juridica" ? 18 : 14}
                        style={{ ...fornecedorInputStyle, flex: 1 }}
                      />
                      {F.tipo_pessoa === "juridica" && (
                        <button type="button" onClick={buscarCnpjFornecedor} disabled={buscandoCnpjFornecedor} style={fornecedorBuscarButtonStyle}>
                          {buscandoCnpjFornecedor ? "..." : "Buscar"}
                        </button>
                      )}
                    </div>
                  </CampoFornecedor>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
                  <CampoFornecedor label="Nome do fornecedor *">
                    <input value={F.nome} onChange={(e) => set("nome", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Código externo">
                    <input value={F.codigo_externo} onChange={(e) => set("codigo_externo", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
                  <CampoFornecedor label="Responsável / contato">
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <input
                          value={F.responsavel_nome}
                          onChange={(e) => {
                            set("responsavel_nome", e.target.value);
                            setNovoFornecedor((prev) => ({ ...prev, responsavel_tenant_contato_id: null }));
                            setResponsavelDropdownAberto(true);
                          }}
                          onFocus={() => setResponsavelDropdownAberto(true)}
                          onBlur={() => setTimeout(() => setResponsavelDropdownAberto(false), 150)}
                          placeholder="Buscar contato..."
                          style={fornecedorInputStyle}
                        />
                        {responsavelDropdownAberto && F.responsavel_nome.trim().length >= 1 && (() => {
                          const termo = F.responsavel_nome.trim().toLowerCase();
                          const filtrados = tenantContatos.filter((c) => c.nome.toLowerCase().includes(termo));
                          if (filtrados.length === 0) return null;
                          return (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.2)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                              {filtrados.map((c) => (
                                <div key={c.id}
                                  onMouseDown={() => {
                                    setNovoFornecedor((prev) => ({
                                      ...prev,
                                      responsavel_nome: c.nome,
                                      responsavel_telefone: c.telefone ? mascararTelefone(c.telefone) : "",
                                      responsavel_tenant_contato_id: c.id,
                                    }));
                                    setResponsavelDropdownAberto(false);
                                  }}
                                  style={{ padding: "9px 14px", fontSize: 13, color: "var(--text)", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-soft)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                  {c.nome}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <button type="button"
                        title="Cadastrar novo contato"
                        onClick={() => { setResponsavelNovoForm({ nome: "", telefone: "", email: "" }); setResponsavelNovoModal(true); }}
                        style={{ padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--primary)", cursor: "pointer", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                        +
                      </button>
                    </div>
                  </CampoFornecedor>
                  <CampoFornecedor label="Telefone do responsável">
                    <input
                      value={F.responsavel_telefone}
                      onChange={(e) => set("responsavel_telefone", mascararTelefone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      readOnly={!!F.responsavel_tenant_contato_id}
                      style={{ ...fornecedorInputStyle, ...(F.responsavel_tenant_contato_id ? { opacity: 0.75 } : {}) }}
                    />
                  </CampoFornecedor>
                </div>

                {responsavelNovoModal && (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 14, background: "var(--card-strong)" }}>
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 10, color: "var(--text)" }}>Novo contato</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
                      <input
                        value={responsavelNovoForm.nome}
                        onChange={(e) => setResponsavelNovoForm({ ...responsavelNovoForm, nome: e.target.value })}
                        placeholder="Nome *"
                        style={fornecedorInputStyle}
                      />
                      <input
                        value={responsavelNovoForm.telefone}
                        onChange={(e) => setResponsavelNovoForm({ ...responsavelNovoForm, telefone: mascararTelefone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        style={fornecedorInputStyle}
                      />
                      <input
                        value={responsavelNovoForm.email}
                        onChange={(e) => setResponsavelNovoForm({ ...responsavelNovoForm, email: e.target.value })}
                        placeholder="E-mail"
                        style={fornecedorInputStyle}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setResponsavelNovoModal(false)}
                        style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                        Cancelar
                      </button>
                      <button type="button" onClick={criarResponsavelContato} disabled={!responsavelNovoForm.nome.trim() || salvando}
                        style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#6d28d9", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
                        Salvar contato
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <CampoFornecedor label="Telefone / WhatsApp">
                    <input
                      value={F.telefone}
                      onChange={(e) => set("telefone", mascararTelefone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="E-mail">
                    <input value={F.email} onChange={(e) => set("email", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Instagram (ex: @nome)">
                    <input value={F.instagram} onChange={(e) => set("instagram", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>
              </>
            )}

            {fornecedorAbaModal === "endereco" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
                  <CampoFornecedor label="CEP">
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={F.cep}
                        onChange={(e) => set("cep", mascararCep(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                        style={{ ...fornecedorInputStyle, flex: 1 }}
                      />
                      <button type="button" onClick={buscarCepFornecedor} disabled={buscandoCepFornecedor} style={fornecedorBuscarButtonStyle}>
                        {buscandoCepFornecedor ? "..." : "Buscar"}
                      </button>
                    </div>
                  </CampoFornecedor>
                  <CampoFornecedor label="Logradouro">
                    <input value={F.endereco} onChange={(e) => set("endereco", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Número">
                    <input value={F.numero} onChange={(e) => set("numero", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <CampoFornecedor label="Complemento">
                    <input value={F.complemento} onChange={(e) => set("complemento", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Bairro">
                    <input value={F.bairro} onChange={(e) => set("bairro", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Cidade">
                    <input value={F.cidade} onChange={(e) => set("cidade", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>
              </>
            )}

            {fornecedorAbaModal === "financeiro" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
                  <CampoFornecedor label="Tipo da chave PIX">
                    <select value={F.pix_tipo} onChange={(e) => set("pix_tipo", e.target.value)} style={fornecedorInputStyle}>
                      <option value="">Selecione...</option>
                      <option value="cpf_cnpj">CPF/CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Aleatória</option>
                    </select>
                  </CampoFornecedor>
                  <CampoFornecedor label="Chave PIX">
                    <input value={F.pix} onChange={(e) => set("pix", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Banco">
                    <input value={F.banco} onChange={(e) => set("banco", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <CampoFornecedor label="Agência">
                    <input value={F.agencia} onChange={(e) => set("agencia", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Dígito da agência">
                    <input value={F.agencia_digito} onChange={(e) => set("agencia_digito", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                  <CampoFornecedor label="Conta">
                    <input value={F.conta} onChange={(e) => set("conta", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <CampoFornecedor label="Dígito da conta">
                    <input value={F.conta_digito} onChange={(e) => set("conta_digito", e.target.value)} style={fornecedorInputStyle} />
                  </CampoFornecedor>
                </div>
              </>
            )}

            {fornecedorAbaModal === "observacao" && (
              <CampoFornecedor label="Observações">
                <textarea
                  value={F.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  rows={6}
                  style={{ ...fornecedorInputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </CampoFornecedor>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={editando ? salvarEdicaoFornecedor : criarFornecedor}
                disabled={salvando || !F.nome.trim()}
                style={{ background: "#6d28d9", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontWeight: 900, cursor: "pointer" }}
              >
                {editando ? "Salvar alterações" : "Adicionar fornecedor"}
              </button>
              <button onClick={fecharForm} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 20px", fontWeight: 800, cursor: "pointer", color: "var(--muted)" }}>
                Cancelar
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Lista */}
        <div className="org-card-list">
          {fornecedoresFiltrados.map((item) => {
            const f = item.fornecedor;
            const membros = fornecedorEquipe.filter((m) => m.fornecedor_id === f?.id);
            const catalogoCount = f ? fornecedorServicos.filter((s) => s.fornecedor_id === f.id).length : 0;
            const expandido = fornecedorExpandido === item.id;
            const abaAtiva = fornecedorAba[item.id] || "dados";
            const formEquipe = f ? getFormFornecedorEquipe(f.id) : null;

            const btnAbaStyle = (aba: string) => ({
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer" as const,
              borderColor: abaAtiva === aba ? "var(--primary)" : "var(--line)",
              background: abaAtiva === aba ? "var(--primary)" : "var(--card-strong)",
              color: abaAtiva === aba ? "#fff" : "var(--muted)",
            });

            const inputStyle = {
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--card-strong)",
              color: "var(--text)",
              fontSize: 13,
              width: "100%",
              boxSizing: "border-box" as const,
            };

            return (
              <div key={item.id} style={{
                background: "var(--card)",
                border: expandido ? "1.5px solid var(--primary)" : "1px solid var(--line)",
                borderRadius: 18,
                boxShadow: "var(--shadow-card)",
                overflow: "hidden",
                transition: "border-color .15s",
              }}>
                {/* Header sempre visível */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}
                  onClick={() => setFornecedorExpandido(expandido ? null : item.id)}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "var(--primary-soft)", color: "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 900, flexShrink: 0,
                  }}>
                    {(f?.nome || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 15, color: "var(--text)" }}>{f?.nome || "Fornecedor"}</strong>
                      <span className={`org-pill ${item.status}`} style={{ fontSize: 10 }}>{labelStatus(item.status)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {labelCategoria(f?.categoria || item.categoria_evento)}
                      {f?.responsavel_nome ? ` · ${f.responsavel_nome}` : ""}
                      {membros.length > 0 ? ` · 👥 ${membros.length} na equipe` : ""}
                      {catalogoCount > 0 ? ` · 📋 ${catalogoCount} serviço${catalogoCount > 1 ? "s" : ""} no catálogo` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={item.status}
                      onChange={(e) => { e.stopPropagation(); atualizarStatusFornecedor(item, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12, padding: "5px 8px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }}
                    >
                      {STATUS_FORNECEDOR.map((s) => (
                        <option key={s} value={s}>{labelStatus(s)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); abrirEdicaoFornecedor(item); }}
                      style={{ background: "none", border: "1px solid var(--line)", borderRadius: 10, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--muted)" }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); excluirFornecedor(item); }}
                      style={{ background: "var(--red-soft)", border: "none", borderRadius: 10, padding: "5px 10px", fontSize: 12, color: "var(--red)", cursor: "pointer" }}
                    >
                      🗑️
                    </button>
                    <span style={{ color: "var(--muted)", fontSize: 16, userSelect: "none" }}>{expandido ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Corpo expandido com abas */}
                {expandido && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: "16px 20px 20px" }}>
                    {/* Mini abas */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      <button type="button" style={btnAbaStyle("dados")} onClick={() => setFornecedorAba((p) => ({ ...p, [item.id]: "dados" }))}>
                        📋 Dados
                      </button>
                      <button type="button" style={btnAbaStyle("equipe")} onClick={() => setFornecedorAba((p) => ({ ...p, [item.id]: "equipe" }))}>
                        👥 Equipe {membros.length > 0 ? `(${membros.length})` : ""}
                      </button>
                      <button type="button" style={btnAbaStyle("servicos")} onClick={() => setFornecedorAba((p) => ({ ...p, [item.id]: "servicos" }))}>
                        📋 Catálogo {catalogoCount > 0 ? `(${catalogoCount})` : ""}
                      </button>
                    </div>

                    {/* ABA: DADOS */}
                    {abaAtiva === "dados" && f && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[
                          { label: "Responsável", value: f.responsavel_nome },
                          { label: "Telefone", value: f.telefone },
                          { label: "E-mail", value: f.email },
                          { label: "Instagram", value: f.instagram },
                          { label: "Documento", value: f.cpf_cnpj },
                          { label: "Endereço", value: f.logradouro },
                          { label: "PIX", value: f.pix_chave },
                        ].filter((row) => row.value).map((row) => (
                          <div key={row.label} style={{ background: "var(--card-strong)", borderRadius: 10, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 2 }}>{row.label}</div>
                            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{row.value}</div>
                          </div>
                        ))}
                        {f.observacoes && (
                          <div style={{ gridColumn: "span 2", background: "var(--card-strong)", borderRadius: 10, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 2 }}>Observações</div>
                            <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>{f.observacoes}</div>
                          </div>
                        )}
                        {![f.responsavel_nome, f.telefone, f.email, f.instagram, f.cpf_cnpj, f.logradouro, f.pix_chave, f.observacoes].some(Boolean) && (
                          <div style={{ gridColumn: "span 2", color: "var(--muted)", fontSize: 13 }}>Nenhum dado cadastrado além do nome.</div>
                        )}
                      </div>
                    )}

                    {/* ABA: EQUIPE */}
                    {abaAtiva === "equipe" && f && (
                      <div>
                        {membros.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                            {membros.map((m) => {
                              const editando = fornecedorEquipeEditando === m.id;
                              return (
                                <div key={m.id} style={{ background: "var(--card-strong)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                                  {/* Linha normal */}
                                  {!editando && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                                        {m.nome.charAt(0).toUpperCase()}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: 13 }}>{m.nome}</div>
                                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                                          {m.funcao || "Sem função"}
                                          {m.telefone ? ` · ${m.telefone}` : ""}
                                          {m.horario_inicio ? ` · ${hora(m.horario_inicio)}` : ""}
                                          {m.horario_fim ? `–${hora(m.horario_fim)}` : ""}
                                        </div>
                                      </div>
                                      <button type="button" onClick={() => abrirEdicaoFornecedorEquipe(m)}
                                        style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                                        ✏️ Editar
                                      </button>
                                      <button type="button" onClick={() => excluirFornecedorEquipeMembro(m)}
                                        style={{ background: "var(--red-soft)", color: "var(--red)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>
                                        🗑️
                                      </button>
                                    </div>
                                  )}
                                  {/* Linha de edição inline */}
                                  {editando && (
                                    <div style={{ padding: "12px 14px" }}>
                                      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                                        Editando: <span style={{ color: "var(--text)" }}>{m.nome}</span>
                                      </div>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
                                        {["Nome", "Função", "Telefone"].map((label) => (
                                          <div key={label} style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", paddingLeft: 4 }}>{label}</div>
                                        ))}
                                      </div>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                                        <input value={fornecedorEquipeEditForm.nome} onChange={(e) => setFornecedorEquipeEditForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome *" style={inputStyle} />
                                        <input list="funcoes-equipe-fornecedor" value={fornecedorEquipeEditForm.funcao} onChange={(e) => setFornecedorEquipeEditForm((p) => ({ ...p, funcao: e.target.value }))} placeholder="Função" style={inputStyle} />
                                        <input value={fornecedorEquipeEditForm.telefone} onChange={(e) => setFornecedorEquipeEditForm((p) => ({ ...p, telefone: e.target.value }))} placeholder="Telefone" style={inputStyle} />
                                      </div>
                                      <div style={{ display: "flex", gap: 8 }}>
                                        <button type="button" onClick={() => salvarEdicaoFornecedorEquipe(m)} disabled={fornecedorEquipeSalvando}
                                          style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                                          Salvar
                                        </button>
                                        <button type="button" onClick={() => setFornecedorEquipeEditando(null)}
                                          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "var(--muted)" }}>
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {formEquipe && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                            <input placeholder="Nome *" value={formEquipe.nome} onChange={(e) => setFormFornecedorEquipe(f.id, "nome", e.target.value)} style={inputStyle} />
                            <input list="funcoes-equipe-fornecedor" placeholder="Função" value={formEquipe.funcao} onChange={(e) => setFormFornecedorEquipe(f.id, "funcao", e.target.value)} style={inputStyle} />
                            <input placeholder="Telefone" value={formEquipe.telefone} onChange={(e) => setFormFornecedorEquipe(f.id, "telefone", e.target.value)} style={inputStyle} />
                            <button type="button" disabled={!formEquipe.nome.trim() || fornecedorEquipeSalvando}
                              onClick={() => criarFornecedorEquipeMembro(f.id)}
                              style={{ background: formEquipe.nome.trim() ? "var(--primary)" : "var(--card-strong)", color: formEquipe.nome.trim() ? "#fff" : "var(--muted)", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                              + Adicionar
                            </button>
                          </div>
                        )}
                        {membros.length === 0 && !formEquipe?.nome && (
                          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Nenhum membro. Preencha acima para adicionar.</p>
                        )}
                      </div>
                    )}

                    {/* ABA: SERVIÇOS (Catálogo do fornecedor) */}
                    {abaAtiva === "servicos" && f && (() => {
                      const catalogo = fornecedorServicos.filter((s) => s.fornecedor_id === f.id);
                      const formCat = getNovoFornecedorServico(f.id);
                      const fmt = (v: number) => v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
                      return (
                        <div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
                            Cadastre aqui os serviços que <strong>{f.nome}</strong> oferece. Eles ficarão disponíveis para seleção em <em>Serviços Contratados</em>.
                          </div>

                          {catalogo.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 16, border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                              {/* Cabeçalho */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 120px 32px", gap: 12, padding: "8px 14px", background: "var(--card-strong)" }}>
                                {["Serviço", "Unid.", "Preço Custo", "Preço Venda", ""].map((h) => (
                                  <div key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>{h}</div>
                                ))}
                              </div>
                              {catalogo.map((s, idx) => (
                                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 120px 32px", gap: 12, padding: "10px 14px", background: idx % 2 === 0 ? "var(--card)" : "var(--card-strong)", alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.titulo}</div>
                                    {s.descricao && <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.descricao}</div>}
                                  </div>
                                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{s.unidade || "—"}</div>
                                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{fmt(s.preco_custo)}</div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--green)" }}>{fmt(s.preco_venda)}</div>
                                  <button type="button" onClick={() => excluirFornecedorServico(s)}
                                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14 }}>✕</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Formulário de adição */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 120px auto", gap: 8, alignItems: "end" }}>
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>Serviço *</div>
                              <input placeholder="Ex: Locação M2 Painel LED Montagem Chapada" value={formCat.titulo}
                                onChange={(e) => setNovoFornecedorServico((p) => ({ ...p, [f.id]: { ...getNovoFornecedorServico(f.id), titulo: e.target.value } }))}
                                style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>Unid.</div>
                              <input list="unidades-medida" placeholder="m², un..." value={formCat.unidade}
                                onChange={(e) => setNovoFornecedorServico((p) => ({ ...p, [f.id]: { ...getNovoFornecedorServico(f.id), unidade: e.target.value } }))}
                                style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>Preço Custo</div>
                              <input placeholder="R$ 0,00" value={formCat.preco_custo}
                                onChange={(e) => setNovoFornecedorServico((p) => ({ ...p, [f.id]: { ...getNovoFornecedorServico(f.id), preco_custo: e.target.value } }))}
                                style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>Preço Venda</div>
                              <input placeholder="R$ 0,00" value={formCat.preco_venda}
                                onChange={(e) => setNovoFornecedorServico((p) => ({ ...p, [f.id]: { ...getNovoFornecedorServico(f.id), preco_venda: e.target.value } }))}
                                style={inputStyle} />
                            </div>
                            <button type="button" disabled={!formCat.titulo.trim()}
                              onClick={() => criarFornecedorServico(f.id)}
                              style={{ background: formCat.titulo.trim() ? "var(--primary)" : "var(--card-strong)", color: formCat.titulo.trim() ? "#fff" : "var(--muted)", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                              + Adicionar
                            </button>
                          </div>
                          <datalist id="unidades-medida">
                            <option value="un" /><option value="m²" /><option value="m" />
                            <option value="m³" /><option value="kg" /><option value="h" />
                            <option value="dia" /><option value="par" /><option value="pç" />
                          </datalist>

                          {catalogo.length === 0 && (
                            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Nenhum serviço no catálogo. Adicione acima.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
          {fornecedoresFiltrados.length === 0 && (
            <Empty text="Nenhum fornecedor cadastrado para este evento." />
          )}
        </div>

        <datalist id="funcoes-equipe-fornecedor">
          <option value="Cerimonialista" />
          <option value="Produtor" />
          <option value="DJ / Sonorização" />
          <option value="Fotógrafo" />
          <option value="Videomaker" />
          <option value="Mestre de Cerimônias" />
          <option value="Segurança" />
          <option value="Recepcionista" />
          <option value="Buffet" />
          <option value="Decorador" />
          <option value="Iluminador" />
          <option value="Assessor" />
        </datalist>
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
            {/* 1. Fornecedor */}
            <select
              value={novaContratacao.fornecedor_evento_id}
              onChange={(e) => setNovaContratacao({ ...novaContratacao, fornecedor_evento_id: e.target.value, titulo: "" })}
            >
              <option value="">Selecione o fornecedor</option>
              {fornecedoresEvento.map((f) => (
                <option key={f.id} value={f.id}>{f.fornecedor?.nome || "Fornecedor"}</option>
              ))}
            </select>

            {/* 2. Catálogo do fornecedor (aparece se tiver itens) */}
            {(() => {
              const fEvento = fornecedoresEvento.find((f) => f.id === novaContratacao.fornecedor_evento_id);
              const catalogo = fEvento ? fornecedorServicos.filter((s) => s.fornecedor_id === fEvento.cadastro_id) : [];
              if (!fEvento || catalogo.length === 0) return null;
              return (
                <select
                  value=""
                  onChange={(e) => {
                    const srv = catalogo.find((s) => s.id === e.target.value);
                    if (srv) setNovaContratacao({ ...novaContratacao, titulo: srv.titulo, valor_contratado: String(srv.preco_venda || "") });
                  }}
                >
                  <option value="">📋 Selecionar do catálogo...</option>
                  {catalogo.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titulo}{s.unidade ? ` (${s.unidade})` : ""}{s.preco_venda > 0 ? ` — ${s.preco_venda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                    </option>
                  ))}
                </select>
              );
            })()}

            {/* 3. Título */}
            <input
              placeholder="Descrição do serviço *"
              value={novaContratacao.titulo}
              onChange={(e) => setNovaContratacao({ ...novaContratacao, titulo: e.target.value })}
            />
            <input
              placeholder="Valor contratado (R$)"
              value={novaContratacao.valor_contratado}
              onChange={(e) => setNovaContratacao({ ...novaContratacao, valor_contratado: e.target.value })}
            />
            <input
              placeholder="Valor pago (R$)"
              value={novaContratacao.valor_pago}
              onChange={(e) => setNovaContratacao({ ...novaContratacao, valor_pago: e.target.value })}
            />
            <input
              type="date"
              value={novaContratacao.data_vencimento}
              onChange={(e) => setNovaContratacao({ ...novaContratacao, data_vencimento: e.target.value })}
            />
            <button onClick={criarContratacao} disabled={salvando || !novaContratacao.titulo.trim()}>
              + Adicionar
            </button>
          </div>
        )}
        {/* Agrupado por fornecedor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {fornecedoresEvento.length === 0 && (
            <Empty text="Nenhum fornecedor vinculado ao evento." />
          )}
          {fornecedoresEvento.map((fEvento) => {
            const contratacoesDoForn = contratacoes.filter((c) => c.fornecedor_evento_id === fEvento.id);
            const totalPago = contratacoesDoForn.reduce((s, c) => s + toNumber(c.valor_pago), 0);
            const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            // Montar linhas: cada contratacao + seus itens (ou a própria contratacao como linha)
            const linhas: { codigo: string; item: string; unidade: string; qtd: number; precoVenda: number; total: number; contratacaoId: string; itemId?: string; contratacao?: Contratacao }[] = [];
            let codigoIdx = 1;
            contratacoesDoForn.forEach((c) => {
              const itens = contratacaoItens.filter((i) => i.contratacao_id === c.id);
              if (itens.length > 0) {
                itens.forEach((i) => {
                  const qtdTotal = (i.quantidade_item || 1) * (i.quantidade || 1);
                  linhas.push({
                    codigo: String(codigoIdx++).padStart(3, "0"),
                    item: i.titulo,
                    unidade: i.unidade || "",
                    qtd: qtdTotal,
                    precoVenda: i.preco_venda || 0,
                    total: qtdTotal * (i.preco_venda || 0),
                    contratacaoId: c.id,
                    itemId: i.id,
                    contratacao: c,
                  });
                });
              } else {
                const edit = contratacaoEdits[c.id];
                const qtdEfetiva = edit ? (Number(edit.qtd) || 1) : (c.quantidade || 1);
                const unidadeEfetiva = edit ? edit.unidade : (c.unidade || "");
                linhas.push({
                  codigo: String(codigoIdx++).padStart(3, "0"),
                  item: c.titulo,
                  unidade: unidadeEfetiva,
                  qtd: qtdEfetiva,
                  precoVenda: toNumber(c.valor_contratado),
                  total: qtdEfetiva * toNumber(c.valor_contratado),
                  contratacaoId: c.id,
                  contratacao: c,
                });
              }
            });

            return (
              <div key={fEvento.id} style={{ border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                {/* Header do fornecedor */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--card-strong)", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>
                      {(fEvento.fornecedor?.nome || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "var(--text)" }}>{fEvento.fornecedor?.nome || "Fornecedor"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{labelCategoria(fEvento.fornecedor?.categoria || fEvento.categoria_evento)}</div>
                    </div>
                    <span className={`org-pill ${fEvento.status}`} style={{ fontSize: 10 }}>{labelStatus(fEvento.status)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", color: "var(--muted)" }}>Total</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>{fmt(linhas.reduce((s, l) => s + l.total, 0))}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", color: "var(--muted)" }}>Pago</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "var(--green)" }}>{fmt(totalPago)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", color: "var(--muted)" }}>Pendente</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: linhas.reduce((s, l) => s + l.total, 0) - totalPago > 0 ? "var(--red)" : "var(--green)" }}>{fmt(linhas.reduce((s, l) => s + l.total, 0) - totalPago)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={fEvento.status} onChange={(e) => atualizarStatusFornecedor(fEvento, e.target.value)}
                        style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }}>
                        {STATUS_FORNECEDOR.map((s) => <option key={s} value={s}>{labelStatus(s)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Barra de ações rápidas do orçamento */}
                {contratacoesDoForn.length > 0 && (() => {
                  const totalAprovado = linhas.filter((l) => l.contratacao?.status_aprovacao === "aprovado").reduce((s, l) => s + l.total, 0);
                  const todoAprovado = contratacoesDoForn.every((c) => c.status_aprovacao === "aprovado");
                  const algumAprovado = contratacoesDoForn.some((c) => c.status_aprovacao === "aprovado");
                  return (
                    <div style={{ padding: "10px 20px", background: "var(--card-strong)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                        {algumAprovado && <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>✅ Aprovado: {fmt(totalAprovado)}</span>}
                        {!todoAprovado && <span style={{ fontSize: 12, color: "var(--muted)" }}>Proposta pendente de aprovação</span>}
                      </div>
                      {!todoAprovado && (
                        <button type="button" onClick={() => contratacoesDoForn.forEach((c) => aprovarContratacao(c))}
                          style={{ fontSize: 12, padding: "6px 16px", borderRadius: 20, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 800 }}>
                          ✅ Aprovar Tudo
                        </button>
                      )}
                      {todoAprovado && (
                        <button type="button" onClick={() => contratacoesDoForn.forEach((c) => cancelarContratacao(c))}
                          style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "var(--card)", color: "var(--muted)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700 }}>
                          Cancelar aprovação
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Tabela de itens */}
                {linhas.length > 0 ? (
                  <div style={{ background: "var(--card)" }}>
                    {/* Cabeçalho */}
                    <div style={{ display: "grid", gridTemplateColumns: "36px 60px 1fr 100px 80px 130px 130px 80px", gap: 10, padding: "8px 20px", background: "var(--card-strong)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                      {["✓", "Código", "Item", "Un. Med.", "Qtd", "Preço Venda", "Preço Total", ""].map((h) => (
                        <div key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>{h}</div>
                      ))}
                    </div>
                    {linhas.map((linha, idx) => {
                      const isContratacaoDireta = !linha.itemId && linha.contratacao;
                      const edit = linha.contratacao ? contratacaoEdits[linha.contratacao.id] : undefined;
                      const hasEdits = !!edit;
                      const inlineInput: React.CSSProperties = { fontSize: 12, padding: "4px 8px", borderRadius: 8, border: `1px solid ${hasEdits ? "var(--primary)" : "var(--line)"}`, background: "var(--card)", color: "var(--text)", width: "100%" };
                      // Approval state per row
                      const itemObj = linha.itemId ? contratacaoItens.find((i) => i.id === linha.itemId) : null;
                      const contratacaoAprovada = linha.contratacao?.status_aprovacao === "aprovado";
                      const itemAprovado = itemObj ? itemObj.aprovado : contratacaoAprovada;
                      const rowAprovado = linha.itemId ? (itemObj?.aprovado ?? false) : contratacaoAprovada;
                      return (
                        <div key={linha.codigo} style={{ display: "grid", gridTemplateColumns: "36px 60px 1fr 100px 80px 130px 130px 80px", gap: 10, padding: "10px 20px", background: rowAprovado ? "rgba(34,197,94,.06)" : idx % 2 === 0 ? "var(--card)" : "var(--card-strong)", alignItems: "center", borderBottom: "1px solid var(--line)", borderLeft: rowAprovado ? "3px solid var(--green)" : "3px solid transparent" }}>
                          {/* Checkbox aprovação */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {linha.itemId ? (
                              <input type="checkbox" checked={itemObj?.aprovado ?? false}
                                onChange={() => itemObj && toggleItemAprovado(itemObj)}
                                style={{ width: 16, height: 16, accentColor: "var(--green)", cursor: "pointer" }} />
                            ) : (
                              <input type="checkbox" checked={contratacaoAprovada}
                                onChange={() => linha.contratacao && (contratacaoAprovada ? cancelarContratacao(linha.contratacao) : aprovarContratacao(linha.contratacao))}
                                style={{ width: 16, height: 16, accentColor: "var(--green)", cursor: "pointer" }} />
                            )}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>{linha.codigo}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: rowAprovado ? "var(--green)" : "var(--text)" }}>{linha.item}</div>
                          {isContratacaoDireta ? (
                            <input list="unidades-medida-sc"
                              value={edit?.unidade ?? (linha.contratacao!.unidade || "")}
                              placeholder="m², un, h..."
                              onChange={(e) => setContratacaoEdits((prev) => ({
                                ...prev,
                                [linha.contratacao!.id]: { qtd: prev[linha.contratacao!.id]?.qtd ?? String(linha.contratacao!.quantidade || 1), unidade: e.target.value }
                              }))}
                              style={inlineInput} />
                          ) : (
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{linha.unidade || "—"}</div>
                          )}
                          {isContratacaoDireta ? (
                            <input type="number" min="1"
                              value={edit?.qtd ?? String(linha.contratacao!.quantidade || 1)}
                              onChange={(e) => setContratacaoEdits((prev) => ({
                                ...prev,
                                [linha.contratacao!.id]: { unidade: prev[linha.contratacao!.id]?.unidade ?? (linha.contratacao!.unidade || ""), qtd: e.target.value }
                              }))}
                              style={{ ...inlineInput, textAlign: "center" }} />
                          ) : (
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", textAlign: "center" }}>{linha.qtd}</div>
                          )}
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>{fmt(linha.precoVenda)}</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: rowAprovado ? "var(--green)" : "var(--text)" }}>{fmt(linha.total)}</div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {isContratacaoDireta && hasEdits && (
                              <button type="button" onClick={() => salvarContratacaoEdits(linha.contratacao!)}
                                style={{ background: "var(--primary)", border: "none", color: "#fff", cursor: "pointer", fontSize: 11, padding: "4px 8px", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" }}>
                                Salvar
                              </button>
                            )}
                            <button type="button" onClick={() => {
                              const c = contratacoesDoForn.find((x) => x.id === linha.contratacaoId);
                              if (c) excluirContratacao(c);
                            }} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14, padding: 0 }}>🗑️</button>
                          </div>
                        </div>
                      );
                    })}
                    <datalist id="unidades-medida-sc">
                      <option value="un" /><option value="m²" /><option value="m" />
                      <option value="m³" /><option value="kg" /><option value="h" />
                      <option value="dia" /><option value="par" /><option value="pç" />
                    </datalist>
                    {/* Total + ações */}
                    {(() => {
                      const totalGeral = linhas.reduce((s, l) => s + l.total, 0);
                      const aprovadas = contratacoesDoForn.filter((c) => c.status_aprovacao === "aprovado");
                      const totalParcelasDoForn = parcelas.filter((p) => contratacoesDoForn.some((c) => c.id === p.contratacao_id));
                      // Para NF e parcelas: usa primeira aprovada (ou abre seleção se múltiplas)
                      const primeiraAprovada = aprovadas[0];
                      const temNF = aprovadas.some((c) => c.nf_numero);
                      const nfLabel = aprovadas.find((c) => c.nf_numero)?.nf_numero;
                      return (
                        <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", background: "var(--primary-soft)", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".06em", flex: 1 }}>Total do fornecedor</div>
                          {aprovadas.length > 0 && (
                            <>
                              <button type="button" onClick={() => { if (primeiraAprovada) { setNfModal(primeiraAprovada.id); setNfForm({ nf_numero: primeiraAprovada.nf_numero || "", nf_data: primeiraAprovada.nf_data || "", nf_valor: primeiraAprovada.nf_valor ? String(primeiraAprovada.nf_valor) : String(totalGeral) }); } }}
                                style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: temNF ? "var(--primary-soft)" : "var(--card)", color: temNF ? "var(--primary)" : "var(--muted)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                                {temNF ? `📄 NF ${nfLabel}` : "📄 Emitir NF"}
                              </button>
                              <button type="button" onClick={() => { if (primeiraAprovada) { const nP = 1; const dataI = primeiraAprovada.data_vencimento || ""; const nomeForn = fEvento.fornecedor?.nome || "Fornecedor"; setParcelaForm({ numero_parcelas: String(nP), valor_total: String(totalGeral), data_inicio: dataI, forma_pagamento: primeiraAprovada.forma_pagamento || "", documento: "" }); setParcelasPreview(calcularParcelasPreview(nP, totalGeral, dataI, nomeForn)); setParcelaModalTitulo(nomeForn); setParcelaModal(primeiraAprovada.id); } }}
                                style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: totalParcelasDoForn.length > 0 ? "var(--primary-soft)" : "var(--card)", color: totalParcelasDoForn.length > 0 ? "var(--primary)" : "var(--muted)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                                💰 {totalParcelasDoForn.length > 0 ? `${totalParcelasDoForn.length} parcela(s)` : "Contas a Receber"}
                              </button>
                            </>
                          )}
                          <div style={{ fontSize: 15, fontWeight: 900, color: "var(--primary)" }}>{fmt(totalGeral)}</div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ padding: "20px", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
                    Nenhum serviço contratado. Adicione acima selecionando este fornecedor.
                  </div>
                )}

                {/* Modal NF */}
                {contratacoesDoForn.some((c) => c.id === nfModal) && (() => {
                  const c = contratacoesDoForn.find((c) => c.id === nfModal)!;
                  return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ background: "var(--card)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
                        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: "var(--text)" }}>📄 Nota Fiscal — {c.titulo}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <input placeholder="Número da NF" value={nfForm.nf_numero} onChange={(e) => setNfForm({ ...nfForm, nf_numero: e.target.value })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 14 }} />
                          <input type="date" value={nfForm.nf_data} onChange={(e) => setNfForm({ ...nfForm, nf_data: e.target.value })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 14 }} />
                          <input placeholder="Valor (R$)" value={nfForm.nf_valor} onChange={(e) => setNfForm({ ...nfForm, nf_valor: e.target.value })} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--text)", fontSize: 14 }} />
                          <div style={{ display: "flex", gap: 10 }}>
                            <button type="button" onClick={() => setNfModal(null)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--muted)", cursor: "pointer", fontWeight: 700 }}>Cancelar</button>
                            <button type="button" onClick={() => salvarNF(c)} style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Salvar NF</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal Parcelas */}
                {contratacoesDoForn.some((c) => c.id === parcelaModal) && (() => {
                  const c = contratacoesDoForn.find((c) => c.id === parcelaModal)!;
                  const n = Math.max(1, parseInt(parcelaForm.numero_parcelas) || 1);
                  const valorTotal = Number(parcelaForm.valor_total) || 0;
                  const preview = parcelasPreview.length === n ? parcelasPreview : calcularParcelasPreview(n, valorTotal, parcelaForm.data_inicio, c.titulo);
                  const inputSt = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 13, width: "100%" };
                  return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                      <div style={{ background: "var(--card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
                        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4, color: "var(--text)" }}>💰 Contas a Receber</div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{parcelaModalTitulo || c.titulo}</div>
                        {/* Configuração */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Nº Parcelas</div>
                            <input type="number" min="1" max="60" value={parcelaForm.numero_parcelas}
                              onChange={(e) => { const novo = { ...parcelaForm, numero_parcelas: e.target.value }; setParcelaForm(novo); setParcelasPreview(calcularParcelasPreview(Math.max(1, parseInt(e.target.value) || 1), Number(novo.valor_total) || 0, novo.data_inicio, c.titulo)); }}
                              style={inputSt} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Valor Total (R$)</div>
                            <input value={parcelaForm.valor_total}
                              onChange={(e) => { const novo = { ...parcelaForm, valor_total: e.target.value }; setParcelaForm(novo); setParcelasPreview(calcularParcelasPreview(n, Number(e.target.value) || 0, novo.data_inicio, c.titulo)); }}
                              style={inputSt} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Forma Pgto</div>
                            <select value={parcelaForm.forma_pagamento} onChange={(e) => setParcelaForm({ ...parcelaForm, forma_pagamento: e.target.value })} style={inputSt}>
                              <option value="">—</option>
                              <option value="pix">PIX</option>
                              <option value="transferencia">Transferência</option>
                              <option value="boleto">Boleto</option>
                              <option value="cartao_credito">Cartão Crédito</option>
                              <option value="dinheiro">Dinheiro</option>
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Documento</div>
                            <select value={parcelaForm.documento} onChange={(e) => setParcelaForm({ ...parcelaForm, documento: e.target.value })} style={inputSt}>
                              <option value="">Selecione...</option>
                              <option value="boleto">Boleto</option>
                              <option value="comprovante">Comprovante</option>
                              <option value="cupom_fiscal">Cupom Fiscal</option>
                              <option value="duplicata">Duplicata</option>
                              <option value="nota_fiscal">Nota Fiscal</option>
                              <option value="previsao">Previsão</option>
                              <option value="outros">Outros</option>
                            </select>
                          </div>
                        </div>
                        {/* Tabela de parcelas editáveis */}
                        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 16 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 100px", gap: 8, padding: "8px 12px", background: "var(--card-strong)" }}>
                            {["Nº", "Descrição", "Vencimento", "Valor (R$)"].map((h) => (
                              <div key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: "var(--muted)" }}>{h}</div>
                            ))}
                          </div>
                          {preview.map((p, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 100px", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--line)", alignItems: "center", background: i % 2 === 0 ? "var(--card)" : "var(--card-strong)" }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>{String(i + 1).padStart(2, "0")}</div>
                              <input value={p.descricao} onChange={(e) => { const np = [...preview]; np[i] = { ...np[i], descricao: e.target.value }; setParcelasPreview(np); }} style={{ ...inputSt, fontSize: 12, padding: "4px 8px" }} />
                              <input type="date" value={p.data}
                                onChange={(e) => { const np = [...preview]; np[i] = { ...np[i], data: e.target.value }; setParcelasPreview(np); }}
                                style={{ ...inputSt, fontSize: 12, padding: "4px 8px" }} />
                              <input value={p.valor} onChange={(e) => { const np = [...preview]; np[i] = { ...np[i], valor: e.target.value }; setParcelasPreview(np); }} style={{ ...inputSt, fontSize: 12, padding: "4px 8px", textAlign: "right" }} />
                            </div>
                          ))}
                          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 100px", gap: 8, padding: "8px 12px", background: "var(--primary-soft)", borderTop: "1px solid var(--line)" }}>
                            <div />
                            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--primary)" }}>Total</div>
                            <div />
                            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--primary)", textAlign: "right" }}>
                              {preview.reduce((s, p) => s + (Number(p.valor) || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button type="button" onClick={() => { setParcelaModal(null); setParcelasPreview([]); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong)", color: "var(--muted)", cursor: "pointer", fontWeight: 700 }}>Cancelar</button>
                          <button type="button" onClick={() => gerarParcelas(c, preview)} style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Salvar Parcelas</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </Panel>
    );
  }

  function renderFinanceiroSubAbas() {
    return (
      <div style={{ display: "flex", gap: 4, background: "var(--card-strong)", borderRadius: 10, padding: 4 }}>
        {[
          { value: "receber" as const, label: "Contas a Receber" },
          { value: "pagar" as const, label: "Contas a Pagar" },
        ].map((tab) => (
          <button key={tab.value} type="button" onClick={() => setFinanceiroSubAba(tab.value)}
            style={{
              fontSize: 11, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap",
              background: financeiroSubAba === tab.value ? "var(--primary)" : "transparent",
              color: financeiroSubAba === tab.value ? "#fff" : "var(--muted)",
            }}>
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderFinanceiroPagar() {
    const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const hoje = new Date().toISOString().split("T")[0];

    const parcelasPagar = parcelas.filter((p) => p.tipo === "pagar");
    const totalPago = parcelasPagar.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0);
    const totalPendente = parcelasPagar.filter((p) => p.status !== "pago").reduce((s, p) => s + p.valor, 0);
    const totalVencido = parcelasPagar.filter((p) => p.status !== "pago" && p.data_vencimento && p.data_vencimento < hoje).reduce((s, p) => s + p.valor, 0);
    const totalGeral = parcelasPagar.reduce((s, p) => s + p.valor, 0);

    return (
      <Panel title="Financeiro" subtitle="Contas a pagar — fornecedores e despesas"
        headerExtra={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {renderFinanceiroSubAbas()}
            <button onClick={() => { setNovaParcelaPagarModal(true); setNovaParcelaPagarForm({ numero_doc: "", competencia: "", data_emissao: "", data_vencimento: "", numero_parcelas: "1", valor: "", fornecedor: "", plano_de_contas: "", empresa: "", conta_corrente: "", centro_de_custo: "", historico: "", forma_pagamento: "", documento: "" }); }}
              style={{ fontSize: 12, padding: "7px 14px", borderRadius: 10, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
              + Criar
            </button>
          </div>
        }>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "A Pagar", value: totalGeral, color: "var(--primary)" },
            { label: "Pago", value: totalPago, color: "var(--green)" },
            { label: "Vencido", value: totalVencido, color: "var(--red)" },
          ].map((m) => (
            <div key={m.label} style={{ background: "var(--card-strong)", borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{fmt(m.value)}</div>
            </div>
          ))}
        </div>

        {parcelasPagar.length === 0 ? (
          <Empty text="Nenhuma conta a pagar cadastrada. Clique em '+ Criar' para lançar." />
        ) : (
          <div style={{ border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 110px 120px 110px 120px 100px", gap: 10, padding: "8px 18px", background: "var(--card-strong)", borderBottom: "1px solid var(--line)" }}>
              {["Nº", "Fornecedor", "Descrição", "Vencimento", "Valor", "Pagamento", "Status", ""].map((h) => (
                <div key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>{h}</div>
              ))}
            </div>
            {parcelasPagar.map((p, idx) => {
              const vencida = p.status !== "pago" && p.data_vencimento && p.data_vencimento < hoje;
              const statusColor = p.status === "pago" ? "var(--green)" : vencida ? "var(--red)" : "var(--yellow)";
              const statusLabel = p.status === "pago" ? "Pago" : vencida ? "Vencido" : "Pendente";
              const fornecedorNome = fornecedoresCadastrados.find((f) => f.id === p.cadastro_fornecedor_id)?.nome || "—";
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 110px 120px 110px 120px 100px", gap: 10, padding: "10px 18px", background: idx % 2 === 0 ? "var(--card)" : "var(--card-strong)", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>{String(p.numero).padStart(2, "0")}</div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{fornecedorNome}</div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{p.descricao || "—"}</div>
                  <div style={{ fontSize: 12, color: vencida ? "var(--red)" : "var(--muted)" }}>{p.data_vencimento ? new Date(p.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{fmt(p.valor)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.data_pagamento ? new Date(p.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                    {p.status === "pago" ? (
                      <button type="button" onClick={() => reabrirParcela(p)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--card-strong)", color: "var(--muted)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>↩ Reabrir</button>
                    ) : liquidando[p.id] !== undefined ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input type="date" value={liquidando[p.id]} onChange={(e) => setLiquidando((prev) => ({ ...prev, [p.id]: e.target.value }))} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--primary)", background: "var(--card)", color: "var(--text)", width: 120 }} />
                        <button type="button" onClick={() => marcarParcelaPaga(p, liquidando[p.id])} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>✓ OK</button>
                        <button type="button" onClick={() => setLiquidando((prev) => { const n = { ...prev }; delete n[p.id]; return n; })} style={{ fontSize: 11, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setLiquidando((prev) => ({ ...prev, [p.id]: new Date().toISOString().split("T")[0] }))} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>✓ Pago</button>
                    )}
                    <button type="button" onClick={() => excluirParcela(p)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13, padding: 0 }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    );
  }

  function renderFinanceiro() {
    if (financeiroSubAba === "pagar") return renderFinanceiroPagar();

    const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const hoje = new Date().toISOString().split("T")[0];

    const parcelasReceber = parcelas.filter((p) => p.tipo !== "pagar");

    const totalRecebido = parcelasReceber.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0);
    const totalPendente = parcelasReceber.filter((p) => p.status !== "pago").reduce((s, p) => s + p.valor, 0);
    const totalVencido = parcelasReceber.filter((p) => p.status !== "pago" && p.data_vencimento && p.data_vencimento < hoje).reduce((s, p) => s + p.valor, 0);
    const totalGeral = parcelasReceber.reduce((s, p) => s + p.valor, 0);
    // Total aprovado no orçamento (mesmo sem parcelas geradas)
    const totalAprovado = contratacoes.filter((c) => c.status_aprovacao === "aprovado").reduce((s, c) => s + toNumber(c.valor_contratado), 0);

    // Agrupar por fornecedor (via contratação)
    const fornecedoresComParcelas = fornecedoresEvento.filter((fe) =>
      contratacoes.some((c) => c.fornecedor_evento_id === fe.id && parcelasReceber.some((p) => p.contratacao_id === c.id))
    );

    const parcelasAvulsas = parcelasReceber.filter((p) => !p.contratacao_id);

    return (
      <Panel title="Financeiro" subtitle="Contas a receber — parcelas aprovadas pelo cliente"
        headerExtra={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {renderFinanceiroSubAbas()}
            <button onClick={() => { setNovaParcelaModal(true); setNovaParcelaForm({ numero_doc: "", competencia: "", data_emissao: "", data_vencimento: "", numero_parcelas: "1", valor: "", cliente: "", plano_de_contas: "", empresa: "", conta_corrente: "", centro_de_custo: "", historico: "", forma_pagamento: "", documento: "" }); }}
              style={{ fontSize: 12, padding: "7px 14px", borderRadius: 10, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
              + Criar
            </button>
          </div>
        }>
        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Aprovado", value: totalAprovado, color: "var(--text)" },
            { label: "A Receber", value: totalGeral > 0 ? totalGeral : totalAprovado, color: "var(--primary)" },
            { label: "Recebido", value: totalRecebido, color: "var(--green)" },
            { label: "Vencido", value: totalVencido, color: "var(--red)" },
          ].map((m) => (
            <div key={m.label} style={{ background: "var(--card-strong)", borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{fmt(m.value)}</div>
            </div>
          ))}
        </div>

        {parcelasReceber.length === 0 ? (
          <Empty text="Nenhuma parcela cadastrada. Clique em '+ Criar' para lançar ou em '💰 Contas a Receber' em Serviços Contratados." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {parcelasAvulsas.length > 0 && (
              <div style={{ border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", background: "var(--card-strong)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15 }}>A</div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: "var(--text)" }}>Avulso</div>
                  <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{fmt(parcelasAvulsas.reduce((s, p) => s + p.valor, 0))}</div>
                </div>
                <div style={{ background: "var(--card)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 110px 120px 110px 120px 100px", gap: 10, padding: "8px 18px", background: "var(--card-strong)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                    {["Nº", "Descrição", "Vencimento", "Valor", "Pagamento", "Status", ""].map((h) => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>{h}</div>
                    ))}
                  </div>
                  {parcelasAvulsas.map((p, idx) => {
                    const vencida = p.status !== "pago" && p.data_vencimento && p.data_vencimento < hoje;
                    const statusColor = p.status === "pago" ? "var(--green)" : vencida ? "var(--red)" : "var(--yellow)";
                    const statusLabel = p.status === "pago" ? "Recebido" : vencida ? "Vencido" : "Pendente";
                    return (
                      <div key={p.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 110px 120px 110px 120px 100px", gap: 10, padding: "10px 18px", background: idx % 2 === 0 ? "var(--card)" : "var(--card-strong)", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>{String(p.numero).padStart(2, "0")}</div>
                        <div style={{ fontSize: 13, color: "var(--text)" }}>{p.descricao || "—"}</div>
                        <div style={{ fontSize: 12, color: vencida ? "var(--red)" : "var(--muted)" }}>{p.data_vencimento ? new Date(p.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{fmt(p.valor)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.data_pagamento ? new Date(p.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                          {p.status === "pago" ? (
                            <button type="button" onClick={() => reabrirParcela(p)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--card-strong)", color: "var(--muted)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>↩ Reabrir</button>
                          ) : liquidando[p.id] !== undefined ? (
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <input type="date" value={liquidando[p.id]} onChange={(e) => setLiquidando((prev) => ({ ...prev, [p.id]: e.target.value }))} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--primary)", background: "var(--card)", color: "var(--text)", width: 120 }} />
                              <button type="button" onClick={() => marcarParcelaPaga(p, liquidando[p.id])} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>✓ OK</button>
                              <button type="button" onClick={() => setLiquidando((prev) => { const n = { ...prev }; delete n[p.id]; return n; })} style={{ fontSize: 11, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>✕</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setLiquidando((prev) => ({ ...prev, [p.id]: new Date().toISOString().split("T")[0] }))} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>✓ Recebido</button>
                          )}
                          <button type="button" onClick={() => excluirParcela(p)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13, padding: 0 }}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {fornecedoresComParcelas.map((fe) => {
              const contratsDoForn = contratacoes.filter((c) => c.fornecedor_evento_id === fe.id);
              const parcelasDoForn = parcelas.filter((p) => p.contratacao_id && contratsDoForn.some((c) => c.id === p.contratacao_id));
              if (parcelasDoForn.length === 0) return null;
              return (
                <div key={fe.id} style={{ border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "12px 18px", background: "var(--card-strong)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15 }}>
                      {(fe.fornecedor?.nome || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: "var(--text)" }}>{fe.fornecedor?.nome || "Fornecedor"}</div>
                    <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                      {fmt(parcelasDoForn.reduce((s, p) => s + p.valor, 0))}
                    </div>
                  </div>
                  {/* Tabela de parcelas */}
                  <div style={{ background: "var(--card)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 110px 120px 110px 120px 100px", gap: 10, padding: "8px 18px", background: "var(--card-strong)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                      {["Nº", "Descrição", "Vencimento", "Valor", "Pagamento", "Status", ""].map((h) => (
                        <div key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>{h}</div>
                      ))}
                    </div>
                    {parcelasDoForn.map((p, idx) => {
                      const vencida = p.status !== "pago" && p.data_vencimento && p.data_vencimento < hoje;
                      const statusColor = p.status === "pago" ? "var(--green)" : vencida ? "var(--red)" : "var(--yellow)";
                      const statusLabel = p.status === "pago" ? "Recebido" : vencida ? "Vencido" : "Pendente";
                      return (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 110px 120px 110px 120px 100px", gap: 10, padding: "10px 18px", background: idx % 2 === 0 ? "var(--card)" : "var(--card-strong)", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>{String(p.numero).padStart(2, "0")}</div>
                          <div style={{ fontSize: 13, color: "var(--text)" }}>{p.descricao || "—"}</div>
                          <div style={{ fontSize: 12, color: vencida ? "var(--red)" : "var(--muted)" }}>
                            {p.data_vencimento ? new Date(p.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{fmt(p.valor)}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {p.data_pagamento ? new Date(p.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                          </div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                            {p.status === "pago" ? (
                              <button type="button" onClick={() => reabrirParcela(p)}
                                style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--card-strong)", color: "var(--muted)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                                ↩ Reabrir
                              </button>
                            ) : liquidando[p.id] !== undefined ? (
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input type="date" value={liquidando[p.id]}
                                  onChange={(e) => setLiquidando((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                  style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--primary)", background: "var(--card)", color: "var(--text)", width: 120 }} />
                                <button type="button" onClick={() => marcarParcelaPaga(p, liquidando[p.id])}
                                  style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                                  ✓ OK
                                </button>
                                <button type="button" onClick={() => setLiquidando((prev) => { const n = { ...prev }; delete n[p.id]; return n; })}
                                  style={{ fontSize: 11, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>✕</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setLiquidando((prev) => ({ ...prev, [p.id]: new Date().toISOString().split("T")[0] }))}
                                style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                                ✓ Recebido
                              </button>
                            )}
                            <button type="button" onClick={() => excluirParcela(p)}
                              style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13, padding: 0 }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            <span>
              Use um modelo inicial e ajuste horários, responsáveis e itens
              depois.
            </span>
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
              <div
                key={
                  item.id ||
                  `${item.titulo || "roteiro"}-${item.data_inicio || ""}`
                }
                className="org-timeline-row roteiro-com-checklist"
              >
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
                  {item.descricao ? (
                    <small>{String(item.descricao)}</small>
                  ) : null}

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
                        <p className="org-muted">
                          Nenhum checklist vinculado a este item do roteiro.
                        </p>
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
                              aria-label={
                                check.concluido
                                  ? "Reabrir item"
                                  : "Concluir item"
                              }
                            >
                              {check.concluido ? "✓" : ""}
                            </button>
                            <span>{String(check.item || "")}</span>
                            <button
                              type="button"
                              onClick={() => alterarChecklist(check)}
                            >
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
                        disabled={
                          salvando ||
                          !(novoChecklistRoteiro[item.id] || "").trim()
                        }
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="org-row-actions">
                    <button
                      type="button"
                      onClick={() => abrirEdicaoAgenda(item)}
                    >
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
          <div className="org-modal-backdrop" onClick={fecharEdicaoAgenda}>
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
      <Panel
        title="Adicionar Membro ao Evento"
        subtitle="Selecione membros da sua equipe para este evento."
      >
        <div className="org-equipe-head-actions single">
          <div className="org-equipe-title-note">
            <strong>Equipe disponível para o evento</strong>
            <span>Cadastre uma vez e marque quem vai trabalhar no evento selecionado.</span>
          </div>

          <div className="org-equipe-menu-wrap">
            <button
              type="button"
              className="org-equipe-primary"
              onClick={() => {
                setAbaCadastroEquipe("interna");
                setCadastroEquipeAberto(true);
              }}
            >
              + Gerenciar equipe
            </button>
          </div>
        </div>

        <div className="org-equipe-event-row">
          <label>Evento *</label>
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

        <div className="org-equipe-table">
          <div className="org-equipe-table-head">
            <span>Membro da equipe</span>
            <span>Evento</span>
            <span>Função no evento</span>
            <span>Horário</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {equipeParaSelecao.map((item) => {
            const selecionado = item.evento_id === eventoAtual?.id;
            return (
              <div
                key={item.id}
                className={`org-equipe-table-row ${selecionado ? "selected" : ""}`}
              >
                <div className="org-equipe-member-cell">
                  <input
                    type="checkbox"
                    checked={selecionado}
                    onChange={(e) =>
                      alternarMembroNoEvento(item, e.target.checked)
                    }
                  />
                  <div className="org-avatar">👤</div>
                  <div>
                    {item.contato_principal ? (
                      <span className="org-pill confirmado">Principal</span>
                    ) : null}
                    <strong>{item.nome}</strong>
                    <small>{item.telefone || "Sem telefone"}</small>
                  </div>
                </div>

                <div className="org-equipe-event-cell">
                  <strong>
                    {selecionado
                      ? eventoAtual?.nome || "Evento sem nome"
                      : "Disponível"}
                  </strong>
                  <small>
                    {selecionado && eventoAtual
                      ? formatarDataEvento(eventoAtual)
                      : "Selecione para este evento"}
                  </small>
                </div>

                <select
                  value={item.funcao}
                  disabled={!selecionado}
                  onChange={(e) =>
                    atualizarCampoEquipe(item, "funcao", e.target.value)
                  }
                >
                  <option value={item.funcao}>{item.funcao}</option>
                  <option value="Produtor">Produtor</option>
                  <option value="Atendimento">Atendimento</option>
                  <option value="Montador">Montador</option>
                  <option value="Cerimonial">Cerimonial</option>
                  <option value="Segurança">Segurança</option>
                  <option value="Recepção">Recepção</option>
                </select>

                <div className="org-equipe-time-inputs">
                  <input
                    type="time"
                    value={
                      hora(item.horario_inicio) === "--:--"
                        ? ""
                        : hora(item.horario_inicio)
                    }
                    disabled={!selecionado}
                    onChange={(e) =>
                      atualizarCampoEquipe(
                        item,
                        "horario_inicio",
                        e.target.value,
                      )
                    }
                  />
                  <span>até</span>
                  <input
                    type="time"
                    value={
                      hora(item.horario_fim) === "--:--"
                        ? ""
                        : hora(item.horario_fim)
                    }
                    disabled={!selecionado}
                    onChange={(e) =>
                      atualizarCampoEquipe(item, "horario_fim", e.target.value)
                    }
                  />
                </div>

                <select
                  value={selecionado ? item.status : "disponivel"}
                  disabled={!selecionado}
                  onChange={(e) => atualizarStatusEquipe(item, e.target.value)}
                >
                  <option value="disponivel">Disponível</option>
                  <option value="convidado">Convidado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="presente">Presente</option>
                  <option value="ausente">Ausente</option>
                  <option value="cancelado">Cancelado</option>
                </select>

                <div className="org-card-actions equipe-actions">
                  <span
                    className={`org-pill ${selecionado ? item.status : "disponivel"}`}
                  >
                    {selecionado ? labelStatus(item.status) : "Disponível"}
                  </span>
                  {selecionado && (
                    <a
                      href={`/credencial/equipe/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "var(--primary-soft)",
                        color: "var(--primary)",
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                        border: "1px solid var(--primary)",
                      }}
                    >
                      🪪 Credencial
                    </a>
                  )}
                  <button type="button" onClick={() => editarEquipe(item)}>
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => excluirEquipe(item)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {equipeParaSelecao.length === 0 && (
            <Empty text="Nenhum membro vinculado a este evento." />
          )}
        </div>

        <div className="org-equipe-table fornecedores-selecao">
          <div className="org-equipe-table-head fornecedor-head">
            <span>Equipe dos fornecedores</span>
            <span>Fornecedor</span>
            <span>Categoria</span>
            <span>Status no evento</span>
            <span>Ações</span>
          </div>

          {fornecedoresParaSelecao.map((fornecedor) => {
            const vinculo = fornecedoresEvento.find(
              (item) =>
                item.cadastro_id === fornecedor.id &&
                item.evento_id === eventoAtual?.id,
            );
            const selecionado = Boolean(vinculo);

            return (
              <div
                key={fornecedor.id}
                className={`org-equipe-table-row fornecedor-row ${selecionado ? "selected" : ""}`}
              >
                <div className="org-equipe-member-cell">
                  <input
                    type="checkbox"
                    checked={selecionado}
                    onChange={(e) =>
                      alternarFornecedorNoEvento(fornecedor, e.target.checked)
                    }
                  />
                  <div className="org-avatar">🏢</div>
                  <div>
                    <strong>{fornecedor.responsavel_nome || fornecedor.nome}</strong>
                    <small>{fornecedor.telefone || "Sem telefone"}</small>
                  </div>
                </div>

                <div className="org-equipe-event-cell">
                  <strong>{fornecedor.nome}</strong>
                  <small>{fornecedor.email || "Fornecedor cadastrado"}</small>
                </div>

                <span className="org-pill disponivel">
                  {fornecedor.categoria || "Fornecedor"}
                </span>

                <span className={`org-pill ${selecionado ? vinculo?.status || "confirmado" : "disponivel"}`}>
                  {selecionado ? labelStatus(vinculo?.status || "confirmado") : "Disponível"}
                </span>

                <div className="org-card-actions equipe-actions">
                  <button
                    type="button"
                    onClick={() => vinculo && abrirEdicaoFornecedor(vinculo)}
                    disabled={!selecionado || !vinculo}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            );
          })}

          {fornecedoresParaSelecao.length === 0 && (
            <Empty text="Nenhum fornecedor cadastrado. Use Gerenciar equipe para cadastrar fornecedores." />
          )}
        </div>

        <div className="org-equipe-info">
          ℹ️ Marque a equipe interna e os fornecedores que vão trabalhar neste evento.
        </div>

        <div className="org-equipe-footer">
          <button type="button" className="secondary">
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={salvando || equipeDoEvento.length === 0}
          >
            Adicionar ao evento
          </button>
        </div>

        {cadastroEquipeAberto ? (
          <div className="org-modal-backdrop">
            <div className="org-equipe-modal">
              <div className="org-agenda-modal-header">
                <div>
                  <h2>Cadastro da Equipe</h2>
                  <p>
                    Cadastre e gerencie os membros que fazem parte da equipe
                    fixa.
                  </p>
                </div>
                <button
                  type="button"
                  className="org-modal-close static"
                  onClick={() => setCadastroEquipeAberto(false)}
                >
                  ×
                </button>
              </div>

              <div className="org-equipe-modal-tabs">
                <button
                  type="button"
                  className={abaCadastroEquipe === "interna" ? "active" : ""}
                  onClick={() => setAbaCadastroEquipe("interna")}
                >
                  Equipe interna
                </button>
                <button
                  type="button"
                  className={abaCadastroEquipe === "fornecedores" ? "active" : ""}
                  onClick={() => setAbaCadastroEquipe("fornecedores")}
                >
                  Equipe dos fornecedores
                </button>
              </div>

              {abaCadastroEquipe === "interna" ? (
              <>
              <div className="org-form-grid equipe cadastro">
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
                    salvando ||
                    !novoEquipe.nome.trim() ||
                    !novoEquipe.funcao.trim()
                  }
                >
                  + Novo membro
                </button>
              </div>

              <div className="org-card-list">
                {equipeParaSelecao.map((item) => (
                  <div
                    key={item.id}
                    className="org-item-card equipe-cadastro-card"
                  >
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
                    <div className="org-card-actions">
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
              </div>
              </>
              ) : (
              <div className="org-fornecedor-equipe-tab">
                <div className="org-equipe-info fornecedor">
                  ℹ️ Cadastre a equipe dos fornecedores uma vez. Depois marque, na tela principal, quais fornecedores trabalharão no evento selecionado.
                </div>

                <div className="org-form-grid fornecedor cadastro">
                  <input
                    placeholder="Nome do fornecedor"
                    value={novoFornecedor.nome}
                    onChange={(e) =>
                      setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })
                    }
                  />
                  <input
                    placeholder="Responsável / membro"
                    value={novoFornecedor.responsavel_nome}
                    onChange={(e) =>
                      setNovoFornecedor({
                        ...novoFornecedor,
                        responsavel_nome: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="Categoria"
                    value={novoFornecedor.categoria}
                    onChange={(e) =>
                      setNovoFornecedor({
                        ...novoFornecedor,
                        categoria: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="Telefone"
                    value={novoFornecedor.telefone}
                    onChange={(e) =>
                      setNovoFornecedor({
                        ...novoFornecedor,
                        telefone: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={criarFornecedor}
                    disabled={salvando || !novoFornecedor.nome.trim()}
                  >
                    + Novo fornecedor
                  </button>
                </div>

                <div className="org-card-list">
                  {fornecedoresCadastrados.map((fornecedor) => {
                    const vinculado = fornecedoresEvento.some(
                      (item) => item.cadastro_id === fornecedor.id,
                    );

                    return (
                      <div
                        key={fornecedor.id}
                        className="org-item-card equipe-cadastro-card fornecedor-equipe-card"
                      >
                        <div className="org-item-main">
                          <span className={`org-pill ${vinculado ? "confirmado" : "disponivel"}`}>
                            {vinculado ? "No evento" : "Cadastrado"}
                          </span>
                          <h3>{fornecedor.responsavel_nome || fornecedor.nome}</h3>
                          <p>
                            {fornecedor.nome} · {fornecedor.categoria || "Sem categoria"}
                          </p>
                          <p>
                            {fornecedor.telefone || "Sem telefone"}
                            {fornecedor.email ? ` · ${fornecedor.email}` : ""}
                          </p>
                        </div>
                        <div className="org-card-actions">
                          <span className="org-pill disponivel">Fornecedor</span>
                        </div>
                      </div>
                    );
                  })}

                  {fornecedoresCadastrados.length === 0 ? (
                    <Empty text="Nenhum fornecedor cadastrado." />
                  ) : null}
                </div>
              </div>
              )}
            </div>
          </div>
        ) : null}
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
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <section className="org-panel">
      <div className="org-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {headerExtra && <div style={{ marginLeft: "auto" }}>{headerExtra}</div>}
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

function CampoFornecedor({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fornecedorCampoWrapperStyle}>
      <span style={fornecedorCampoLabelStyle}>{label}</span>
      {children}
    </div>
  );
}

const fornecedorModalTabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  marginBottom: 18,
  borderBottom: "1px solid var(--line)",
  flexWrap: "wrap",
};

const fornecedorModalTabStyle: React.CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderBottom: "2px solid transparent",
  background: "none",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const fornecedorModalTabActiveStyle: React.CSSProperties = {
  ...fornecedorModalTabStyle,
  color: "var(--primary)",
  borderBottom: "2px solid var(--primary)",
};

const fornecedorInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 700,
  outline: "none",
};

const fornecedorBuscarButtonStyle: React.CSSProperties = {
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const fornecedorCampoWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const fornecedorCampoLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

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

function mascararCep(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function mascararCnpj(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  return digitos
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function mascararCpf(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascararTelefone(valor: string) {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length > 11) digitos = digitos.slice(2);
  digitos = digitos.slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
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
  const dataBase = (evento.data_inicio || evento.data_evento || "").slice(
    0,
    10,
  );
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
.organizacao-page { display: flex; flex-direction: column; gap: 22px; color: var(--text); }
.org-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; background: var(--card); border: 1px solid var(--line); border-radius: 24px; padding: 28px 32px; box-shadow: 0 18px 45px rgba(15,23,42,0.07); }
.org-eyebrow { color: #6d28d9; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
.org-header h1 { margin: 4px 0 6px; font-size: clamp(30px, 5vw, 48px); line-height: 1; letter-spacing: -.06em; }
.org-header p { margin: 0; color: var(--muted); font-weight: 600; max-width: 720px; }
.org-event-select { min-width: 280px; padding: 14px; border-radius: 16px; background: var(--card-strong); border: 1px solid var(--line); }
.org-event-select label { display: block; font-size: 12px; font-weight: 900; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .08em; }
.org-event-select select, .org-toolbar input, .org-form-grid input, .org-form-grid select, .org-item-card select { width: 100%; border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px 13px; background: var(--card); color: var(--text); font-weight: 700; outline: none; }
.org-alert { padding: 14px 16px; border-radius: 18px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-weight: 800; }
.org-empty, .org-empty-inline { padding: 22px; border-radius: 20px; border: 1px dashed #cbd5e1; color: var(--muted); font-weight: 800; background: var(--card-strong); text-align: center; }
.org-summary-card { ${styleToCss(cardStyle)} box-shadow: 0 18px 45px rgba(15,23,42,0.08); display: flex; justify-content: space-between; gap: 18px; padding: 24px; align-items: center; }
.org-summary-card h2 { margin: 10px 0 6px; font-size: 28px; letter-spacing: -.04em; }
.org-summary-card p { margin: 0; color: var(--muted); font-weight: 700; }
.org-badge, .org-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 900; background: #ede9fe; color: #5b21b6; text-transform: uppercase; letter-spacing: .04em; font-style: normal; }
.org-progress-box { min-width: 210px; }
.org-progress-box strong { font-size: 36px; letter-spacing: -.05em; display: block; }
.org-progress-box span, .org-muted { color: var(--muted); font-weight: 700; }
.org-progress { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 10px; }
.org-progress.big { height: 14px; }
.org-progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6d28d9, #10b981); }
.org-metrics-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
.org-metric { ${styleToCss(cardStyle)} box-shadow: 0 10px 28px rgba(15,23,42,0.07); padding: 18px; min-height: 120px; display: flex; flex-direction: column; justify-content: space-between; }
.org-metric span { color: var(--muted); font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
.org-metric strong { font-size: 28px; letter-spacing: -.05em; }
.org-metric small { color: var(--muted); font-weight: 700; }
.org-metric.danger strong { color: #dc2626; }
.org-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.org-toolbar input { max-width: 320px; }
.org-tabs, .org-subtabs { display: flex; flex-wrap: wrap; gap: 8px; }
.org-tabs button, .org-subtabs button, .org-form-grid button { border: 0; border-radius: 999px; padding: 12px 16px; background: var(--card); color: var(--muted); font-weight: 900; cursor: pointer; border: 1px solid var(--line); }
.org-tabs button.active, .org-subtabs button.active, .org-form-grid button { background: #6d28d9; color: #fff; border-color: #6d28d9; }
.org-form-grid button:disabled { opacity: .55; cursor: not-allowed; }
.org-subtabs { margin: -4px 0 0; }
.org-grid-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.org-panel { ${styleToCss(cardStyle)} box-shadow: 0 10px 28px rgba(15,23,42,0.07); padding: 20px; }
.org-panel-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.org-panel h2 { margin: 0; font-size: 22px; letter-spacing: -.04em; }
.org-panel p { margin: 4px 0 0; color: var(--muted); font-weight: 700; }
.org-template-actions { display: grid; grid-template-columns: minmax(0, 1fr) 280px auto; gap: 12px; align-items: center; padding: 16px; border: 1px solid var(--line); border-radius: 22px; background: var(--card-strong); margin-bottom: 16px; }
.org-template-actions strong { display: block; color: var(--text); font-size: 16px; font-weight: 950; }
.org-template-actions span { display: block; color: var(--muted); font-weight: 800; margin-top: 4px; }
.org-template-actions select { width: 100%; border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px 13px; background: var(--card); color: var(--text); font-weight: 800; outline: none; }
.org-template-actions button { border: 0; border-radius: 999px; padding: 12px 18px; background: #6d28d9; color: #fff; font-weight: 950; cursor: pointer; white-space: nowrap; }
.org-template-actions button:disabled { opacity: .55; cursor: not-allowed; }
.org-form-grid { display: grid; gap: 10px; margin-bottom: 16px; }
.org-form-grid.five { grid-template-columns: 1.4fr 1fr .8fr .75fr auto; }
.org-form-grid.fornecedor { grid-template-columns: 1.3fr .8fr .8fr 1fr .8fr auto; }
.org-form-grid.contratacao { grid-template-columns: 1.2fr 1fr .75fr .75fr .75fr auto; }
.org-form-grid.roteiro { grid-template-columns: 1.2fr .9fr .9fr .9fr auto; }
.org-form-grid.equipe, .org-form-grid.checklist { grid-template-columns: 1fr 1fr .85fr .65fr auto; }
.org-card-list, .org-list { display: flex; flex-direction: column; gap: 10px; }
.org-item-card, .org-mini-row, .org-check-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid var(--line); background: var(--card); border-radius: 18px; padding: 14px; }
.org-checklist-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 14px; border-radius: 18px; background: var(--card-strong); border: 1px solid var(--line); }
.org-checklist-actions button { border: 0; border-radius: 999px; padding: 12px 16px; background: #6d28d9; color: #fff; font-weight: 900; cursor: pointer; }
.org-checklist-actions button:disabled { opacity: .55; cursor: not-allowed; }
.org-checklist-actions span { color: var(--muted); font-weight: 800; font-size: 13px; }
.org-check-content { flex: 1; min-width: 0; }
.org-check-toggle { width: 32px; height: 32px; border-radius: 10px; border: 1px solid #cbd5e1; background: var(--card); color: #16a34a; font-weight: 900; cursor: pointer; }
.org-row-actions, .org-card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.org-card-actions { justify-content: flex-end; }
.org-card-actions.compact { max-width: 460px; }
.org-item-main { min-width: 0; flex: 1; }
.org-row-actions button, .org-card-actions button { border: 1px solid var(--line); background: var(--card); color: var(--muted); border-radius: 999px; padding: 9px 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.org-row-actions button:disabled, .org-card-actions button:disabled { opacity: .55; cursor: not-allowed; }
.org-row-actions button.danger, .org-card-actions button.danger { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
.org-item-card h3, .org-mini-row strong, .org-check-row h3 { margin: 6px 0 4px; font-size: 16px; letter-spacing: -.02em; }
.org-item-card p, .org-mini-row span, .org-check-row p { margin: 0; color: var(--muted); font-weight: 700; font-size: 13px; }
.org-item-card select { max-width: 190px; }
.org-card-actions select { min-width: 165px; }
.org-pill.concluido, .org-pill.pago, .org-pill.confirmado, .org-pill.presente, .org-pill.contratado { background: #dcfce7; color: #166534; }
.org-pill.atrasado, .org-pill.vencido, .org-pill.alta, .org-pill.critica { background: #fee2e2; color: #991b1b; }
.org-pill.pendente, .org-pill.parcial, .org-pill.negociando, .org-pill.orcamento, .org-pill.media { background: #fef3c7; color: #92400e; }
.org-pill.cancelado, .org-pill.ausente, .org-pill.dispensado { background: var(--card-strong); color: var(--muted); }
.org-finance-values { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; min-width: 170px; }
.org-finance-values strong { font-size: 18px; }
.org-finance-values span { color: var(--muted); font-weight: 800; font-size: 12px; }
.org-money-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.org-money-grid div { padding: 16px; border-radius: 18px; background: var(--card-strong); border: 1px solid var(--line); }
.org-money-grid span { display: block; color: var(--muted); font-weight: 900; font-size: 12px; text-transform: uppercase; }
.org-money-grid strong { display: block; margin-top: 8px; font-size: 20px; letter-spacing: -.04em; }
.org-timeline { display: flex; flex-direction: column; gap: 12px; }
.org-timeline-row { display: grid; grid-template-columns: 74px 16px 1fr; gap: 12px; align-items: start; }
.org-time { display: flex; flex-direction: column; align-items: flex-end; color: var(--muted); font-weight: 900; }
.org-time span { color: #94a3b8; font-size: 12px; }
.org-dot { width: 14px; height: 14px; border-radius: 999px; background: #6d28d9; margin-top: 4px; box-shadow: 0 0 0 5px #ede9fe; }
.org-timeline-row h3 { margin: 0 0 4px; font-size: 17px; }
.org-timeline-content .org-row-actions { margin-top: 10px; }
.org-timeline-row p, .org-timeline-row small { margin: 0; color: var(--muted); font-weight: 700; }
.org-check { display: flex; align-items: center; gap: 8px; font-weight: 900; color: var(--muted); }
.org-check-row { width: 100%; text-align: left; cursor: pointer; }
.org-check-row span { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #cbd5e1; border-radius: 9px; color: #fff; font-weight: 900; flex: 0 0 auto; }
.org-check-row.done span { background: #16a34a; border-color: #16a34a; }
.org-check-row.done h3 { text-decoration: line-through; color: var(--muted); }

.org-section-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; padding: 14px; border-radius: 18px; background: var(--card-strong); border: 1px solid var(--line); }
.org-section-toolbar strong { display: block; font-size: 15px; letter-spacing: -.02em; }
.org-section-toolbar span { display: block; color: var(--muted); font-weight: 700; font-size: 13px; margin-top: 2px; }
.org-view-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 5px; border-radius: 999px; background: var(--card); border: 1px solid var(--line); }
.org-view-toggle button { border: 0; border-radius: 999px; padding: 9px 13px; background: transparent; color: var(--muted); font-weight: 900; cursor: pointer; }
.org-view-toggle button.active { background: #6d28d9; color: #fff; }
.org-form-grid.producao { grid-template-columns: 1.35fr .9fr .9fr .75fr .75fr 1fr auto; }
.org-kanban { display: grid; grid-template-columns: repeat(5, minmax(240px, 1fr)); gap: 12px; align-items: stretch; overflow-x: auto; padding-bottom: 6px; }
.org-kanban-column { min-width: 240px; border-radius: 22px; background: var(--card-strong); border: 1px solid var(--line); padding: 12px; }
.org-kanban-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.org-kanban-head strong { display: block; font-size: 15px; letter-spacing: -.02em; }
.org-kanban-head span { display: block; margin-top: 3px; color: var(--muted); font-weight: 700; font-size: 12px; line-height: 1.35; }
.org-kanban-head em { min-width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: var(--card); color: var(--text); font-weight: 900; font-style: normal; border: 1px solid var(--line); }
.org-kanban-list { display: flex; flex-direction: column; gap: 10px; }
.org-kanban-card { align-items: stretch; flex-direction: column; }
.org-kanban-card .org-card-actions { justify-content: flex-start; }
.org-calendar-list { display: flex; flex-direction: column; gap: 10px; }
.org-calendar-row { display: grid; grid-template-columns: 150px 1fr auto; gap: 12px; align-items: center; padding: 14px; border: 1px solid var(--line); border-radius: 18px; background: var(--card); }
.org-calendar-date { font-weight: 950; color: #6d28d9; }
.org-calendar-content strong { display: block; color: var(--text); }
.org-calendar-content span { display: block; color: var(--muted); font-weight: 700; font-size: 13px; margin-top: 3px; }
.org-calendar-row button { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 9px 12px; font-weight: 900; cursor: pointer; }

.org-pill.ideia { background: #e0f2fe; color: #075985; }
.org-pill.a_fazer { background: #ede9fe; color: #5b21b6; }
.org-pill.aguardando_terceiro { background: #ffedd5; color: #9a3412; }


.org-trello-board { display: grid; grid-template-columns: repeat(5, minmax(280px, 1fr)); gap: 14px; align-items: stretch; overflow-x: auto; padding-bottom: 8px; }
.org-trello-column { min-width: 280px; border-radius: 24px; background: var(--card-strong); border: 1px solid var(--line); padding: 14px; }
.org-trello-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.org-trello-head strong { display: block; font-size: 16px; letter-spacing: -.02em; color: var(--text); }
.org-trello-head span { display: block; margin-top: 3px; color: var(--muted); font-weight: 750; font-size: 12px; line-height: 1.35; }
.org-trello-head em { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: var(--card); color: var(--text); font-weight: 950; font-style: normal; border: 1px solid var(--line); }
.org-trello-list { display: flex; flex-direction: column; gap: 10px; }
.org-trello-column.drop-enabled { outline: 2px dashed rgba(124,58,237,.35); outline-offset: -6px; }
.org-trello-card { border: 1px solid #dbe3ef; border-radius: 18px; background: var(--card); padding: 12px; box-shadow: 0 8px 18px rgba(15,23,42,.06); }
.org-trello-card.dragging { opacity: .55; transform: rotate(1deg); }
.org-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.org-category-tag, .org-priority-tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 8px; font-weight: 900; font-size: 11px; background: #ede9fe; color: #5b21b6; }
.org-priority-tag.alta, .org-priority-tag.urgente { background: #fee2e2; color: #991b1b; }
.org-priority-tag.media { background: #fef3c7; color: #92400e; }
.org-priority-tag.baixa { background: #dcfce7; color: #166534; }
.org-card-title-button { width: 100%; text-align: left; border: 0; background: transparent; padding: 0; color: var(--text); cursor: pointer; font-weight: 950; font-size: 15px; line-height: 1.25; }
.org-card-title-button:hover { color: #6d28d9; }
.org-card-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; color: var(--muted); font-weight: 800; font-size: 12px; }
.org-card-meta .danger { color: #b91c1c; background: #fee2e2; border-radius: 999px; padding: 2px 6px; }
.org-card-footer-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.org-card-footer-actions button, .org-quick-card button, .org-actions-table button { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 7px 9px; font-size: 12px; font-weight: 900; cursor: pointer; color: var(--text); }
.org-card-footer-actions button:hover, .org-quick-card button:hover, .org-actions-table button:hover { border-color: #7c3aed; color: #6d28d9; }
.org-quick-card { border: 1px dashed #cbd5e1; border-radius: 18px; padding: 10px; background: rgba(255,255,255,.75); display: grid; gap: 8px; }
.org-quick-card input, .org-quick-card select { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; font-weight: 800; background: var(--card); color: var(--text); }
.org-actions-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 22px; background: var(--card); }
.org-actions-table { width: 100%; border-collapse: collapse; min-width: 980px; }
.org-actions-table th, .org-actions-table td { text-align: left; padding: 14px; border-bottom: 1px solid #e2e8f0; color: var(--text); font-weight: 750; }
.org-actions-table th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; background: var(--card-strong); }
.org-actions-table tr:last-child td { border-bottom: 0; }
.org-danger-text { color: #b91c1c !important; font-weight: 950 !important; }
.org-timeline-view { position: relative; display: flex; flex-direction: column; gap: 14px; padding-left: 20px; }
.org-timeline-view:before { content: ""; position: absolute; left: 35px; top: 10px; bottom: 10px; width: 3px; border-radius: 999px; background: linear-gradient(180deg, #7c3aed, #14b8a6); }
.org-timeline-item { position: relative; display: grid; grid-template-columns: 52px 1fr; gap: 12px; align-items: stretch; }
.org-timeline-marker { position: relative; z-index: 1; display: flex; justify-content: center; padding-top: 14px; }
.org-timeline-marker span { width: 34px; height: 34px; border-radius: 999px; background: var(--card); border: 3px solid #7c3aed; display: inline-flex; align-items: center; justify-content: center; font-weight: 950; color: #6d28d9; }
.org-timeline-card { border: 1px solid var(--line); border-radius: 22px; background: var(--card); padding: 16px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; box-shadow: 0 10px 24px rgba(15,23,42,.05); }
.org-timeline-card h3 { margin: 5px 0; color: var(--text); }
.org-timeline-card p { margin: 0; color: var(--muted); font-weight: 800; }
.org-timeline-date { color: #6d28d9; font-weight: 950; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
.org-without-date { border: 1px dashed #cbd5e1; border-radius: 20px; padding: 14px 16px; background: var(--card-strong); display: flex; flex-direction: column; gap: 3px; color: var(--muted); font-weight: 800; }
.org-without-date strong { color: var(--text); }
.org-modal-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
.org-card-modal { width: min(1120px, 96vw); max-height: 90vh; overflow: auto; background: var(--card-strong); border-radius: 26px; border: 1px solid var(--line); box-shadow: 0 30px 80px rgba(15,23,42,.3); display: grid; grid-template-columns: 1fr 280px; }
.org-card-modal-main { padding: 28px; position: relative; }
.org-card-modal-main h2 { margin: 12px 0 4px; color: var(--text); font-size: 30px; line-height: 1.1; }
.org-modal-close { position: absolute; top: 18px; right: 18px; width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--line); background: var(--card); cursor: pointer; font-size: 24px; }
.org-modal-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 20px 0; }
.org-modal-fields label { display: flex; flex-direction: column; gap: 6px; color: var(--muted); font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.org-modal-fields select, .org-modal-fields input { border: 1px solid var(--line); border-radius: 14px; padding: 11px 12px; background: var(--card); color: var(--text); font-weight: 900; text-transform: none; letter-spacing: 0; }
.org-card-title-input { width: 100%; border: 2px solid transparent; border-radius: 14px; background: transparent; color: var(--text); font-size: 30px; line-height: 1.1; font-weight: 950; letter-spacing: -.04em; padding: 8px 10px; margin: 10px 0 2px; outline: none; }
.org-card-title-input:focus { border-color: #7c3aed; background: var(--card); }
.org-description-input { width: 100%; min-height: 100px; border: 1px solid var(--line); border-radius: 14px; padding: 12px; color: var(--text); font-weight: 750; resize: vertical; outline: none; }
.org-description-input:focus { border-color: #7c3aed; }
.org-card-checklist-input { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 12px; }
.org-card-checklist-input input { border: 1px solid var(--line); border-radius: 14px; padding: 11px 12px; font-weight: 800; outline: none; }
.org-card-checklist-input input:focus { border-color: #7c3aed; }
.org-card-checklist-input button, .org-card-checklist-row button { border: 1px solid var(--line); background: var(--card); border-radius: 12px; padding: 9px 11px; font-weight: 900; cursor: pointer; }
.org-card-checklist-row { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid #f1f5f9; color: var(--text); font-weight: 850; }
.org-card-checklist-row .done { text-decoration: line-through; color: #94a3b8; }
.org-card-checklist-row .danger { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
.org-modal-section { margin-top: 18px; padding: 16px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); }
.org-modal-section h3 { margin: 0 0 8px; color: var(--text); }
.org-modal-section p { margin: 4px 0; color: var(--muted); font-weight: 750; }
.org-card-modal-sidebar { border-left: 1px solid #e2e8f0; padding: 24px; background: var(--card); display: flex; flex-direction: column; gap: 10px; }
.org-card-modal-sidebar strong { color: var(--text); font-size: 16px; margin-bottom: 6px; }
.org-card-modal-sidebar button { border: 1px solid var(--line); background: var(--card-strong); border-radius: 14px; padding: 12px; text-align: left; font-weight: 900; cursor: pointer; color: var(--text); }
.org-card-modal-sidebar button:hover { border-color: #7c3aed; color: #6d28d9; }
.org-card-modal-sidebar button.danger { color: #b91c1c; }


.org-section-title { margin-top: 24px; margin-bottom: 12px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.org-section-title h3 { margin: 4px 0 0; font-size: 16px; color: var(--text); }
.contratacoes-resumo { margin-bottom: 18px; }
.org-contract-groups { display: grid; gap: 16px; margin-top: 20px; }
.org-contract-group { border: 1px solid rgba(226,232,240,0.95); border-radius: 20px; background: rgba(255,255,255,0.86); padding: 16px; }
.org-contract-header, .org-service-card { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.org-contract-header h3, .org-service-card h4 { margin: 8px 0 4px; color: var(--text); }
.org-service-list { display: grid; gap: 12px; margin-top: 14px; }
.org-service-card { border: 1px solid rgba(226,232,240,0.9); border-radius: 16px; padding: 14px; background: var(--card-strong); }
.compact-values { min-width: 140px; text-align: right; }
.roteiro-com-checklist .org-timeline-content { width: 100%; }
.org-roteiro-checklist { margin-top: 14px; border: 1px solid rgba(226,232,240,0.95); border-radius: 16px; padding: 14px; background: rgba(248,250,252,0.82); }
.org-roteiro-checklist-head { display: grid; gap: 8px; margin-bottom: 10px; }
.org-roteiro-checklist-head > div:first-child { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.org-progress.mini { height: 7px; border-radius: 999px; }
.org-roteiro-checklist-list { display: grid; gap: 8px; }
.org-roteiro-check { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; padding: 8px; border-radius: 12px; background: white; border: 1px solid rgba(226,232,240,0.7); }
.org-roteiro-check.done span { text-decoration: line-through; color: var(--muted); }
.org-check-toggle.small { width: 24px; height: 24px; min-width: 24px; border-radius: 8px; }
.org-inline-add-check { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 10px; }
.org-inline-add-check input { min-width: 0; }


.org-equipe-head-actions { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 22px; }
.org-stepper { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
.org-stepper > button { appearance: none; background: transparent; cursor: pointer; text-align: left; }
.org-stepper > div, .org-stepper > button { display: flex; align-items: center; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #e2e8f0; color: var(--muted); font-weight: 900; }
.org-stepper > div.active, .org-stepper > button.active { color: #6d28d9; border-color: #7c3aed; }
.org-stepper strong { width: 30px; height: 30px; border-radius: 999px; display: grid; place-items: center; background: var(--card); border: 1px solid #cbd5e1; color: var(--muted); }
.org-stepper .active strong { background: linear-gradient(135deg, #6d28d9, #8b5cf6); border-color: #6d28d9; color: #fff; }
.org-equipe-menu-wrap { position: relative; flex: 0 0 auto; }
.org-equipe-primary, .org-equipe-footer .primary { border: 0; border-radius: 14px; padding: 13px 18px; background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: #fff; font-weight: 950; cursor: pointer; box-shadow: 0 12px 24px rgba(109,40,217,.22); }
.org-equipe-menu { position: absolute; right: 0; top: calc(100% + 8px); width: 310px; z-index: 20; border: 1px solid var(--line); border-radius: 18px; background: var(--card); box-shadow: 0 22px 45px rgba(15,23,42,.14); overflow: hidden; }
.org-equipe-menu button { width: 100%; border: 0; background: var(--card); padding: 16px 18px; text-align: left; cursor: pointer; display: grid; gap: 4px; }
.org-equipe-menu button + button { border-top: 1px solid #f1f5f9; }
.org-equipe-menu button:hover { background: var(--card-strong); }
.org-equipe-menu strong { color: var(--text); font-size: 15px; }
.org-equipe-menu span { color: var(--muted); font-weight: 750; }
.org-equipe-event-row { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 14px; align-items: center; margin-bottom: 18px; }
.org-equipe-event-row label { color: var(--muted); font-weight: 950; }
.org-equipe-event-row select, .org-equipe-table select { width: 100%; border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px 13px; background: var(--card); color: var(--text); font-weight: 800; outline: none; }
.org-equipe-table { display: flex; flex-direction: column; gap: 10px; }
.org-equipe-table-head { display: grid; grid-template-columns: 1.35fr 1.25fr .95fr .75fr .85fr 1.05fr; gap: 14px; align-items: center; padding: 10px 18px; background: var(--card-strong); border: 1px solid var(--line); border-radius: 16px; color: var(--muted); font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .05em; }
.org-equipe-table-row { display: grid; grid-template-columns: 1.35fr 1.25fr .95fr .75fr .85fr 1.05fr; gap: 14px; align-items: center; padding: 16px 18px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-card); }
.org-equipe-table-row.selected { border-color: var(--primary); background: var(--card); }
.org-equipe-member-cell { display: grid; grid-template-columns: auto 44px 1fr; gap: 12px; align-items: center; min-width: 0; }
.org-avatar { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
.org-equipe-member-cell strong, .org-equipe-event-cell strong { display: block; color: var(--text); font-size: 15px; }
.org-equipe-member-cell small, .org-equipe-event-cell small { display: block; color: var(--muted); font-weight: 750; margin-top: 2px; }
.org-equipe-time { color: var(--muted); font-weight: 900; white-space: nowrap; }
.org-equipe-time-inputs { display: flex; align-items: center; gap: 8px; color: var(--muted); font-weight: 900; }
.org-equipe-time-inputs input { width: 92px; border: 1px solid var(--line); border-radius: 14px; padding: 10px 10px; background: var(--card-strong); color: var(--text); font-weight: 900; }
.org-equipe-time-inputs input:disabled, .org-equipe-table-row select:disabled { opacity: .55; background: var(--card-strong); }
.org-pill.disponivel { background: var(--primary-soft); color: var(--primary); }
.org-card-actions.equipe-actions { justify-content: flex-start; }
.org-card-actions.equipe-actions .danger { border-radius: 12px; padding-inline: 10px; }
.org-equipe-info { margin-top: 14px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--primary-soft); color: var(--primary); font-weight: 800; }
.org-equipe-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.org-equipe-footer button { border-radius: 14px; padding: 12px 18px; font-weight: 950; cursor: pointer; }
.org-equipe-footer .secondary { border: 1px solid var(--line); background: var(--card); color: var(--muted); }
.org-equipe-footer button:disabled { opacity: .55; cursor: not-allowed; }
.org-equipe-modal { width: min(980px, 94vw); max-height: 90vh; overflow: auto; background: var(--card); border-radius: 26px; border: 1px solid var(--line); box-shadow: 0 30px 80px rgba(15,23,42,.3); padding: 28px; }
.org-equipe-modal-tabs { display: flex; gap: 10px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.org-equipe-modal-tabs button { border: 1px solid var(--line); background: var(--card); color: var(--muted); border-radius: 999px; padding: 10px 16px; font-weight: 950; cursor: pointer; }
.org-equipe-modal-tabs button.active { background: linear-gradient(135deg, #6d28d9, #8b5cf6); border-color: #6d28d9; color: #fff; box-shadow: 0 10px 20px rgba(109,40,217,.18); }
.org-equipe-info.fornecedor { margin-top: 0; margin-bottom: 14px; }
.fornecedor-equipe-card .org-item-main p + p { margin-top: 4px; }
.org-form-grid.equipe.cadastro { grid-template-columns: 1fr 1fr .85fr .65fr auto; padding: 16px; border: 1px solid var(--line); border-radius: 18px; background: var(--card-strong); }
.equipe-cadastro-card { border-radius: 16px; }

@media (max-width: 1100px) { .org-equipe-table-head { display: none; } .org-equipe-table-row { grid-template-columns: 1fr; align-items: stretch; } .org-equipe-head-actions, .org-equipe-event-row { grid-template-columns: 1fr; } .org-template-actions { grid-template-columns: 1fr; } .org-metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .org-form-grid, .org-form-grid.five, .org-form-grid.fornecedor, .org-form-grid.contratacao, .org-form-grid.roteiro, .org-form-grid.equipe, .org-form-grid.checklist, .org-form-grid.producao { grid-template-columns: 1fr 1fr; } }
.org-agenda-modal { width: min(860px, 94vw); max-height: 90vh; overflow: auto; background: var(--card); border-radius: 26px; border: 1px solid var(--line); box-shadow: 0 30px 80px rgba(15,23,42,.3); padding: 28px; }
.org-agenda-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
.org-agenda-modal-header h2 { margin: 4px 0 6px; color: var(--text); font-size: 28px; line-height: 1.1; }
.org-agenda-modal-header p { margin: 0; color: var(--muted); font-weight: 800; }
.org-modal-close.static { position: static; flex: 0 0 auto; }
.org-agenda-modal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.org-agenda-modal-grid label { display: flex; flex-direction: column; gap: 7px; color: var(--muted); font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.org-agenda-modal-grid label.full { grid-column: 1 / -1; }
.org-agenda-modal-grid input, .org-agenda-modal-grid select, .org-agenda-modal-grid textarea { width: 100%; border: 1px solid #dbe4f0; border-radius: 16px; padding: 13px 14px; background: var(--card); color: var(--text); font-size: 15px; font-weight: 850; text-transform: none; letter-spacing: 0; outline: none; }
.org-agenda-modal-grid input:focus, .org-agenda-modal-grid select:focus, .org-agenda-modal-grid textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
.org-agenda-modal-grid textarea { min-height: 120px; resize: vertical; }
.org-agenda-modal-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
.org-agenda-modal-actions button { border: 1px solid var(--line); background: var(--card-strong); border-radius: 14px; padding: 12px 16px; font-weight: 950; cursor: pointer; color: var(--text); }
.org-agenda-modal-actions button.primary { border-color: #7c3aed; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; }
.org-agenda-modal-actions button.secondary { background: var(--card); }
.org-agenda-modal-actions button.danger { color: #b91c1c; background: var(--card); border-color: rgba(185,28,28,.22); }
.org-agenda-modal-actions button:disabled { opacity: .55; cursor: not-allowed; }

.org-equipe-head-actions.single { align-items: center; }
.org-equipe-title-note { flex: 1; display: flex; flex-direction: column; gap: 4px; color: var(--text); font-weight: 900; }
.org-equipe-title-note span { color: var(--muted); font-size: 14px; font-weight: 700; }
.org-equipe-table.fornecedores-selecao { margin-top: 18px; }
.org-equipe-table-head.fornecedor-head, .org-equipe-table-row.fornecedor-row { grid-template-columns: 2fr 1.8fr 1.1fr 1.1fr 1fr; }
.org-form-grid.fornecedor.cadastro { grid-template-columns: 1.3fr 1.2fr 1fr 1fr auto; margin: 16px 0; }

@media (max-width: 760px) { .org-stepper { grid-template-columns: 1fr; gap: 10px; } .org-equipe-menu-wrap, .org-equipe-primary, .org-equipe-menu { width: 100%; } .org-equipe-menu { position: static; margin-top: 8px; } .org-form-grid.equipe.cadastro { grid-template-columns: 1fr; } .org-card-modal { grid-template-columns: 1fr; } .org-card-modal-sidebar { border-left: 0; border-top: 1px solid #e2e8f0; } .org-modal-fields, .org-agenda-modal-grid { grid-template-columns: 1fr; } .org-timeline-card { flex-direction: column; } .org-header, .org-summary-card, .org-toolbar, .org-item-card, .org-mini-row, .org-checklist-actions { flex-direction: column; align-items: stretch; } .org-event-select, .org-toolbar input { max-width: none; width: 100%; } .org-metrics-grid, .org-grid-two, .org-money-grid { grid-template-columns: 1fr; } .org-form-grid, .org-form-grid.five, .org-form-grid.fornecedor, .org-form-grid.contratacao, .org-form-grid.roteiro, .org-form-grid.equipe, .org-form-grid.checklist, .org-form-grid.producao { grid-template-columns: 1fr; } .org-check-row { align-items: flex-start; } .org-row-actions, .org-card-actions { width: 100%; justify-content: flex-end; } .org-item-card select { max-width: none; } .org-finance-values { align-items: flex-start; } }

.org-equipe-head-actions.single { align-items: center; }
.org-equipe-title-note { flex: 1; display: flex; flex-direction: column; gap: 4px; color: var(--text); font-weight: 900; }
.org-equipe-title-note span { color: var(--muted); font-size: 14px; font-weight: 700; }
.org-equipe-table.fornecedores-selecao { margin-top: 18px; }
.org-equipe-table-head.fornecedor-head, .org-equipe-table-row.fornecedor-row { grid-template-columns: 2fr 1.8fr 1.1fr 1.1fr 1fr; }
.org-form-grid.fornecedor.cadastro { grid-template-columns: 1.3fr 1.2fr 1fr 1fr auto; margin: 16px 0; }

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

