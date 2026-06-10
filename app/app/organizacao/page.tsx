"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AbaOrganizacao = "visao" | "planejamento" | "execucao" | "pendencias";
type SubPlanejamento = "tarefas" | "fornecedores" | "contratacoes" | "financeiro";
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

type Tarefa = {
  id: string;
  tenant_id: string;
  evento_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  prioridade: "baixa" | "media" | "alta" | "critica" | string;
  status: "pendente" | "em_andamento" | "concluido" | "atrasado" | "cancelado" | string;
  responsavel_nome: string | null;
  data_inicio: string | null;
  data_limite: string | null;
  concluido_em: string | null;
  observacoes: string | null;
  criado_em: string;
};

type Checklist = {
  id: string;
  tenant_id: string;
  evento_id: string;
  categoria: string;
  item: string;
  descricao: string | null;
  tipo: "planejamento" | "dia_evento" | "montagem" | "desmontagem" | "outro" | string;
  obrigatorio: boolean;
  concluido: boolean;
  concluido_em: string | null;
  responsavel_nome: string | null;
  ordem: number;
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
  status: "orcamento" | "negociando" | "contratado" | "confirmado" | "cancelado" | "dispensado" | string;
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
  status: "convidado" | "confirmado" | "presente" | "ausente" | "cancelado" | string;
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

const STATUS_TAREFA = [
  { value: "ideia", label: "Ideias" },
  { value: "a_fazer", label: "A fazer" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_terceiro", label: "Aguardando terceiros" },
  { value: "concluido", label: "Concluído" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

const COLUNAS_PRODUCAO = [
  { value: "ideia", label: "Ideias", description: "Sugestões e possibilidades para avaliar." },
  { value: "a_fazer", label: "A fazer", description: "Ações que ainda precisam começar." },
  { value: "em_andamento", label: "Em andamento", description: "Itens já em execução." },
  { value: "aguardando_terceiro", label: "Aguardando terceiros", description: "Dependências de fornecedor, cliente ou equipe." },
  { value: "concluido", label: "Concluído", description: "Ações finalizadas." },
];

const STATUS_FORNECEDOR = ["orcamento", "negociando", "contratado", "confirmado", "cancelado", "dispensado"];
const STATUS_CONTRATACAO = ["pendente", "parcial", "pago", "vencido", "cancelado"];
const STATUS_EQUIPE = ["convidado", "confirmado", "presente", "ausente", "cancelado"];


const CHECKLIST_PADRAO_DIA = [
  { item: "Som testado", categoria: "som", tipo: "dia_evento", obrigatorio: true },
  { item: "Iluminação testada", categoria: "iluminacao", tipo: "dia_evento", obrigatorio: true },
  { item: "Buffet montado", categoria: "buffet", tipo: "dia_evento", obrigatorio: true },
  { item: "Mesa principal montada", categoria: "decoracao", tipo: "montagem", obrigatorio: true },
  { item: "Decoração finalizada", categoria: "decoracao", tipo: "montagem", obrigatorio: true },
  { item: "Recepção alinhada", categoria: "recepcao", tipo: "dia_evento", obrigatorio: true },
  { item: "Equipe de check-in posicionada", categoria: "check-in", tipo: "dia_evento", obrigatorio: true },
  { item: "QR Code / lista de convidados conferida", categoria: "check-in", tipo: "dia_evento", obrigatorio: true },
  { item: "Fotógrafo / filmagem confirmados", categoria: "foto e video", tipo: "dia_evento", obrigatorio: true },
  { item: "Cerimonial alinhado", categoria: "cerimonial", tipo: "dia_evento", obrigatorio: true },
  { item: "Banheiros revisados", categoria: "infraestrutura", tipo: "dia_evento", obrigatorio: false },
  { item: "Gerador / energia conferidos", categoria: "infraestrutura", tipo: "dia_evento", obrigatorio: true },
  { item: "Brinde / parabéns / momento especial preparado", categoria: "cerimonial", tipo: "dia_evento", obrigatorio: true },
  { item: "Saída / desmontagem alinhada", categoria: "desmontagem", tipo: "desmontagem", obrigatorio: false },
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
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [checklist, setChecklist] = useState<Checklist[]>([]);
  const [fornecedoresEvento, setFornecedoresEvento] = useState<FornecedorEvento[]>([]);
  const [contratacoes, setContratacoes] = useState<Contratacao[]>([]);
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [aba, setAba] = useState<AbaOrganizacao>("visao");
  const [subPlanejamento, setSubPlanejamento] = useState<SubPlanejamento>("tarefas");
  const [visualizacaoProducao, setVisualizacaoProducao] = useState<"kanban" | "lista">("kanban");
  const [subExecucao, setSubExecucao] = useState<SubExecucao>("roteiro");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novaTarefa, setNovaTarefa] = useState({ titulo: "", responsavel_nome: "", data_limite: "", prioridade: "media", tipo: "planejamento" });
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: "", categoria: "buffet", telefone: "", email: "", responsavel_nome: "", valor_orcado: "", valor_fechado: "", status: "orcamento" });
  const [novaContratacao, setNovaContratacao] = useState({ titulo: "", fornecedor_evento_id: "", valor_contratado: "", valor_entrada: "", valor_pago: "", parcelas: "1", data_vencimento: "", status: "pendente" });
  const [novoEquipe, setNovoEquipe] = useState({ nome: "", funcao: "", telefone: "", email: "", horario_inicio: "", horario_fim: "", contato_principal: false });
  const [novoChecklist, setNovoChecklist] = useState({ item: "", categoria: "geral", tipo: "dia_evento", responsavel_nome: "", obrigatorio: false });
  const [novoAgenda, setNovoAgenda] = useState({ titulo: "", categoria: "cerimonial", data_inicio: "", data_fim: "", responsavel: "", descricao: "" });

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

  async function carregarEventos(eventoPreferencialId?: string): Promise<Evento | null> {
    const { data: { user } } = await supabase.auth.getUser();

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
      .select("id, nome, tenant_id, data_evento, data_inicio, hora_inicio, local, nome_local, status, created_at")
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

    const escolhido = lista.find((evento) => evento.id === eventoPreferencialId) || lista[0] || null;
    setEventoAtual(escolhido);
    return escolhido;
  }

  async function carregarOrganizacao(evento: Evento) {
    const eventoId = evento.id;

    const [tarefasRes, checklistRes, fornecedoresEventoRes, contratacoesRes, equipeRes, agendaRes] = await Promise.all([
      supabase.from("organizacao_tarefas").select("*").eq("evento_id", eventoId).order("data_limite", { ascending: true, nullsFirst: false }),
      supabase.from("organizacao_checklist").select("*").eq("evento_id", eventoId).order("ordem", { ascending: true }),
      supabase.from("organizacao_fornecedores_evento").select("*").eq("evento_id", eventoId).order("criado_em", { ascending: false }),
      supabase.from("organizacao_contratacoes").select("*").eq("evento_id", eventoId).order("data_vencimento", { ascending: true, nullsFirst: false }),
      supabase.from("organizacao_equipe").select("*").eq("evento_id", eventoId).order("contato_principal", { ascending: false }),
      supabase.from("event_agenda_items").select("id, evento_id, tenant_id, titulo, descricao, categoria, data_inicio, data_fim, status, responsavel, cor").eq("evento_id", eventoId).order("data_inicio", { ascending: true, nullsFirst: false }),
    ]);

    if (tarefasRes.error) setErro("Erro ao carregar tarefas: " + tarefasRes.error.message);
    if (checklistRes.error) setErro("Erro ao carregar checklist: " + checklistRes.error.message);
    if (fornecedoresEventoRes.error) setErro("Erro ao carregar fornecedores do evento: " + fornecedoresEventoRes.error.message);
    if (contratacoesRes.error) setErro("Erro ao carregar contratações: " + contratacoesRes.error.message);
    if (equipeRes.error) setErro("Erro ao carregar equipe: " + equipeRes.error.message);

    const vinculos = (fornecedoresEventoRes.data || []) as FornecedorEvento[];
    const fornecedorIds = Array.from(new Set(vinculos.map((v) => v.fornecedor_id).filter(Boolean)));
    let fornecedoresPorId: Record<string, Fornecedor> = {};

    if (fornecedorIds.length > 0) {
      const { data: fornecedoresData } = await supabase
        .from("organizacao_fornecedores")
        .select("*")
        .in("id", fornecedorIds);

      fornecedoresPorId = Object.fromEntries(((fornecedoresData || []) as Fornecedor[]).map((fornecedor) => [fornecedor.id, fornecedor]));
    }

    setTarefas((tarefasRes.data || []) as Tarefa[]);
    setChecklist((checklistRes.data || []) as Checklist[]);
    setFornecedoresEvento(vinculos.map((vinculo) => ({ ...vinculo, fornecedor: fornecedoresPorId[vinculo.fornecedor_id] || null })));
    setContratacoes((contratacoesRes.data || []) as Contratacao[]);
    setEquipe((equipeRes.data || []) as Equipe[]);
    setAgenda((agendaRes.data || []) as AgendaItem[]);
  }

  const tenantId = eventoAtual?.tenant_id || "";

  const metricas = useMemo(() => {
    const tarefasConcluidas = tarefas.filter((t) => t.status === "concluido").length;
    const tarefasAtrasadas = tarefas.filter((t) => t.status === "atrasado" || isAtrasada(t.data_limite, t.status)).length;
    const checklistConcluido = checklist.filter((c) => c.concluido).length;
    const fornecedoresContratados = fornecedoresEvento.filter((f) => ["contratado", "confirmado"].includes(f.status)).length;
    const valorContratado = contratacoes.reduce((total, item) => total + toNumber(item.valor_contratado), 0);
    const valorPago = contratacoes.reduce((total, item) => total + toNumber(item.valor_pago), 0);
    const pendenciasFinanceiras = contratacoes.filter((item) => ["pendente", "parcial", "vencido"].includes(item.status)).length;

    const base = tarefas.length + checklist.length + fornecedoresEvento.length + contratacoes.length + equipe.length + agenda.length;
    const concluidos = tarefasConcluidas + checklistConcluido + fornecedoresContratados + contratacoes.filter((c) => c.status === "pago").length + equipe.filter((e) => ["confirmado", "presente"].includes(e.status)).length + agenda.filter((a) => a.status === "concluido").length;

    return {
      tarefasTotal: tarefas.length,
      tarefasConcluidas,
      tarefasAtrasadas,
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
  }, [tarefas, checklist, fornecedoresEvento, contratacoes, equipe, agenda, eventoAtual]);

  const pendencias = useMemo(() => {
    const itens: { titulo: string; detalhe: string; tipo: string; criticidade: "alta" | "media" | "baixa" }[] = [];

    tarefas.forEach((t) => {
      if (isAtrasada(t.data_limite, t.status)) itens.push({ titulo: t.titulo, detalhe: "Tarefa com prazo vencido", tipo: "Tarefa", criticidade: "alta" });
    });

    contratacoes.forEach((c) => {
      if (c.status === "vencido") itens.push({ titulo: c.titulo, detalhe: "Pagamento vencido", tipo: "Financeiro", criticidade: "alta" });
      else if (["pendente", "parcial"].includes(c.status)) itens.push({ titulo: c.titulo, detalhe: "Pagamento ainda pendente", tipo: "Financeiro", criticidade: "media" });
    });

    fornecedoresEvento.forEach((f) => {
      if (["orcamento", "negociando"].includes(f.status)) itens.push({ titulo: f.fornecedor?.nome || "Fornecedor", detalhe: "Fornecedor ainda não contratado", tipo: "Fornecedor", criticidade: "media" });
    });

    checklist.filter((c) => c.obrigatorio && !c.concluido).forEach((c) => {
      itens.push({ titulo: c.item, detalhe: "Checklist obrigatório pendente", tipo: "Checklist", criticidade: "media" });
    });

    return itens;
  }, [tarefas, contratacoes, fornecedoresEvento, checklist]);

  const termoBusca = busca.trim().toLowerCase();
  const tarefasFiltradas = filtrar<Tarefa>(tarefas, termoBusca, (t) => [t.titulo, t.responsavel_nome, t.status, t.prioridade]);
  const fornecedoresFiltrados = filtrar<FornecedorEvento>(fornecedoresEvento, termoBusca, (f) => [f.fornecedor?.nome, f.fornecedor?.telefone, f.fornecedor?.email, f.status, f.fornecedor?.categoria]);
  const contratacoesFiltradas = filtrar<Contratacao>(contratacoes, termoBusca, (c) => [c.titulo, c.status, c.forma_pagamento]);
  const equipeFiltrada = filtrar<Equipe>(equipe, termoBusca, (e) => [e.nome, e.funcao, e.telefone, e.status]);
  const checklistFiltrado = filtrar<Checklist>(checklist, termoBusca, (c) => [c.item, c.categoria, c.tipo, c.responsavel_nome]);
  const agendaFiltrada = filtrar<AgendaItem>(agenda, termoBusca, (a) => [a.titulo, a.categoria, a.responsavel, a.status]);

  async function trocarEvento(eventoId: string) {
    const evento = eventos.find((item) => item.id === eventoId) || null;
    setEventoAtual(evento);
    if (evento) {
      setLoading(true);
      await carregarOrganizacao(evento);
      setLoading(false);
    }
  }

  async function criarTarefa() {
    if (!eventoAtual || !tenantId || !novaTarefa.titulo.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("organizacao_tarefas").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      titulo: novaTarefa.titulo.trim(),
      responsavel_nome: limpar(novaTarefa.responsavel_nome),
      data_limite: novaTarefa.data_limite || null,
      prioridade: novaTarefa.prioridade,
      tipo: novaTarefa.tipo,
      status: "a_fazer",
    });
    await depoisSalvar(error, () => setNovaTarefa({ titulo: "", responsavel_nome: "", data_limite: "", prioridade: "media", tipo: "planejamento" }));
  }

  async function alterarStatusTarefa(tarefa: Tarefa, status: string) {
    const { error } = await supabase
      .from("organizacao_tarefas")
      .update({ status, concluido_em: status === "concluido" ? new Date().toISOString() : null })
      .eq("id", tarefa.id);
    await depoisSalvar(error);
  }


  async function editarTarefa(tarefa: Tarefa) {
    const titulo = window.prompt("Alterar título da tarefa", tarefa.titulo);
    if (titulo === null) return;

    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErro("O título da tarefa não pode ficar vazio.");
      return;
    }

    const responsavel = window.prompt("Alterar responsável", tarefa.responsavel_nome || "");
    if (responsavel === null) return;

    const prazo = window.prompt("Alterar prazo no formato AAAA-MM-DD", tarefa.data_limite ? tarefa.data_limite.slice(0, 10) : "");
    if (prazo === null) return;

    const { error } = await supabase
      .from("organizacao_tarefas")
      .update({
        titulo: tituloLimpo,
        responsavel_nome: limpar(responsavel),
        data_limite: prazo.trim() || null,
      })
      .eq("id", tarefa.id);

    await depoisSalvar(error);
  }

  async function excluirTarefa(tarefa: Tarefa) {
    const confirmar = window.confirm(`Excluir a tarefa "${tarefa.titulo}"?`);
    if (!confirmar) return;

    const { error } = await supabase.from("organizacao_tarefas").delete().eq("id", tarefa.id);
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
      await depoisSalvar(fornecedorError || new Error("Fornecedor não criado."));
      return;
    }

    const { error } = await supabase.from("organizacao_fornecedores_evento").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      fornecedor_id: fornecedor.id,
      categoria_evento: novoFornecedor.categoria,
      status: novoFornecedor.status,
      valor_orcado: valorOuNull(novoFornecedor.valor_orcado),
      valor_fechado: valorOuNull(novoFornecedor.valor_fechado),
    });

    await depoisSalvar(error, () => setNovoFornecedor({ nome: "", categoria: "buffet", telefone: "", email: "", responsavel_nome: "", valor_orcado: "", valor_fechado: "", status: "orcamento" }));
  }

  async function atualizarStatusFornecedor(item: FornecedorEvento, status: string) {
    const { error } = await supabase.from("organizacao_fornecedores_evento").update({ status }).eq("id", item.id);
    await depoisSalvar(error);
  }


  async function editarFornecedor(item: FornecedorEvento) {
    const fornecedor = item.fornecedor;
    const nome = window.prompt("Alterar nome do fornecedor", fornecedor?.nome || "");
    if (nome === null) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("O nome do fornecedor não pode ficar vazio.");
      return;
    }

    const telefone = window.prompt("Alterar telefone", fornecedor?.telefone || "");
    if (telefone === null) return;

    const email = window.prompt("Alterar e-mail", fornecedor?.email || "");
    if (email === null) return;

    const valor = window.prompt("Alterar valor fechado", item.valor_fechado ? String(item.valor_fechado) : "");
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
    const contratacaoExistente = contratacoes.find((contratacao) => contratacao.fornecedor_evento_id === item.id);

    if (contratacaoExistente) {
      setAba("planejamento");
      setSubPlanejamento("contratacoes");
      return;
    }

    const confirmar = window.confirm(`Criar uma contratação para "${item.fornecedor?.nome || "Fornecedor"}"?`);
    if (!confirmar || !eventoAtual || !tenantId) return;

    setSalvando(true);
    const { error } = await supabase.from("organizacao_contratacoes").insert({
      tenant_id: tenantId,
      evento_id: eventoAtual.id,
      fornecedor_evento_id: item.id,
      titulo: `Contrato - ${item.fornecedor?.nome || "Fornecedor"}`,
      valor_contratado: valorOuZero(item.valor_fechado || item.valor_orcado || 0),
      valor_entrada: 0,
      valor_pago: 0,
      parcelas: 1,
      status: "pendente",
    });

    await depoisSalvar(error);
    if (!error) {
      setAba("planejamento");
      setSubPlanejamento("contratacoes");
    }
  }

  async function abrirPagamentoFornecedor(item: FornecedorEvento) {
    const contratacaoExistente = contratacoes.find((contratacao) => contratacao.fornecedor_evento_id === item.id);

    if (contratacaoExistente) {
      setAba("planejamento");
      setSubPlanejamento("financeiro");
      return;
    }

    await abrirContratoFornecedor(item);
  }

  async function excluirFornecedor(item: FornecedorEvento) {
    const confirmar = window.confirm(`Remover "${item.fornecedor?.nome || "Fornecedor"}" deste evento?`);
    if (!confirmar) return;

    const { error } = await supabase.from("organizacao_fornecedores_evento").delete().eq("id", item.id);
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
    await depoisSalvar(error, () => setNovaContratacao({ titulo: "", fornecedor_evento_id: "", valor_contratado: "", valor_entrada: "", valor_pago: "", parcelas: "1", data_vencimento: "", status: "pendente" }));
  }


  async function editarContratacao(item: Contratacao) {
    const titulo = window.prompt("Alterar título da contratação", item.titulo);
    if (titulo === null) return;

    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErro("O título da contratação não pode ficar vazio.");
      return;
    }

    const valorContratado = window.prompt("Alterar valor contratado", String(item.valor_contratado || ""));
    if (valorContratado === null) return;

    const valorPago = window.prompt("Alterar valor pago", String(item.valor_pago || ""));
    if (valorPago === null) return;

    const vencimento = window.prompt("Alterar vencimento no formato AAAA-MM-DD", item.data_vencimento || "");
    if (vencimento === null) return;

    const valorContratadoNumero = valorOuZero(valorContratado);
    const valorPagoNumero = valorOuZero(valorPago);
    const status = valorPagoNumero >= valorContratadoNumero && valorContratadoNumero > 0 ? "pago" : valorPagoNumero > 0 ? "parcial" : item.status;

    const { error } = await supabase
      .from("organizacao_contratacoes")
      .update({
        titulo: tituloLimpo,
        valor_contratado: valorContratadoNumero,
        valor_pago: valorPagoNumero,
        data_vencimento: vencimento.trim() || null,
        status,
        data_pagamento: status === "pago" ? new Date().toISOString().slice(0, 10) : item.data_pagamento,
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
    const comprovanteUrl = window.prompt("Informe a URL do comprovante", item.comprovante_url || "");
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

    const { error } = await supabase.from("organizacao_contratacoes").delete().eq("id", item.id);
    await depoisSalvar(error);
  }

  async function criarEquipe() {
    if (!eventoAtual || !tenantId || !novoEquipe.nome.trim() || !novoEquipe.funcao.trim()) return;
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
    await depoisSalvar(error, () => setNovoEquipe({ nome: "", funcao: "", telefone: "", email: "", horario_inicio: "", horario_fim: "", contato_principal: false }));
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
    const { error } = await supabase.from("organizacao_equipe").update({ status }).eq("id", item.id);
    await depoisSalvar(error);
  }

  async function excluirEquipe(item: Equipe) {
    const confirmar = window.confirm(`Excluir "${item.nome}" da equipe?`);
    if (!confirmar) return;

    const { error } = await supabase.from("organizacao_equipe").delete().eq("id", item.id);
    await depoisSalvar(error);
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
    await depoisSalvar(error, () => setNovoChecklist({ item: "", categoria: "geral", tipo: "dia_evento", responsavel_nome: "", obrigatorio: false }));
  }

  async function alternarChecklist(item: Checklist) {
    const concluido = !item.concluido;
    const { error } = await supabase.from("organizacao_checklist").update({ concluido, concluido_em: concluido ? new Date().toISOString() : null }).eq("id", item.id);
    await depoisSalvar(error);
  }

  async function usarChecklistPadrao() {
    if (!eventoAtual || !tenantId) return;

    const itensExistentes = new Set(checklist.map((item) => item.item.trim().toLowerCase()));
    const itensParaInserir = CHECKLIST_PADRAO_DIA
      .filter((item) => !itensExistentes.has(item.item.trim().toLowerCase()))
      .map((item, index) => ({
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
    const { error } = await supabase.from("organizacao_checklist").insert(itensParaInserir);
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

    const novaCategoria = window.prompt("Alterar categoria", item.categoria || "geral");
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
    const confirmar = window.confirm(`Excluir o item "${item.item}" do checklist?`);
    if (!confirmar) return;

    const { error } = await supabase.from("organizacao_checklist").delete().eq("id", item.id);
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
    await depoisSalvar(error, () => setNovoAgenda({ titulo: "", categoria: "cerimonial", data_inicio: "", data_fim: "", responsavel: "", descricao: "" }));
  }


  async function editarAgenda(item: AgendaItem) {
    const titulo = window.prompt("Alterar título do roteiro", item.titulo || "");
    if (titulo === null) return;

    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErro("O título do roteiro não pode ficar vazio.");
      return;
    }

    const responsavel = window.prompt("Alterar responsável", item.responsavel || "");
    if (responsavel === null) return;

    const { error } = await supabase
      .from("event_agenda_items")
      .update({ titulo: tituloLimpo, responsavel: limpar(responsavel) })
      .eq("id", item.id);

    await depoisSalvar(error);
  }

  async function excluirAgenda(item: AgendaItem) {
    const confirmar = window.confirm(`Excluir "${item.titulo || "Item do roteiro"}" do roteiro?`);
    if (!confirmar) return;

    const { error } = await supabase.from("event_agenda_items").delete().eq("id", item.id);
    await depoisSalvar(error);
  }

  async function depoisSalvar(error: { message?: string } | Error | null, limparFormulario?: () => void) {
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
    return <div style={{ padding: 24, fontWeight: 800 }}>Carregando Organização...</div>;
  }

  return (
    <div className="organizacao-page">
      <style>{styles}</style>

      <div className="org-header">
        <div>
          <div className="org-eyebrow">OmniStage</div>
          <h1>Organização</h1>
          <p>Planejamento, contratações, fornecedores e execução do evento em um só lugar.</p>
        </div>

        <div className="org-event-select">
          <label>Evento</label>
          <select value={eventoAtual?.id || ""} onChange={(e) => trocarEvento(e.target.value)}>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>{evento.nome || "Evento sem nome"}</option>
            ))}
          </select>
        </div>
      </div>

      {erro ? <div className="org-alert">{erro}</div> : null}

      {!eventoAtual ? (
        <div className="org-empty">Nenhum evento encontrado para carregar a Organização.</div>
      ) : (
        <>
          <section className="org-summary-card">
            <div>
              <span className="org-badge">{eventoAtual.status || "Evento"}</span>
              <h2>{eventoAtual.nome || "Evento sem nome"}</h2>
              <p>{formatarDataEvento(eventoAtual)} · {eventoAtual.nome_local || eventoAtual.local || "Local não informado"}</p>
            </div>
            <div className="org-progress-box">
              <strong>{metricas.progresso}%</strong>
              <span>progresso geral</span>
              <div className="org-progress"><i style={{ width: `${Math.min(metricas.progresso, 100)}%` }} /></div>
            </div>
          </section>

          <section className="org-metrics-grid">
            <Metric title="Dias restantes" value={metricas.diasRestantes ?? "--"} detail="até o evento" />
            <Metric title="Produção" value={`${metricas.tarefasConcluidas}/${metricas.tarefasTotal}`} detail={`${metricas.tarefasAtrasadas} atrasadas`} danger={metricas.tarefasAtrasadas > 0} />
            <Metric title="Fornecedores" value={`${metricas.fornecedoresContratados}/${metricas.fornecedoresTotal}`} detail="contratados/confirmados" />
            <Metric title="Financeiro" value={formatarMoeda(metricas.saldoPendente)} detail="saldo pendente" danger={metricas.saldoPendente > 0} />
            <Metric title="Equipe" value={metricas.equipeTotal} detail="pessoas na operação" />
            <Metric title="Roteiro" value={metricas.roteiroTotal} detail="itens na timeline" />
          </section>

          <div className="org-toolbar">
            <div className="org-tabs">
              <button className={aba === "visao" ? "active" : ""} onClick={() => setAba("visao")}>Visão Geral</button>
              <button className={aba === "planejamento" ? "active" : ""} onClick={() => setAba("planejamento")}>Planejamento</button>
              <button className={aba === "execucao" ? "active" : ""} onClick={() => setAba("execucao")}>Execução</button>
              <button className={aba === "pendencias" ? "active" : ""} onClick={() => setAba("pendencias")}>Pendências</button>
            </div>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar na organização..." />
          </div>

          {aba === "visao" && (
            <div className="org-grid-two">
              <Panel title="Próximas ações" subtitle="Tarefas e roteiro mais próximos">
                {[...tarefasFiltradas.slice(0, 4).map((t) => ({ titulo: t.titulo, detalhe: `${labelStatus(t.status)} · ${formatarData(t.data_limite)}`, status: t.status })), ...agendaFiltrada.slice(0, 4).map((a) => ({ titulo: a.titulo || "Item do roteiro", detalhe: `${a.categoria || "Roteiro"} · ${formatarDataHora(a.data_inicio)}`, status: a.status || "pendente" }))].slice(0, 6).map((item, index) => <MiniRow key={index} title={item.titulo} detail={item.detalhe} status={item.status} />)}
              </Panel>

              <Panel title="Pendências críticas" subtitle="Itens que exigem atenção">
                {pendencias.length === 0 ? <Empty text="Nenhuma pendência crítica encontrada." /> : pendencias.slice(0, 6).map((item, index) => <MiniRow key={index} title={item.titulo} detail={`${item.tipo} · ${item.detalhe}`} status={item.criticidade} />)}
              </Panel>

              <Panel title="Financeiro do evento" subtitle="Contratado, pago e pendente">
                <div className="org-money-grid">
                  <div><span>Contratado</span><strong>{formatarMoeda(metricas.valorContratado)}</strong></div>
                  <div><span>Pago</span><strong>{formatarMoeda(metricas.valorPago)}</strong></div>
                  <div><span>Pendente</span><strong>{formatarMoeda(metricas.saldoPendente)}</strong></div>
                </div>
              </Panel>

              <Panel title="Checklist" subtitle="Conclusão dos preparativos">
                <div className="org-progress big"><i style={{ width: `${metricas.checklistTotal ? Math.round((metricas.checklistConcluido / metricas.checklistTotal) * 100) : 0}%` }} /></div>
                <p className="org-muted">{metricas.checklistConcluido} de {metricas.checklistTotal} itens concluídos.</p>
              </Panel>
            </div>
          )}

          {aba === "planejamento" && (
            <>
              <SubTabs items={["tarefas", "fornecedores", "contratacoes", "financeiro"]} active={subPlanejamento} onChange={(value) => setSubPlanejamento(value as SubPlanejamento)} />
              {subPlanejamento === "tarefas" && renderTarefas()}
              {subPlanejamento === "fornecedores" && renderFornecedores()}
              {subPlanejamento === "contratacoes" && renderContratacoes(false)}
              {subPlanejamento === "financeiro" && renderContratacoes(true)}
            </>
          )}

          {aba === "execucao" && (
            <>
              <SubTabs items={["roteiro", "equipe", "checklist"]} active={subExecucao} onChange={(value) => setSubExecucao(value as SubExecucao)} />
              {subExecucao === "roteiro" && renderRoteiro()}
              {subExecucao === "equipe" && renderEquipe()}
              {subExecucao === "checklist" && renderChecklist()}
            </>
          )}

          {aba === "pendencias" && (
            <Panel title="Central de Pendências" subtitle="Alertas automáticos de tarefas, contratos, fornecedores e checklist">
              {pendencias.length === 0 ? <Empty text="Nenhuma pendência encontrada para este evento." /> : <div className="org-list">{pendencias.map((item, index) => <MiniRow key={index} title={item.titulo} detail={`${item.tipo} · ${item.detalhe}`} status={item.criticidade} />)}</div>}
            </Panel>
          )}
        </>
      )}
    </div>
  );

  function renderTarefas() {
    const renderCardProducao = (tarefa: Tarefa) => (
      <div key={tarefa.id} className="org-item-card org-kanban-card">
        <div className="org-item-main">
          <span className={`org-pill ${tarefa.status}`}>{labelStatus(tarefa.status)}</span>
          <h3>{tarefa.titulo}</h3>
          <p>{tarefa.responsavel_nome || "Sem responsável"} · prazo {formatarData(tarefa.data_limite)}</p>
          <p className="org-muted">Prioridade: {labelStatus(tarefa.prioridade)}</p>
        </div>
        <div className="org-card-actions compact">
          <select value={tarefa.status} onChange={(e) => alterarStatusTarefa(tarefa, e.target.value)}>
            {STATUS_TAREFA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button type="button" onClick={() => alterarStatusTarefa(tarefa, tarefa.status === "concluido" ? "a_fazer" : "concluido")}>{tarefa.status === "concluido" ? "↩️ Reabrir" : "✅ Concluir"}</button>
          <button type="button" onClick={() => editarTarefa(tarefa)}>✏️ Editar</button>
          <button type="button" className="danger" onClick={() => excluirTarefa(tarefa)}>🗑️ Excluir</button>
        </div>
      </div>
    );

    return (
      <Panel title="Produção" subtitle="Kanban de ações do planejamento, com opção de visualização em lista">
        <div className="org-section-toolbar">
          <div>
            <strong>Quadro de produção</strong>
            <span>Organize ideias, tarefas, pendências com terceiros e itens concluídos.</span>
          </div>
          <div className="org-view-toggle">
            <button type="button" className={visualizacaoProducao === "kanban" ? "active" : ""} onClick={() => setVisualizacaoProducao("kanban")}>Kanban</button>
            <button type="button" className={visualizacaoProducao === "lista" ? "active" : ""} onClick={() => setVisualizacaoProducao("lista")}>Lista</button>
          </div>
        </div>

        <div className="org-form-grid producao">
          <input placeholder="Título da ação" value={novaTarefa.titulo} onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })} />
          <input placeholder="Responsável" value={novaTarefa.responsavel_nome} onChange={(e) => setNovaTarefa({ ...novaTarefa, responsavel_nome: e.target.value })} />
          <input type="date" value={novaTarefa.data_limite} onChange={(e) => setNovaTarefa({ ...novaTarefa, data_limite: e.target.value })} />
          <select value={novaTarefa.prioridade} onChange={(e) => setNovaTarefa({ ...novaTarefa, prioridade: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select>
          <button onClick={criarTarefa} disabled={salvando || !novaTarefa.titulo.trim()}>Adicionar</button>
        </div>

        {visualizacaoProducao === "kanban" ? (
          <div className="org-kanban">
            {COLUNAS_PRODUCAO.map((coluna) => {
              const itens = tarefasFiltradas.filter((tarefa) => normalizarStatusProducao(tarefa.status) === coluna.value);
              return (
                <div key={coluna.value} className="org-kanban-column">
                  <div className="org-kanban-head">
                    <div>
                      <strong>{coluna.label}</strong>
                      <span>{coluna.description}</span>
                    </div>
                    <em>{itens.length}</em>
                  </div>
                  <div className="org-kanban-list">
                    {itens.map(renderCardProducao)}
                    {itens.length === 0 && <Empty text="Nenhum item nesta etapa." />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="org-card-list">
            {tarefasFiltradas.map(renderCardProducao)}
            {tarefasFiltradas.length === 0 && <Empty text="Nenhuma ação de produção encontrada." />}
          </div>
        )}
      </Panel>
    );
  }

  function renderFornecedores() {
    return (
      <Panel title="Fornecedores" subtitle="Cadastro separado de contatos e convidados">
        <div className="org-form-grid fornecedor">
          <input placeholder="Nome do fornecedor" value={novoFornecedor.nome} onChange={(e) => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })} />
          <select value={novoFornecedor.categoria} onChange={(e) => setNovoFornecedor({ ...novoFornecedor, categoria: e.target.value })}>{CATEGORIAS_FORNECEDOR.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          <input placeholder="Telefone" value={novoFornecedor.telefone} onChange={(e) => setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })} />
          <input placeholder="E-mail" value={novoFornecedor.email} onChange={(e) => setNovoFornecedor({ ...novoFornecedor, email: e.target.value })} />
          <input placeholder="Valor fechado" value={novoFornecedor.valor_fechado} onChange={(e) => setNovoFornecedor({ ...novoFornecedor, valor_fechado: e.target.value })} />
          <button onClick={criarFornecedor} disabled={salvando || !novoFornecedor.nome.trim()}>Adicionar</button>
        </div>
        <div className="org-card-list">
          {fornecedoresFiltrados.map((item) => (
            <div key={item.id} className="org-item-card">
              <div className="org-item-main"><span className={`org-pill ${item.status}`}>{labelStatus(item.status)}</span><h3>{item.fornecedor?.nome || "Fornecedor"}</h3><p>{labelCategoria(item.fornecedor?.categoria || item.categoria_evento)} · {item.fornecedor?.telefone || "Sem telefone"} · {formatarMoeda(toNumber(item.valor_fechado || item.valor_orcado))}</p></div>
              <div className="org-card-actions">
                <select value={item.status} onChange={(e) => atualizarStatusFornecedor(item, e.target.value)}>{STATUS_FORNECEDOR.map((s) => <option key={s} value={s}>{labelStatus(s)}</option>)}</select>
                <button type="button" onClick={() => editarFornecedor(item)}>✏️ Editar</button>
                <button type="button" onClick={() => abrirContratoFornecedor(item)}>📄 Contrato</button>
                <button type="button" onClick={() => abrirPagamentoFornecedor(item)}>💰 Pagamento</button>
                <button type="button" className="danger" onClick={() => excluirFornecedor(item)}>🗑️ Excluir</button>
              </div>
            </div>
          ))}
          {fornecedoresFiltrados.length === 0 && <Empty text="Nenhum fornecedor encontrado." />}
        </div>
      </Panel>
    );
  }

  function renderContratacoes(financeiro: boolean) {
    return (
      <Panel title={financeiro ? "Financeiro" : "Contratações"} subtitle="Contratos, vencimentos, pagamentos e saldo pendente">
        {!financeiro && (
          <div className="org-form-grid contratacao">
            <input placeholder="Título da contratação" value={novaContratacao.titulo} onChange={(e) => setNovaContratacao({ ...novaContratacao, titulo: e.target.value })} />
            <select value={novaContratacao.fornecedor_evento_id} onChange={(e) => setNovaContratacao({ ...novaContratacao, fornecedor_evento_id: e.target.value })}><option value="">Sem fornecedor vinculado</option>{fornecedoresEvento.map((f) => <option key={f.id} value={f.id}>{f.fornecedor?.nome || "Fornecedor"}</option>)}</select>
            <input placeholder="Valor contratado" value={novaContratacao.valor_contratado} onChange={(e) => setNovaContratacao({ ...novaContratacao, valor_contratado: e.target.value })} />
            <input placeholder="Valor pago" value={novaContratacao.valor_pago} onChange={(e) => setNovaContratacao({ ...novaContratacao, valor_pago: e.target.value })} />
            <input type="date" value={novaContratacao.data_vencimento} onChange={(e) => setNovaContratacao({ ...novaContratacao, data_vencimento: e.target.value })} />
            <button onClick={criarContratacao} disabled={salvando || !novaContratacao.titulo.trim()}>Adicionar</button>
          </div>
        )}
        <div className="org-card-list">
          {contratacoesFiltradas.map((item) => (
            <div key={item.id} className="org-item-card finance">
              <div className="org-item-main"><span className={`org-pill ${item.status}`}>{labelStatus(item.status)}</span><h3>{item.titulo}</h3><p>Vencimento {formatarData(item.data_vencimento)} · {item.parcelas || 1} parcela(s)</p></div>
              <div className="org-finance-values"><strong>{formatarMoeda(toNumber(item.valor_contratado))}</strong><span>Pago {formatarMoeda(toNumber(item.valor_pago))}</span><span>Pendente {formatarMoeda(toNumber(item.valor_pendente ?? toNumber(item.valor_contratado) - toNumber(item.valor_pago)))}</span></div>
              <div className="org-card-actions compact">
                <button type="button" onClick={() => editarContratacao(item)}>✏️ Editar</button>
                <button type="button" onClick={() => marcarContratacaoPaga(item)} disabled={item.status === "pago"}>✅ Marcar pago</button>
                <button type="button" onClick={() => anexarComprovanteContratacao(item)}>📎 Comprovante</button>
                <button type="button" className="danger" onClick={() => excluirContratacao(item)}>🗑️ Excluir</button>
              </div>
            </div>
          ))}
          {contratacoesFiltradas.length === 0 && <Empty text="Nenhuma contratação encontrada." />}
        </div>
      </Panel>
    );
  }

  function renderRoteiro() {
    return (
      <Panel title="Roteiro do Evento" subtitle="Timeline e cerimonial usando event_agenda_items">
        <div className="org-form-grid roteiro">
          <input placeholder="Título" value={novoAgenda.titulo} onChange={(e) => setNovoAgenda({ ...novoAgenda, titulo: e.target.value })} />
          <input type="datetime-local" value={novoAgenda.data_inicio} onChange={(e) => setNovoAgenda({ ...novoAgenda, data_inicio: e.target.value })} />
          <input type="datetime-local" value={novoAgenda.data_fim} onChange={(e) => setNovoAgenda({ ...novoAgenda, data_fim: e.target.value })} />
          <input placeholder="Responsável" value={novoAgenda.responsavel} onChange={(e) => setNovoAgenda({ ...novoAgenda, responsavel: e.target.value })} />
          <button onClick={criarAgenda} disabled={salvando || !novoAgenda.titulo.trim()}>Adicionar</button>
        </div>
        <div className="org-timeline">
          {agendaFiltrada.map((item) => (
            <div key={item.id} className="org-timeline-row"><div className="org-time"><strong>{hora(item.data_inicio)}</strong><span>{hora(item.data_fim)}</span></div><div className="org-dot" /><div className="org-timeline-content"><h3>{item.titulo || "Item do roteiro"}</h3><p>{item.categoria || "Roteiro"} · {item.responsavel || "Sem responsável"}</p>{item.descricao ? <small>{item.descricao}</small> : null}<div className="org-row-actions"><button type="button" onClick={() => editarAgenda(item)}>✏️ Editar</button><button type="button" className="danger" onClick={() => excluirAgenda(item)}>🗑️ Excluir</button></div></div></div>
          ))}
          {agendaFiltrada.length === 0 && <Empty text="Nenhum item de roteiro encontrado." />}
        </div>
      </Panel>
    );
  }

  function renderEquipe() {
    return (
      <Panel title="Equipe" subtitle="Equipe operacional do dia do evento">
        <div className="org-form-grid equipe">
          <input placeholder="Nome" value={novoEquipe.nome} onChange={(e) => setNovoEquipe({ ...novoEquipe, nome: e.target.value })} />
          <input placeholder="Função" value={novoEquipe.funcao} onChange={(e) => setNovoEquipe({ ...novoEquipe, funcao: e.target.value })} />
          <input placeholder="Telefone" value={novoEquipe.telefone} onChange={(e) => setNovoEquipe({ ...novoEquipe, telefone: e.target.value })} />
          <label className="org-check"><input type="checkbox" checked={novoEquipe.contato_principal} onChange={(e) => setNovoEquipe({ ...novoEquipe, contato_principal: e.target.checked })} /> Principal</label>
          <button onClick={criarEquipe} disabled={salvando || !novoEquipe.nome.trim() || !novoEquipe.funcao.trim()}>Adicionar</button>
        </div>
        <div className="org-card-list">
          {equipeFiltrada.map((item) => <div key={item.id} className="org-item-card"><div className="org-item-main"><span className={`org-pill ${item.status}`}>{item.contato_principal ? "Principal" : labelStatus(item.status)}</span><h3>{item.nome}</h3><p>{item.funcao} · {item.telefone || "Sem telefone"}</p></div><span className="org-muted">{formatarDataHora(item.horario_inicio)}</span><div className="org-card-actions"><select value={item.status} onChange={(e) => atualizarStatusEquipe(item, e.target.value)}><option value="convidado">Convidado</option><option value="confirmado">Confirmado</option><option value="presente">Presente</option><option value="ausente">Ausente</option><option value="cancelado">Cancelado</option></select><button type="button" onClick={() => atualizarStatusEquipe(item, item.status === "presente" ? "confirmado" : "presente")}>{item.status === "presente" ? "↩️ Reabrir" : "✅ Confirmar"}</button><button type="button" onClick={() => editarEquipe(item)}>✏️ Editar</button><button type="button" className="danger" onClick={() => excluirEquipe(item)}>🗑️ Excluir</button></div></div>)}
          {equipeFiltrada.length === 0 && <Empty text="Nenhum membro da equipe encontrado." />}
        </div>
      </Panel>
    );
  }

  function renderChecklist() {
    return (
      <Panel title="Checklist do Dia" subtitle="Itens de montagem, cerimônia, operação e desmontagem">
        <div className="org-checklist-actions">
          <button onClick={usarChecklistPadrao} disabled={salvando || !eventoAtual}>
            {checklist.length === 0 ? "Usar checklist padrão" : "Adicionar itens padrão restantes"}
          </button>
          <span>{CHECKLIST_PADRAO_DIA.length} itens padrão disponíveis</span>
        </div>

        <div className="org-form-grid checklist">
          <input placeholder="Item do checklist" value={novoChecklist.item} onChange={(e) => setNovoChecklist({ ...novoChecklist, item: e.target.value })} />
          <input placeholder="Categoria" value={novoChecklist.categoria} onChange={(e) => setNovoChecklist({ ...novoChecklist, categoria: e.target.value })} />
          <select value={novoChecklist.tipo} onChange={(e) => setNovoChecklist({ ...novoChecklist, tipo: e.target.value })}><option value="planejamento">Planejamento</option><option value="dia_evento">Dia do evento</option><option value="montagem">Montagem</option><option value="desmontagem">Desmontagem</option><option value="outro">Outro</option></select>
          <label className="org-check"><input type="checkbox" checked={novoChecklist.obrigatorio} onChange={(e) => setNovoChecklist({ ...novoChecklist, obrigatorio: e.target.checked })} /> Obrigatório</label>
          <button onClick={criarChecklist} disabled={salvando || !novoChecklist.item.trim()}>Adicionar</button>
        </div>
        <div className="org-card-list">
          {checklistFiltrado.map((item) => (
            <div key={item.id} className={`org-check-row ${item.concluido ? "done" : ""}`}>
              <button className="org-check-toggle" onClick={() => alternarChecklist(item)} aria-label={item.concluido ? "Marcar como pendente" : "Marcar como concluído"}>{item.concluido ? "✓" : ""}</button>
              <div className="org-check-content">
                <h3>{item.item}</h3>
                <p>{item.categoria} · {labelStatus(item.tipo)} {item.obrigatorio ? "· obrigatório" : ""}</p>
              </div>
              <div className="org-row-actions">
                <button type="button" onClick={() => alternarChecklist(item)}>{item.concluido ? "↩️ Reabrir" : "✅ Concluir"}</button>
                <button type="button" onClick={() => alterarChecklist(item)}>✏️ Editar</button>
                <button type="button" className="danger" onClick={() => excluirChecklist(item)}>🗑️ Excluir</button>
              </div>
            </div>
          ))}
          {checklistFiltrado.length === 0 && <Empty text="Nenhum item de checklist encontrado. Use o checklist padrão ou adicione itens manualmente." />}
        </div>
      </Panel>
    );
  }
}

function Metric({ title, value, detail, danger }: { title: string; value: string | number; detail: string; danger?: boolean }) {
  return <div className={`org-metric ${danger ? "danger" : ""}`}><span>{title}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="org-panel"><div className="org-panel-head"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>{children}</section>;
}

function SubTabs({ items, active, onChange }: { items: string[]; active: string; onChange: (value: string) => void }) {
  return <div className="org-subtabs">{items.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => onChange(item)}>{labelStatus(item)}</button>)}</div>;
}

function MiniRow({ title, detail, status }: { title: string | null; detail: string; status: string }) {
  return <div className="org-mini-row"><div><strong>{title || "Sem título"}</strong><span>{detail}</span></div><em className={`org-pill ${status}`}>{labelStatus(status)}</em></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="org-empty-inline">{text}</div>;
}

function filtrar<T>(items: T[], termo: string, campos: (item: T) => Array<string | null | undefined>) {
  if (!termo) return items;
  return items.filter((item) => campos(item).some((campo) => (campo || "").toLowerCase().includes(termo)));
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

function datetimeOuNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatarMoeda(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
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
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function hora(value: string | null | undefined) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
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
  const horaInicio = evento.hora_inicio ? String(evento.hora_inicio).slice(0, 5) : "";
  return horaInicio ? `${dia} às ${horaInicio}` : dia;
}

function normalizarStatusProducao(status: string | null | undefined) {
  if (status === "pendente") return "a_fazer";
  if (status === "atrasado") return "aguardando_terceiro";
  if (status === "ideia" || status === "a_fazer" || status === "em_andamento" || status === "aguardando_terceiro" || status === "concluido") return status;
  return "a_fazer";
}

function isAtrasada(dataLimite: string | null, status: string | null) {
  if (!dataLimite || status === "concluido" || status === "cancelado") return false;
  const limite = new Date(dataLimite);
  limite.setHours(23, 59, 59, 999);
  return limite.getTime() < Date.now();
}

function labelCategoria(value: string | null | undefined) {
  const found = CATEGORIAS_FORNECEDOR.find((item) => item.value === value);
  return found?.label || labelStatus(value || "outros");
}

function labelStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    visao: "Visão Geral",
    planejamento: "Planejamento",
    execucao: "Execução",
    pendencias: "Pendências",
    tarefas: "Produção",
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
.org-form-grid.producao { grid-template-columns: 1.4fr 1fr .8fr .75fr auto; }
.org-kanban { display: grid; grid-template-columns: repeat(5, minmax(240px, 1fr)); gap: 12px; align-items: stretch; overflow-x: auto; padding-bottom: 6px; }
.org-kanban-column { min-width: 240px; border-radius: 22px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; }
.org-kanban-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.org-kanban-head strong { display: block; font-size: 15px; letter-spacing: -.02em; }
.org-kanban-head span { display: block; margin-top: 3px; color: #64748b; font-weight: 700; font-size: 12px; line-height: 1.35; }
.org-kanban-head em { min-width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; background: #fff; color: #0f172a; font-weight: 900; font-style: normal; border: 1px solid #e2e8f0; }
.org-kanban-list { display: flex; flex-direction: column; gap: 10px; }
.org-kanban-card { align-items: stretch; flex-direction: column; }
.org-kanban-card .org-card-actions { justify-content: flex-start; }
.org-pill.ideia { background: #e0f2fe; color: #075985; }
.org-pill.a_fazer { background: #ede9fe; color: #5b21b6; }
.org-pill.aguardando_terceiro { background: #ffedd5; color: #9a3412; }

@media (max-width: 1100px) { .org-metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .org-form-grid, .org-form-grid.five, .org-form-grid.fornecedor, .org-form-grid.contratacao, .org-form-grid.roteiro, .org-form-grid.equipe, .org-form-grid.checklist, .org-form-grid.producao { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) { .org-header, .org-summary-card, .org-toolbar, .org-item-card, .org-mini-row, .org-checklist-actions { flex-direction: column; align-items: stretch; } .org-event-select, .org-toolbar input { max-width: none; width: 100%; } .org-metrics-grid, .org-grid-two, .org-money-grid { grid-template-columns: 1fr; } .org-form-grid, .org-form-grid.five, .org-form-grid.fornecedor, .org-form-grid.contratacao, .org-form-grid.roteiro, .org-form-grid.equipe, .org-form-grid.checklist, .org-form-grid.producao { grid-template-columns: 1fr; } .org-check-row { align-items: flex-start; } .org-row-actions, .org-card-actions { width: 100%; justify-content: flex-end; } .org-item-card select { max-width: none; } .org-finance-values { align-items: flex-start; } }
`;

function styleToCss(style: React.CSSProperties) {
  return Object.entries(style).map(([key, value]) => `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${value};`).join("");
}


